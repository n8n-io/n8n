/**
 * Consolidated task-control tool — update-checklist + cancel-task + correct-task.
 */
import { Tool } from '@n8n/agents';
import { taskItemSchema } from '@n8n/api-types';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { OrchestrationContext } from '../types';

// ── Action schemas ──────────────────────────────────────────────────────────

/**
 * Stricter than the transport `taskItemSchema`: the description is the only
 * label the checklist row shows, so a blank one renders an empty row. Rejecting
 * it here returns a correctable error to the model, while the transport schema
 * stays lenient for checklists persisted before this guard.
 */
const checklistItemSchema = taskItemSchema.extend({
	description: z
		.string()
		.trim()
		.min(1, 'Task description must not be empty — it is the label the user sees')
		.describe('What this task accomplishes'),
});

const updateChecklistAction = z.object({
	action: z
		.literal('update-checklist')
		.describe(
			'Write or update a lightweight visible checklist for multi-step work that does not need scheduler-driven execution. For coordinated background tasks, use create-tasks instead.',
		),
	tasks: z.array(checklistItemSchema).describe('Ordered list of tasks'),
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
	return new Tool('task-control')
		.description(
			'Manage tasks and background work. Use action="update-checklist" only for lightweight visible checklists that do not need scheduler-driven execution; for coordinated background tasks use create-tasks instead.',
		)
		.input(inputSchema)
		.handler(async (input: Input) => {
			switch (input.action) {
				case 'update-checklist':
					return await handleUpdateChecklist(context, input);
				case 'cancel-task':
					return await handleCancelTask(context, input);
				case 'correct-task':
					return await handleCorrectTask(context, input);
			}
		})
		.build();
}
