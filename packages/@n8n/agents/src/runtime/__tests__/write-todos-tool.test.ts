import { describe, expect, it } from 'vitest';

import { WRITE_TODOS_TOOL_NAME, createWriteTodosTool } from '../write-todos-tool';

const sampleTodos = [
	{
		id: 'research',
		content: 'Research API authentication options',
		status: 'in_progress' as const,
		delegateHint: {
			subAgentId: 'inline',
			expectedOutput: 'Short comparison of auth methods',
		},
	},
	{
		id: 'synthesize',
		content: 'Synthesize findings into a recommendation',
		status: 'pending' as const,
	},
];

describe('createWriteTodosTool', () => {
	it('creates the write_todos tool with planner guidance', () => {
		const tool = createWriteTodosTool();

		expect(tool.name).toBe(WRITE_TODOS_TOOL_NAME);
		expect(tool.description).toContain('structured task list');
		expect(tool.description).toContain('delegate_subagent');
		expect(tool.description).toContain('does not run sub-agents');
		expect(tool.systemInstruction).toContain('WHEN TO USE write_todos');
		expect(tool.systemInstruction).toContain('WHEN NOT TO USE write_todos');
		expect(tool.systemInstruction).toContain('HOW TO USE write_todos');
		expect(tool.systemInstruction).toContain('call delegate_subagent separately');
		expect(tool.systemInstruction).toContain('Do not call write_todos multiple times in parallel');
		expect(tool.inputSchema).toBeDefined();
		expect(tool.outputSchema).toBeDefined();
	});

	it('replaces the full todo list for a run scope on each call', async () => {
		const tool = createWriteTodosTool();

		const firstResult = await tool.handler?.(
			{ todos: sampleTodos },
			{ runId: 'parent-run-1', persistence: { threadId: 'thread-1', resourceId: 'res-1' } },
		);

		expect(firstResult).toEqual({
			status: 'ok',
			todoCount: 2,
			todos: sampleTodos,
		});

		const updatedTodos = [
			{
				id: 'research',
				content: 'Research API authentication options',
				status: 'completed' as const,
			},
			{
				id: 'synthesize',
				content: 'Synthesize findings into a recommendation',
				status: 'in_progress' as const,
			},
		];

		const secondResult = await tool.handler?.(
			{ todos: updatedTodos },
			{ runId: 'parent-run-1', persistence: { threadId: 'thread-1', resourceId: 'res-1' } },
		);

		expect(secondResult).toEqual({
			status: 'ok',
			todoCount: 2,
			todos: updatedTodos,
		});
	});

	it('rejects duplicate todo ids in a single update', async () => {
		const tool = createWriteTodosTool();

		await expect(
			tool.handler?.(
				{
					todos: [
						{ id: 'dup', content: 'First', status: 'pending' },
						{ id: 'dup', content: 'Second', status: 'pending' },
					],
				},
				{ runId: 'parent-run-1' },
			),
		).rejects.toThrow(/Duplicate todo id "dup"/);
	});
});
