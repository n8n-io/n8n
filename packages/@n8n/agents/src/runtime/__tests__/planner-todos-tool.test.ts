import { describe, expect, it } from 'vitest';

import { Agent } from '../../sdk/agent';
import { isZodSchema } from '../../utils/zod';
import { createPlannerTodosTool } from '../tools/planner-todos-tool';
import { isSdkOwnedBuiltInTool } from '../tools/sdk-owned-tool';
import { WRITE_TODOS_TOOL_NAME } from '../tools/write-todos-tool';

const samplePlannerTodos = [
	{ id: 'a', content: 'Resolve model', status: 'blocked' as const },
	{ id: 'b', content: 'Write instructions', status: 'in_progress' as const },
];

describe('createPlannerTodosTool', () => {
	it('creates a write_todos planner tool without delegation guidance', () => {
		const tool = createPlannerTodosTool();

		expect(tool.name).toBe(WRITE_TODOS_TOOL_NAME);
		expect(isSdkOwnedBuiltInTool(tool)).toBe(true);
		expect(tool.description).not.toContain('delegate_subagent');
		expect(tool.description).not.toContain('difficulty');
		expect(tool.systemInstruction).not.toContain('delegate_subagent');
		expect(tool.systemInstruction).not.toContain('difficulty');
		expect(tool.systemInstruction).toContain('blocked');
	});

	it('mandates use for every build or change request, not just complex ones', () => {
		const tool = createPlannerTodosTool();

		expect(tool.systemInstruction).toContain('Every request that builds or changes the agent');
		expect(tool.systemInstruction).not.toContain('3+');
		expect(tool.systemInstruction).not.toContain('trailing batch');
		expect(tool.description).not.toContain('trailing batch');
	});

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

	it('rejects duplicate todo ids', () => {
		const tool = createPlannerTodosTool();
		expect(isZodSchema(tool.inputSchema)).toBe(true);
		if (!isZodSchema(tool.inputSchema)) {
			throw new Error('Expected Zod input schema');
		}

		const result = tool.inputSchema.safeParse({
			todos: [
				{ id: 'dup', content: 'First', status: 'pending' },
				{ id: 'dup', content: 'Second', status: 'in_progress' },
			],
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(
			result.error.issues.some((issue) => issue.message.includes('Duplicate todo id "dup"')),
		).toBe(true);
	});

	it('registers on an agent as an official SDK built-in', () => {
		expect(() =>
			new Agent('parent')
				.model('openai', 'gpt-4o-mini')
				.instructions('t')
				.tool(createPlannerTodosTool()),
		).not.toThrow();
	});
});
