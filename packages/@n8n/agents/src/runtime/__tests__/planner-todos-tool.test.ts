import { describe, expect, it } from 'vitest';

import { Agent } from '../../sdk/agent';
import { isZodSchema } from '../../utils/zod';
import { createPlannerTodosTool } from '../tools/planner-todos-tool';
import { isSdkOwnedBuiltInTool } from '../tools/sdk-owned-tool';

const samplePlannerTodos = [
	{ id: 'a', content: 'Resolve model', status: 'blocked' as const },
	{ id: 'b', content: 'Write instructions', status: 'in_progress' as const },
];

describe('createPlannerTodosTool', () => {
	it('accepts bare items including blocked status and echoes them with a count', async () => {
		const tool = createPlannerTodosTool();

		await expect(
			tool.handler?.(
				{ todos: samplePlannerTodos },
				{ runId: 'r1', persistence: { threadId: 't1', resourceId: 'u1' } },
			),
		).resolves.toEqual({
			status: 'ok',
			todoCount: 2,
			todos: samplePlannerTodos,
		});
	});

	it('rejects items carrying delegation fields', () => {
		const tool = createPlannerTodosTool();
		expect(isZodSchema(tool.inputSchema)).toBe(true);
		if (!isZodSchema(tool.inputSchema)) {
			throw new Error('Expected Zod input schema');
		}

		expect(
			tool.inputSchema.safeParse({
				todos: [{ id: 'a', content: 'x', status: 'pending', difficulty: 'low' }],
			}).success,
		).toBe(false);
	});

	it('registers on an agent as an official SDK built-in', () => {
		expect(() =>
			new Agent('parent')
				.model('openai', 'gpt-4o-mini')
				.instructions('t')
				.tool(createPlannerTodosTool()),
		).not.toThrow();
		expect(isSdkOwnedBuiltInTool(createPlannerTodosTool())).toBe(true);
	});
});
