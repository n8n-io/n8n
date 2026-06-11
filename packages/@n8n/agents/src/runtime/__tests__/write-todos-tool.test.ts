import { describe, expect, it } from 'vitest';

import { isZodSchema } from '../../utils/zod';
import { WRITE_TODOS_TOOL_NAME, createWriteTodosTool } from '../write-todos-tool';

const sampleTodos = [
	{
		id: 'research',
		content: 'Research API authentication options',
		status: 'in_progress' as const,
		difficulty: 'high' as const,
		delegateHint: {
			subAgentId: 'inline',
			expectedOutput: 'Short comparison of auth methods',
		},
	},
	{
		id: 'synthesize',
		content: 'Synthesize findings into a recommendation',
		status: 'pending' as const,
		difficulty: 'medium' as const,
	},
];

describe('createWriteTodosTool', () => {
	it('creates the write_todos tool with planner guidance', () => {
		const tool = createWriteTodosTool();

		expect(tool.name).toBe(WRITE_TODOS_TOOL_NAME);
		expect(tool.description).toContain('structured task list');
		expect(tool.description).toContain('delegate_subagent');
		expect(tool.inputSchema).toBeDefined();
		expect(tool.outputSchema).toBeDefined();
		expect(tool.systemInstruction).toContain('low');
		expect(tool.systemInstruction).toContain('medium');
		expect(tool.systemInstruction).toContain('high');
		expect(tool.systemInstruction).toContain('delegate_subagent');
		expect(tool.systemInstruction).toContain('same difficulty');
	});

	it('returns the provided todo list with a count', async () => {
		const tool = createWriteTodosTool();

		await expect(
			tool.handler?.(
				{ todos: sampleTodos },
				{ runId: 'parent-run-1', persistence: { threadId: 'thread-1', resourceId: 'res-1' } },
			),
		).resolves.toEqual({
			status: 'ok',
			todoCount: 2,
			todos: sampleTodos,
		});
	});

	it('requires difficulty on every todo item', () => {
		const tool = createWriteTodosTool();
		expect(isZodSchema(tool.inputSchema)).toBe(true);
		if (!isZodSchema(tool.inputSchema)) {
			throw new Error('Expected Zod input schema');
		}

		expect(
			tool.inputSchema.safeParse({
				todos: [{ id: 'a', content: 'Task', status: 'pending' }],
			}).success,
		).toBe(false);
	});

	it('rejects invalid todo difficulty values', () => {
		const tool = createWriteTodosTool();
		expect(isZodSchema(tool.inputSchema)).toBe(true);
		if (!isZodSchema(tool.inputSchema)) {
			throw new Error('Expected Zod input schema');
		}

		expect(
			tool.inputSchema.safeParse({
				todos: [{ id: 'a', content: 'Task', status: 'pending', difficulty: 'extreme' }],
			}).success,
		).toBe(false);
	});

	it('rejects duplicate todo ids in a single update', () => {
		const tool = createWriteTodosTool();
		expect(tool.inputSchema).toBeDefined();
		expect(isZodSchema(tool.inputSchema)).toBe(true);
		if (!isZodSchema(tool.inputSchema)) {
			throw new Error('Expected Zod input schema');
		}

		const result = tool.inputSchema.safeParse({
			todos: [
				{ id: 'dup', content: 'First', status: 'pending', difficulty: 'low' },
				{ id: 'dup', content: 'Second', status: 'pending', difficulty: 'medium' },
			],
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(
			result.error.issues.some((issue) => issue.message.includes('Duplicate todo id "dup"')),
		).toBe(true);
	});
});
