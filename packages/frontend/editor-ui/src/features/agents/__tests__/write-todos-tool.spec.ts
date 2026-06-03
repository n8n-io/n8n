import { describe, expect, it } from 'vitest';
import {
	WRITE_TODOS_TOOL_NAME,
	formatWriteTodosMarkdown,
	isWriteTodosTool,
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
				},
				i18n,
			);

			expect(markdown).toContain('**In progress**');
			expect(markdown).toContain('- Research auth options');
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
