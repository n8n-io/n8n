import type { BaseTextKey, useI18n } from '@n8n/i18n';
import { SUB_AGENT_TASK_DIFFICULTIES } from '@n8n/api-types';
import { z } from 'zod';

import { SUB_AGENT_DIFFICULTY_I18N_KEY, resolveSubAgentIdForDisplay } from './delegate-tool';

/**
 * Name of the SDK tool the parent agent calls to maintain a structured task list.
 * Mirrors `WRITE_TODOS_TOOL_NAME` in `@n8n/agents` (not FE-importable).
 */
export const WRITE_TODOS_TOOL_NAME = 'write_todos';

const todoStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']);

const todoDifficultySchema = z.enum(SUB_AGENT_TASK_DIFFICULTIES);

const todoItemSchema = z.object({
	id: z.string().min(1),
	content: z.string().min(1),
	status: todoStatusSchema,
	difficulty: todoDifficultySchema.optional(),
	delegateHint: z
		.object({
			subAgentId: z.string().optional(),
			expectedOutput: z.string().optional(),
		})
		.optional(),
});

const writeTodosOutputSchema = z.object({
	status: z.literal('ok'),
	todoCount: z.number(),
	todos: z.array(todoItemSchema),
});

const writeTodosFailedOutputSchema = z.object({
	status: z.literal('failed'),
	error: z.string(),
});

export type WriteTodosOutput = z.infer<typeof writeTodosOutputSchema>;
export type WriteTodosFailedOutput = z.infer<typeof writeTodosFailedOutputSchema>;
export type TodoItem = z.infer<typeof todoItemSchema>;
export type TodoStatus = z.infer<typeof todoStatusSchema>;
export type TodoDifficulty = z.infer<typeof todoDifficultySchema>;

export type WriteTodosI18n = Pick<ReturnType<typeof useI18n>, 'baseText'>;

const STATUS_I18N_KEY: Record<TodoStatus, BaseTextKey> = {
	in_progress: 'agents.chat.writeTodos.status.inProgress',
	pending: 'agents.chat.writeTodos.status.pending',
	completed: 'agents.chat.writeTodos.status.completed',
	blocked: 'agents.chat.writeTodos.status.blocked',
	cancelled: 'agents.chat.writeTodos.status.cancelled',
};

const STATUS_ORDER: TodoStatus[] = ['in_progress', 'pending', 'completed', 'blocked', 'cancelled'];

export function isWriteTodosTool(toolName: string | undefined): boolean {
	return toolName === WRITE_TODOS_TOOL_NAME;
}

export function parseWriteTodosOutput(output: unknown): WriteTodosOutput | undefined {
	const result = writeTodosOutputSchema.safeParse(output);
	return result.success ? result.data : undefined;
}

export function parseWriteTodosFailedOutput(output: unknown): WriteTodosFailedOutput | undefined {
	const result = writeTodosFailedOutputSchema.safeParse(output);
	return result.success ? result.data : undefined;
}

function formatWriteTodosErrorText(output: unknown): string | undefined {
	const failed = parseWriteTodosFailedOutput(output);
	if (failed) {
		const error = failed.error.trim();
		return error.length > 0 ? error : undefined;
	}

	if (typeof output === 'string') {
		const trimmed = output.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}

	return undefined;
}

export function writeTodosLabel(i18n: WriteTodosI18n): string {
	return i18n.baseText('agents.chat.writeTodos.label');
}

export function countIncompleteTodos(todos: TodoItem[]): number {
	return todos.filter((todo) => todo.status !== 'completed').length;
}

export function writeTodosSummaryLabel(i18n: WriteTodosI18n, incompleteTodoCount: number): string {
	if (incompleteTodoCount === 0) {
		return i18n.baseText('agents.chat.writeTodos.summary.done');
	}

	const key =
		incompleteTodoCount === 1
			? 'agents.chat.writeTodos.summary.one'
			: 'agents.chat.writeTodos.summary.other';
	return i18n.baseText(key, {
		interpolate: { count: String(incompleteTodoCount) },
	});
}

function writeTodosStatusLabel(i18n: WriteTodosI18n, status: TodoStatus): string {
	return i18n.baseText(STATUS_I18N_KEY[status]);
}

function writeTodosDifficultyLabel(i18n: WriteTodosI18n, difficulty: TodoDifficulty): string {
	return i18n.baseText(SUB_AGENT_DIFFICULTY_I18N_KEY[difficulty]);
}

function formatTodoItem(
	todo: TodoItem,
	i18n: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): string {
	const hints: string[] = [];
	if (todo.difficulty) {
		hints.push(
			`${i18n.baseText('agents.chat.writeTodos.hint.difficulty')}: ${writeTodosDifficultyLabel(i18n, todo.difficulty)}`,
		);
	}
	if (todo.delegateHint?.subAgentId) {
		const displayName = resolveSubAgentIdForDisplay(
			todo.delegateHint.subAgentId,
			subAgentNameById ?? new Map(),
		);
		hints.push(`${i18n.baseText('agents.chat.writeTodos.hint.subAgent')}: ${displayName}`);
	}
	if (todo.delegateHint?.expectedOutput) {
		hints.push(
			`${i18n.baseText('agents.chat.writeTodos.hint.expectedOutput')}: ${todo.delegateHint.expectedOutput}`,
		);
	}

	const suffix = hints.length > 0 ? ` _(${hints.join('; ')})_` : '';
	return `- ${todo.content}${suffix}`;
}

/** Format parsed write_todos output as Markdown for the expandable details panel. */
export function formatWriteTodosMarkdown(
	output: unknown,
	i18n?: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): string | undefined {
	const errorText = formatWriteTodosErrorText(output);
	if (errorText) return errorText;

	const parsed = parseWriteTodosOutput(output);
	if (!parsed || !i18n || parsed.todos.length === 0) return undefined;

	const sections: string[] = [];
	for (const status of STATUS_ORDER) {
		const items = parsed.todos.filter((todo) => todo.status === status);
		if (items.length === 0) continue;
		sections.push(`**${writeTodosStatusLabel(i18n, status)}**`);
		sections.push(items.map((todo) => formatTodoItem(todo, i18n, subAgentNameById)).join('\n'));
	}

	return sections.join('\n\n');
}
