import { describe, expect, it } from 'vitest';
import {
	WRITE_TODOS_TOOL_NAME,
	formatWriteTodosMarkdown,
	isWriteTodosTool,
	parseWriteTodosOutput,
	summariseWriteTodosOutput,
	writeTodosLabel,
	writeTodosSummaryLabel,
} from '../utils/write-todos-tool';

describe('write-todos-tool', () => {
	describe('isWriteTodosTool', () => {
		it('matches the write_todos tool name only', () => {
			expect(isWriteTodosTool(WRITE_TODOS_TOOL_NAME)).toBe(true);
			expect(isWriteTodosTool('delegate_subagent')).toBe(false);
		});
	});

	describe('parseWriteTodosOutput', () => {
		it('parses valid output and strips unknown fields', () => {
			expect(
				parseWriteTodosOutput({
					status: 'ok',
					todoCount: 1,
					todos: [{ id: 'a', content: 'Do thing', status: 'pending', extra: true }],
				}),
			).toEqual({
				status: 'ok',
				todoCount: 1,
				todos: [{ id: 'a', content: 'Do thing', status: 'pending' }],
			});
		});

		it('returns undefined for malformed output', () => {
			expect(parseWriteTodosOutput({ status: 'failed' })).toBeUndefined();
			expect(parseWriteTodosOutput('nope')).toBeUndefined();
		});
	});

	describe('summariseWriteTodosOutput', () => {
		it('returns a compact task count summary', () => {
			expect(
				summariseWriteTodosOutput({
					status: 'ok',
					todoCount: 3,
					todos: [],
				}),
			).toBe('3 tasks');
		});

		it('uses singular wording for one task', () => {
			expect(
				summariseWriteTodosOutput({
					status: 'ok',
					todoCount: 1,
					todos: [{ id: 'a', content: 'Only task', status: 'pending' }],
				}),
			).toBe('1 task');
		});
	});

	describe('formatWriteTodosMarkdown', () => {
		it('groups todos by status and includes delegate hints', () => {
			const markdown = formatWriteTodosMarkdown({
				status: 'ok',
				todoCount: 2,
				todos: [
					{
						id: 'research',
						content: 'Research auth options',
						status: 'in_progress',
						delegateHint: {
							subAgentId: 'inline',
							expectedOutput: 'Short comparison',
						},
					},
					{
						id: 'synthesize',
						content: 'Synthesize findings',
						status: 'pending',
					},
				],
			});

			expect(markdown).toContain('**In progress**');
			expect(markdown).toContain('- Research auth options');
			expect(markdown).toContain(
				'- Research auth options _(Sub-agent: inline; Expected output: Short comparison)_',
			);
			expect(markdown).toContain('**Pending**');
		});

		it('returns undefined for empty todo lists', () => {
			expect(
				formatWriteTodosMarkdown({
					status: 'ok',
					todoCount: 0,
					todos: [],
				}),
			).toBeUndefined();
		});
	});

	describe('i18n helpers', () => {
		const i18n = {
			baseText: (key: string, opts?: { interpolate?: { count?: string } }) =>
				opts?.interpolate?.count ? `${key}:${opts.interpolate.count}` : key,
		} as unknown as Parameters<typeof writeTodosLabel>[0];

		it('uses the task list label key', () => {
			expect(writeTodosLabel(i18n)).toBe('agents.chat.writeTodos.label');
		});

		it('uses the summary label key with count interpolation', () => {
			expect(writeTodosSummaryLabel(i18n, 4)).toBe('agents.chat.writeTodos.summary:4');
		});
	});
});
