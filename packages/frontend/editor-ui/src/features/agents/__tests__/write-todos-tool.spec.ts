import { describe, expect, it } from 'vitest';
import {
	WRITE_TODOS_TOOL_NAME,
	formatWriteTodosMarkdown,
	isWriteTodosTool,
	parseWriteTodosFailedOutput,
	parseWriteTodosOutput,
	writeTodosLabel,
	writeTodosSummaryLabel,
	type WriteTodosI18n,
} from '../utils/write-todos-tool';

const STATUS_LABELS: Record<string, string> = {
	'agents.chat.writeTodos.status.inProgress': 'In progress',
	'agents.chat.writeTodos.status.pending': 'Pending',
	'agents.chat.writeTodos.status.completed': 'Completed',
	'agents.chat.writeTodos.status.blocked': 'Blocked',
	'agents.chat.writeTodos.status.cancelled': 'Cancelled',
	'agents.chat.writeTodos.hint.subAgent': 'Sub-agent',
	'agents.chat.writeTodos.hint.expectedOutput': 'Expected output',
};

function createWriteTodosI18n(): WriteTodosI18n {
	return {
		baseText: (key: string, opts?: { interpolate?: { count?: string } }) => {
			if (key === 'agents.chat.writeTodos.summary.one' && opts?.interpolate?.count) {
				return `${opts.interpolate.count} task`;
			}
			if (key === 'agents.chat.writeTodos.summary.other' && opts?.interpolate?.count) {
				return `${opts.interpolate.count} tasks`;
			}
			return STATUS_LABELS[key] ?? key;
		},
	} as WriteTodosI18n;
}

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
					todos: [
						{ id: 'a', content: 'Do thing', status: 'pending', difficulty: 'low', extra: true },
					],
				}),
			).toEqual({
				status: 'ok',
				todoCount: 1,
				todos: [{ id: 'a', content: 'Do thing', status: 'pending', difficulty: 'low' }],
			});
		});

		it('returns undefined when difficulty is missing or invalid', () => {
			expect(
				parseWriteTodosOutput({
					status: 'ok',
					todoCount: 1,
					todos: [{ id: 'a', content: 'Do thing', status: 'pending' }],
				}),
			).toBeUndefined();
			expect(
				parseWriteTodosOutput({
					status: 'ok',
					todoCount: 1,
					todos: [{ id: 'a', content: 'Do thing', status: 'pending', difficulty: 'extreme' }],
				}),
			).toBeUndefined();
		});

		it('returns undefined for malformed output', () => {
			expect(parseWriteTodosOutput({ status: 'failed' })).toBeUndefined();
			expect(parseWriteTodosOutput('nope')).toBeUndefined();
		});
	});

	describe('parseWriteTodosFailedOutput', () => {
		it('parses failed output with an error message', () => {
			expect(parseWriteTodosFailedOutput({ status: 'failed', error: 'Duplicate todo id' })).toEqual(
				{
					status: 'failed',
					error: 'Duplicate todo id',
				},
			);
		});

		it('returns undefined for ok output or malformed failed payloads', () => {
			expect(
				parseWriteTodosFailedOutput({
					status: 'ok',
					todoCount: 1,
					todos: [{ id: 'a', content: 'Task', status: 'pending', difficulty: 'medium' }],
				}),
			).toBeUndefined();
			expect(parseWriteTodosFailedOutput({ status: 'failed' })).toBeUndefined();
		});
	});

	describe('formatWriteTodosMarkdown', () => {
		const i18n = createWriteTodosI18n();

		it('groups todos by status and humanizes inline delegate hints', () => {
			const markdown = formatWriteTodosMarkdown(
				{
					status: 'ok',
					todoCount: 2,
					todos: [
						{
							id: 'research',
							content: 'Research auth options',
							status: 'in_progress',
							difficulty: 'high',
							delegateHint: {
								subAgentId: 'inline',
								expectedOutput: 'Short comparison',
							},
						},
						{
							id: 'synthesize',
							content: 'Synthesize findings',
							status: 'pending',
							difficulty: 'medium',
						},
					],
				},
				i18n,
			);

			expect(markdown).toContain('**In progress**');
			expect(markdown).toContain(
				'- Research auth options _(Sub-agent: Inline; Expected output: Short comparison)_',
			);
			expect(markdown).toContain('**Pending**');
		});

		it('resolves configured sub-agent ids to friendly names in delegate hints', () => {
			const nameById = new Map([['agent-2', 'Research specialist']]);
			const markdown = formatWriteTodosMarkdown(
				{
					status: 'ok',
					todoCount: 1,
					todos: [
						{
							id: 'research',
							content: 'Research auth options',
							status: 'pending',
							difficulty: 'high',
							delegateHint: { subAgentId: 'agent-2' },
						},
					],
				},
				i18n,
				nameById,
			);

			expect(markdown).toContain('_(Sub-agent: Research specialist)_');
		});

		it('falls back to the raw sub-agent id when no friendly name is known', () => {
			const markdown = formatWriteTodosMarkdown(
				{
					status: 'ok',
					todoCount: 1,
					todos: [
						{
							id: 'research',
							content: 'Research auth options',
							status: 'pending',
							difficulty: 'medium',
							delegateHint: { subAgentId: 'unknown-agent-id' },
						},
					],
				},
				i18n,
				new Map(),
			);

			expect(markdown).toContain('_(Sub-agent: Unknown agent id)_');
		});

		it('returns undefined for empty todo lists', () => {
			expect(
				formatWriteTodosMarkdown(
					{
						status: 'ok',
						todoCount: 0,
						todos: [],
					},
					i18n,
				),
			).toBeUndefined();
		});

		it('returns trimmed error text for failed write_todos output', () => {
			expect(
				formatWriteTodosMarkdown({ status: 'failed', error: '  Duplicate todo id "a"  ' }),
			).toBe('Duplicate todo id "a"');
		});

		it('returns trimmed string output for rejected tool calls', () => {
			expect(formatWriteTodosMarkdown('  Validation failed  ')).toBe('Validation failed');
		});

		it('returns undefined for empty failed or malformed error payloads', () => {
			expect(formatWriteTodosMarkdown({ status: 'failed', error: '   ' })).toBeUndefined();
			expect(formatWriteTodosMarkdown({ status: 'failed' })).toBeUndefined();
			expect(formatWriteTodosMarkdown({})).toBeUndefined();
		});
	});

	describe('i18n helpers', () => {
		const i18n = {
			baseText: (key: string, opts?: { interpolate?: { count?: string } }) => {
				if (opts?.interpolate?.count) return `${key}:${opts.interpolate.count}`;
				return key;
			},
		} as WriteTodosI18n;

		it('uses the task list label key', () => {
			expect(writeTodosLabel(i18n)).toBe('agents.chat.writeTodos.label');
		});

		it('uses the singular summary key for one task', () => {
			expect(writeTodosSummaryLabel(i18n, 1)).toBe('agents.chat.writeTodos.summary.one:1');
		});

		it('uses the plural summary key for multiple tasks', () => {
			expect(writeTodosSummaryLabel(i18n, 4)).toBe('agents.chat.writeTodos.summary.other:4');
		});
	});
});
