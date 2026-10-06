/**
 * Task-control tool — writes the lightweight visible checklist.
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

const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [updateChecklistAction]));

type Input = z.infer<typeof inputSchema>;

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleUpdateChecklist(
	context: OrchestrationContext,
	input: Extract<Input, { action: 'update-checklist' }>,
) {
	const taskList = { tasks: input.tasks };
	await context.taskStorage.save(context.threadId, taskList);
	return { saved: true };
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createTaskControlTool(context: OrchestrationContext) {
	return new Tool('task-control')
		.description(
			'Manage the visible task checklist. Use action="update-checklist" only for lightweight visible checklists that do not need scheduler-driven execution; for coordinated background tasks use create-tasks instead.',
		)
		.input(inputSchema)
		.handler(async (input: Input) => {
			switch (input.action) {
				case 'update-checklist':
					return await handleUpdateChecklist(context, input);
			}
		})
		.build();
}
