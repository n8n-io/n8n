/**
 * Consolidated task-control tool — update-checklist + cancel-task + correct-task.
 */
import { createTool } from '@mastra/core/tools';
import { taskListSchema } from '@n8n/api-types';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { OrchestrationContext } from '../types';

// ── Action schemas ──────────────────────────────────────────────────────────

const updateChecklistAction = z.object({
	action: z
		.literal('update-checklist')
		.describe('Write or update a visible task checklist for multi-step work'),
	tasks: taskListSchema.shape.tasks,
});

const cancelTaskAction = z.object({
	action: z.literal('cancel-task').describe('Cancel a running background task by its task ID'),
	taskId: z.string().describe('Task ID (e.g. build-XXXXXXXX)'),
});

const correctTaskAction = z.object({
	action: z.literal('correct-task').describe('Send a correction to a running background task'),
	taskId: z.string().describe('Task ID (e.g. build-XXXXXXXX)'),
	correction: z
		.string()
		.describe("The correction message from the user (e.g. 'use the Projects database')"),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [updateChecklistAction, cancelTaskAction, correctTaskAction]),
);

type Input = z.infer<typeof inputSchema>;

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleUpdateChecklist(
	context: OrchestrationContext,
	input: Extract<Input, { action: 'update-checklist' }>,
) {
	const taskList = { tasks: input.tasks };
	await context.taskStorage.save(context.threadId, taskList);
	context.eventBus.publish(context.threadId, {
		type: 'tasks-update',
		runId: context.runId,
		agentId: context.orchestratorAgentId,
		payload: { tasks: taskList },
	});
	return { saved: true };
}

async function handleCancelTask(
	context: OrchestrationContext,
	input: Extract<Input, { action: 'cancel-task' }>,
) {
	if (!context.cancelBackgroundTask) {
		return { result: 'Error: background task cancellation not available.' };
	}
	await context.cancelBackgroundTask(input.taskId);
	return { result: `Background task ${input.taskId} cancelled.` };
}

async function handleCorrectTask(
	context: OrchestrationContext,
	input: Extract<Input, { action: 'correct-task' }>,
) {
	if (!context.sendCorrectionToTask) {
		return await Promise.resolve({ result: 'Error: correction delivery not available.' });
	}
	const status = context.sendCorrectionToTask(input.taskId, input.correction);
	if (status === 'task-not-found') {
		return await Promise.resolve({
			result: `Task ${input.taskId} not found. It may have already been cleaned up.`,
		});
	}
	if (status === 'task-completed') {
		return await Promise.resolve({
			result:
				`Task ${input.taskId} has already completed. The correction was not delivered. ` +
				`Incorporate "${input.correction}" into a new follow-up task instead.`,
		});
	}
	return await Promise.resolve({
		result: `Correction sent to task ${input.taskId}: "${input.correction}". The builder will see this on its next step.`,
	});
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createTaskControlTool(context: OrchestrationContext) {
	return createTool({
		id: 'task-control',
		description: 'Manage tasks and background work.',
		inputSchema,
		execute: async (input: Input) => {
			switch (input.action) {
				case 'update-checklist':
					return await handleUpdateChecklist(context, input);
				case 'cancel-task':
					return await handleCancelTask(context, input);
				case 'correct-task':
					return await handleCorrectTask(context, input);
			}
		},
	});
}
