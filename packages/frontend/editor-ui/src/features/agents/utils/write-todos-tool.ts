import type { useI18n } from '@n8n/i18n';
import { z } from 'zod';

/**
 * Name of the SDK tool the parent agent calls to maintain a structured task list.
 * Mirrors `WRITE_TODOS_TOOL_NAME` in `@n8n/agents` (not FE-importable).
 */
export const WRITE_TODOS_TOOL_NAME = 'write_todos';

const todoStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']);

const todoItemSchema = z.object({
	id: z.string().min(1),
	content: z.string().min(1),
	status: todoStatusSchema,
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

export type WriteTodosOutput = z.infer<typeof writeTodosOutputSchema>;
export type TodoItem = z.infer<typeof todoItemSchema>;
export type TodoStatus = z.infer<typeof todoStatusSchema>;

const STATUS_SECTION_LABEL: Record<TodoStatus, string> = {
	in_progress: 'In progress',
	pending: 'Pending',
	completed: 'Completed',
	blocked: 'Blocked',
	cancelled: 'Cancelled',
};

const STATUS_ORDER: TodoStatus[] = ['in_progress', 'pending', 'completed', 'blocked', 'cancelled'];

export function isWriteTodosTool(toolName: string | undefined): boolean {
	return toolName === WRITE_TODOS_TOOL_NAME;
}

export function parseWriteTodosOutput(output: unknown): WriteTodosOutput | undefined {
	const result = writeTodosOutputSchema.safeParse(output);
	return result.success ? result.data : undefined;
}

export function formatWriteTodosSummaryCount(todoCount: number): string {
	return `${todoCount} ${todoCount === 1 ? 'task' : 'tasks'}`;
}

export function summariseWriteTodosOutput(output: unknown): string | undefined {
	const parsed = parseWriteTodosOutput(output);
	if (!parsed) return undefined;
	return formatWriteTodosSummaryCount(parsed.todoCount);
}

export function writeTodosLabel(i18n: Pick<ReturnType<typeof useI18n>, 'baseText'>): string {
	return i18n.baseText('agents.chat.writeTodos.label');
}

export function writeTodosSummaryLabel(
	i18n: Pick<ReturnType<typeof useI18n>, 'baseText'>,
	todoCount: number,
): string {
	return i18n.baseText('agents.chat.writeTodos.summary', {
		interpolate: { count: String(todoCount) },
	});
}

function formatTodoItem(todo: TodoItem): string {
	const hints: string[] = [];
	if (todo.delegateHint?.subAgentId) {
		hints.push(`Sub-agent: ${todo.delegateHint.subAgentId}`);
	}
	if (todo.delegateHint?.expectedOutput) {
		hints.push(`Expected output: ${todo.delegateHint.expectedOutput}`);
	}

	const suffix = hints.length > 0 ? ` _(${hints.join('; ')})_` : '';
	return `- ${todo.content}${suffix}`;
}

/** Format parsed write_todos output as Markdown for the expandable details panel. */
export function formatWriteTodosMarkdown(output: unknown): string | undefined {
	const parsed = parseWriteTodosOutput(output);
	if (!parsed || parsed.todos.length === 0) return undefined;

	const sections: string[] = [];
	for (const status of STATUS_ORDER) {
		const items = parsed.todos.filter((todo) => todo.status === status);
		if (items.length === 0) continue;
		sections.push(`**${STATUS_SECTION_LABEL[status]}**`);
		sections.push(items.map(formatTodoItem).join('\n'));
	}

	return sections.join('\n\n');
}
