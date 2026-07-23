import { z } from 'zod';

import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	SUB_AGENT_TASK_DIFFICULTIES,
} from './delegate-sub-agent-tool';
import { withSdkOwnedBuiltInMetadata } from './sdk-owned-tool';
import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';

export const WRITE_TODOS_TOOL_NAME = 'write_todos';

const todoStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']);

const todoDifficultySchema = z.enum(SUB_AGENT_TASK_DIFFICULTIES);

function buildTodoItemSchema(delegateToolName: string) {
	const todoDelegateHintSchema = z
		.object({
			subAgentId: z
				.string()
				.optional()
				.describe(
					`Optional sub-agent id when this task is a ${delegateToolName} candidate. Use "inline" for one-off inline sub-agents.`,
				),
			expectedOutput: z
				.string()
				.optional()
				.describe('Optional expected output shape when delegating this task.'),
		})
		.optional();

	return z.object({
		id: z.string().min(1).describe('Stable identifier for this task within the current plan.'),
		content: z.string().min(1).describe('Concrete, self-contained task description.'),
		status: todoStatusSchema,
		difficulty: todoDifficultySchema.describe(
			`Task difficulty: "low", "medium", or "high". Use the same value when delegating this task with ${delegateToolName}.`,
		),
		delegateHint: todoDelegateHintSchema,
	});
}

type TodoItemSchema = ReturnType<typeof buildTodoItemSchema>;

function buildWriteTodosInputSchema(todoItemSchema: TodoItemSchema) {
	return z
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
}

function buildWriteTodosOutputSchema(todoItemSchema: TodoItemSchema) {
	return z.object({
		status: z.literal('ok'),
		todoCount: z.number(),
		todos: z.array(todoItemSchema),
	});
}

function buildWriteTodosDescription(delegateToolName: string): string {
	return `Create or update a structured task list for complex agent work. Use it to decompose a larger request into concrete workstreams, track progress, and identify which tasks should be handled separately with ${delegateToolName}. Do not use it for trivial work, single-step tasks, or purely conversational answers. This tool only updates the task list; it does not run sub-agents or answer the user.`;
}

function buildWriteTodosSystemInstruction(delegateToolName: string): string {
	return [
		'write_todos helps you plan and track complex objectives before and during execution. It updates the current task list only; it does not complete tasks, run sub-agents, or answer the user.',
		'WHEN TO USE write_todos:',
		'- The user request has 3+ meaningful steps or multiple deliverables.',
		'- The request decomposes into 2+ independent workstreams.',
		`- Some workstreams are good candidates for ${delegateToolName}.`,
		'- You need to track progress, revise the plan, or avoid losing context.',
		'WHEN NOT TO USE write_todos:',
		'- The request is trivial, conversational, or informational.',
		'- The task can be completed directly in one or two simple steps.',
		"- You would only create a todo list to restate the user's request.",
		'HOW TO USE write_todos:',
		'- Write concrete, self-contained tasks, not vague phases.',
		'- Assign difficulty to every task: low for simple mechanical or localized work, medium for normal implementation or review requiring judgment, high for complex, broad, ambiguous, or high-risk work.',
		'- Mark the first active task, or independent active tasks, as in_progress immediately.',
		`- For sub-agent-worthy work, create one todo per bounded workstream, then call ${delegateToolName} separately for that task; pass the same difficulty on the delegate call.`,
		'- Do not delegate the entire user request as one task.',
		'- Update task status as soon as work completes; do not batch completions at the end.',
		'- Revise the list when new information changes the plan.',
		'- Do not call write_todos multiple times in parallel; send one full list update at a time.',
		'- After all work is done, send the final answer as normal assistant text after the last write_todos call.',
	].join('\n');
}

export interface CreateWriteTodosToolOptions {
	/**
	 * Name of the delegate sub-agent tool referenced in the planner guidance.
	 * Defaults to {@link DELEGATE_SUB_AGENT_TOOL_NAME}; pass the custom name when
	 * the host renamed the delegate tool so the guidance points at a real tool.
	 */
	delegateToolName?: string;
}

/**
 * Build the planner-only `write_todos` tool — lets a parent agent maintain a
 * structured task list for complex work without auto-dispatching sub-agents.
 */
export function createWriteTodosTool(options: CreateWriteTodosToolOptions = {}): BuiltTool {
	const delegateToolName = options.delegateToolName ?? DELEGATE_SUB_AGENT_TOOL_NAME;
	const todoItemSchema = buildTodoItemSchema(delegateToolName);

	const tool = new Tool(WRITE_TODOS_TOOL_NAME)
		.description(buildWriteTodosDescription(delegateToolName))
		.systemInstruction(buildWriteTodosSystemInstruction(delegateToolName))
		.input(buildWriteTodosInputSchema(todoItemSchema))
		.output(buildWriteTodosOutputSchema(todoItemSchema))
		.handler(async (input) => {
			const todos = [...input.todos];

			return await Promise.resolve({
				status: 'ok' as const,
				todoCount: todos.length,
				todos,
			});
		})
		.build();

	return withSdkOwnedBuiltInMetadata(tool);
}
