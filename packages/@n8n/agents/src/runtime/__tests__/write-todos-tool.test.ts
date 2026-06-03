import { afterEach, describe, expect, it } from 'vitest';

import {
	WRITE_TODOS_TOOL_NAME,
	clearWriteTodosStore,
	createWriteTodosTool,
	getWriteTodosForScope,
} from '../write-todos-tool';

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
	afterEach(() => {
		clearWriteTodosStore();
	});

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

		await tool.handler?.(
			{ todos: sampleTodos },
			{ runId: 'parent-run-1', persistence: { threadId: 'thread-1', resourceId: 'res-1' } },
		);

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

		const result = await tool.handler?.(
			{ todos: updatedTodos },
			{ runId: 'parent-run-1', persistence: { threadId: 'thread-1', resourceId: 'res-1' } },
		);

		expect(result).toEqual({
			status: 'ok',
			todoCount: 2,
			todos: updatedTodos,
		});
		expect(getWriteTodosForScope('thread-1')).toEqual(updatedTodos);
	});

	it('scopes todo lists by thread id when persistence is available', async () => {
		const tool = createWriteTodosTool();

		await tool.handler?.(
			{ todos: sampleTodos },
			{ runId: 'run-a', persistence: { threadId: 'thread-a', resourceId: 'res-a' } },
		);
		await tool.handler?.(
			{
				todos: [{ id: 'only', content: 'Single task', status: 'pending' as const }],
			},
			{ runId: 'run-b', persistence: { threadId: 'thread-b', resourceId: 'res-b' } },
		);

		expect(getWriteTodosForScope('thread-a')).toEqual(sampleTodos);
		expect(getWriteTodosForScope('thread-b')).toEqual([
			{ id: 'only', content: 'Single task', status: 'pending' },
		]);
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
