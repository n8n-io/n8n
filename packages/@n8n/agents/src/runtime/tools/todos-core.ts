import { z } from 'zod';

export const todoStatusSchema = z.enum([
	'pending',
	'in_progress',
	'completed',
	'blocked',
	'cancelled',
]);

/** Wraps a todo item schema in the shared `{ todos: [...] }` input shape with duplicate-id validation. */
export function buildTodosInputSchema<T extends z.ZodType<{ id: string }>>(todoItemSchema: T) {
	return z
		.object({
			todos: z
				.array(todoItemSchema)
				.describe('Full task list for the current run. Replaces any previous list.'),
		})
		.superRefine((value, ctx) => {
			const seen = new Set<string>();
			for (const [index, todo] of value.todos.entries()) {
				const id = todo.id;
				if (seen.has(id)) {
					ctx.addIssue({
						code: 'custom',
						message: `Duplicate todo id "${id}". Each task must have a unique id.`,
						path: ['todos', index, 'id'],
					});
				}
				seen.add(id);
			}
		});
}

export function buildTodosOutputSchema<T extends z.ZodTypeAny>(todoItemSchema: T) {
	return z.object({
		status: z.literal('ok'),
		todoCount: z.number(),
		todos: z.array(todoItemSchema),
	});
}

/** Echo handler shared by all todo tools — state lives in the transcript, not the tool. */
export async function todosEchoHandler<T>(input: { todos: T[] }) {
	const todos = [...input.todos];
	return await Promise.resolve({
		status: 'ok' as const,
		todoCount: todos.length,
		todos,
	});
}
