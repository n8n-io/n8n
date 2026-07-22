import { z } from 'zod';

import { withSdkOwnedBuiltInMetadata } from './sdk-owned-tool';
import {
	buildTodosInputSchema,
	buildTodosOutputSchema,
	todosEchoHandler,
	todoStatusSchema,
} from './todos-core';
import { WRITE_TODOS_TOOL_NAME } from './write-todos-tool';
import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';

const plannerTodoItemSchema = z
	.object({
		id: z.string().min(1).describe('Stable identifier for this task within the current plan.'),
		content: z
			.string()
			.min(1)
			.describe(
				'Concrete, self-contained task description. For blocked tasks, state exactly what user input is missing.',
			),
		status: todoStatusSchema,
	})
	.strict();

const PLANNER_TODOS_DESCRIPTION =
	'Create or update a structured task list for the current task. Use it to decompose the work, ' +
	'track progress, and record which tasks are blocked on user input. Use it for every multi-step ' +
	'request. This tool only updates the task list; it does not perform work or ask the user.';

const PLANNER_TODOS_SYSTEM_INSTRUCTION = [
	'write_todos maintains your plan for the current task. It never asks the user or performs work itself.',
	'WHEN TO USE write_todos:',
	'- Every multi-step request, before other tool calls.',
	'- You need to track progress or record tasks blocked on user input.',
	'WHEN NOT TO USE write_todos:',
	'- Purely conversational replies with no task work.',
	'HOW TO USE write_todos:',
	'- Write concrete, self-contained tasks; mark the first active task in_progress immediately.',
	'- Mark a task blocked when it cannot proceed without user input, and state exactly what input is missing in the task content.',
	'- Marking a task blocked IS the action for now. Do not ask the user about it while any non-blocked task remains; continue with unblocked tasks.',
	'- When only blocked tasks remain, end your turn with a summary of what is missing; unblock and finish them in later turns as the user provides input.',
	'- Update task status as soon as work completes; do not batch completions at the end.',
	'- Do not call write_todos multiple times in parallel; send one full list update at a time.',
].join('\n');

export interface CreatePlannerTodosToolOptions {
	/** Override the model-visible tool description. */
	description?: string;
	/** Override the model-visible system instruction. */
	systemInstruction?: string;
}

/** Planner-only variant of `write_todos` — no delegation fields or guidance. */
export function createPlannerTodosTool(options: CreatePlannerTodosToolOptions = {}): BuiltTool {
	const tool = new Tool(WRITE_TODOS_TOOL_NAME)
		.description(options.description ?? PLANNER_TODOS_DESCRIPTION)
		.systemInstruction(options.systemInstruction ?? PLANNER_TODOS_SYSTEM_INSTRUCTION)
		.input(buildTodosInputSchema(plannerTodoItemSchema))
		.output(buildTodosOutputSchema(plannerTodoItemSchema))
		.handler(todosEchoHandler)
		.build();

	return withSdkOwnedBuiltInMetadata(tool);
}
