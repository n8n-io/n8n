import { z } from 'zod';

import { Tool } from '../sdk/tool';
import type { BuiltTool } from '../types/sdk/tool';

export const WRITE_TODOS_TOOL_NAME = 'write_todos';

const todoStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']);

const todoDelegateHintSchema = z
	.object({
		subAgentId: z
			.string()
			.optional()
			.describe(
				'Optional sub-agent id when this task is a delegate_subagent candidate. Use "inline" for one-off inline sub-agents.',
			),
		expectedOutput: z
			.string()
			.optional()
			.describe('Optional expected output shape when delegating this task.'),
	})
	.optional();

export const todoItemSchema = z.object({
	id: z.string().min(1).describe('Stable identifier for this task within the current plan.'),
	content: z.string().min(1).describe('Concrete, self-contained task description.'),
	status: todoStatusSchema,
	delegateHint: todoDelegateHintSchema,
});

const writeTodosInputSchema = z
	.object({
		todos: z
			.array(todoItemSchema)
			.describe('Full task list for the current run. Replaces any previous list.'),
	})
	.superRefine((value, ctx) => {
		const seen = new Set<string>();
		for (const [index, todo] of value.todos.entries()) {
			if (seen.has(todo.id)) {
				ctx.addIssue({
					code: 'custom',
					message: `Duplicate todo id "${todo.id}". Each task must have a unique id.`,
					path: ['todos', index, 'id'],
				});
			}
			seen.add(todo.id);
		}
	});

const writeTodosOutputSchema = z.object({
	status: z.literal('ok'),
	todoCount: z.number(),
	todos: z.array(todoItemSchema),
});

export type TodoItem = z.infer<typeof todoItemSchema>;
export type TodoStatus = z.infer<typeof todoStatusSchema>;
export type WriteTodosInput = z.infer<typeof writeTodosInputSchema>;
export type WriteTodosOutput = z.infer<typeof writeTodosOutputSchema>;

const WRITE_TODOS_DESCRIPTION =
	'Create or update a structured task list for complex agent work. Use it to decompose a larger request into concrete workstreams, track progress, and identify which tasks should be handled separately with delegate_subagent. Do not use it for trivial work, single-step tasks, or purely conversational answers. This tool only updates the task list; it does not run sub-agents or answer the user.';

const WRITE_TODOS_SYSTEM_INSTRUCTION = [
	'write_todos helps you plan and track complex objectives before and during execution. It updates the current task list only; it does not complete tasks, run sub-agents, or answer the user.',
	'WHEN TO USE write_todos:',
	'- The user request has 3+ meaningful steps or multiple deliverables.',
	'- The request decomposes into 2+ independent workstreams.',
	'- Some workstreams are good candidates for delegate_subagent.',
	'- You need to track progress, revise the plan, or avoid losing context.',
	'WHEN NOT TO USE write_todos:',
	'- The request is trivial, conversational, or informational.',
	'- The task can be completed directly in one or two simple steps.',
	"- You would only create a todo list to restate the user's request.",
	'HOW TO USE write_todos:',
	'- Write concrete, self-contained tasks, not vague phases.',
	'- Mark the first active task, or independent active tasks, as in_progress immediately.',
	'- For sub-agent-worthy work, create one todo per bounded workstream, then call delegate_subagent separately for that task.',
	'- Do not delegate the entire user request as one task.',
	'- Update task status as soon as work completes; do not batch completions at the end.',
	'- Revise the list when new information changes the plan.',
	'- Do not call write_todos multiple times in parallel; send one full list update at a time.',
	'- After all work is done, send the final answer as normal assistant text after the last write_todos call.',
].join('\n');

function assertUniqueTodoIds(todos: TodoItem[]): void {
	const seen = new Set<string>();
	for (const todo of todos) {
		if (seen.has(todo.id)) {
			throw new Error(`Duplicate todo id "${todo.id}". Each task must have a unique id.`);
		}
		seen.add(todo.id);
	}
}

/**
 * Build the planner-only `write_todos` tool — lets a parent agent maintain a
 * structured task list for complex work without auto-dispatching sub-agents.
 */
export function createWriteTodosTool(): BuiltTool {
	return new Tool(WRITE_TODOS_TOOL_NAME)
		.description(WRITE_TODOS_DESCRIPTION)
		.systemInstruction(WRITE_TODOS_SYSTEM_INSTRUCTION)
		.input(writeTodosInputSchema)
		.output(writeTodosOutputSchema)
		.handler(async (input) => {
			assertUniqueTodoIds(input.todos);
			const todos = [...input.todos];

			return {
				status: 'ok' as const,
				todoCount: todos.length,
				todos,
			};
		})
		.build();
}
