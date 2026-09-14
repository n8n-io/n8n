import { describe, expect, it } from 'vitest';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_SUB_AGENT_ID,
	delegateLabel,
	getDelegateDifficultySummary,
	humanizeTaskName,
	isDelegateSubAgentTool,
	isFailedDelegateOutput,
	parseDelegateInput,
	parseDelegateOutput,
	resolveSubAgentName,
} from '../utils/delegate-tool';

describe('delegate-tool', () => {
	describe('isDelegateSubAgentTool', () => {
		it('matches the delegate tool name only', () => {
			expect(isDelegateSubAgentTool(DELEGATE_SUB_AGENT_TOOL_NAME)).toBe(true);
			expect(isDelegateSubAgentTool('web_search')).toBe(false);
			expect(isDelegateSubAgentTool(undefined)).toBe(false);
		});
	});

	describe('parseDelegateInput', () => {
		it('keeps the fields the chat reads and strips the rest', () => {
			expect(
				parseDelegateInput({
					subAgentId: 'agent-1',
					taskName: 'research_api',
					goal: 'Find pricing',
					context: 'For three providers',
					expectedOutput: 'A table',
					difficulty: 'high',
				}),
			).toEqual({ subAgentId: 'agent-1', taskName: 'research_api', difficulty: 'high' });
		});

		it('returns undefined for non-object input', () => {
			expect(parseDelegateInput('nope')).toBeUndefined();
			expect(parseDelegateInput(undefined)).toBeUndefined();
			expect(parseDelegateInput(null)).toBeUndefined();
		});

		it('requires a subAgentId', () => {
			expect(parseDelegateInput({ taskName: 'compare-pricing' })).toBeUndefined();
		});
	});

	describe('parseDelegateOutput', () => {
		it('keeps status/answer/error/model and strips the rest', () => {
			expect(
				parseDelegateOutput({
					status: 'completed',
					answer: 'Done',
					model: 'anthropic/claude-haiku-4-5',
					usage: { totalTokens: 1234 },
				}),
			).toEqual({
				status: 'completed',
				answer: 'Done',
				model: 'anthropic/claude-haiku-4-5',
			});
		});

		it('keeps the error on a failed delegation', () => {
			expect(parseDelegateOutput({ status: 'failed', answer: '', error: 'child failed' })).toEqual({
				status: 'failed',
				answer: '',
				error: 'child failed',
			});
		});

		it('returns undefined for a non-object (rejected tool call raw error string)', () => {
			expect(parseDelegateOutput('Something failed')).toBeUndefined();
		});
	});

	describe('isFailedDelegateOutput', () => {
		it('is true only for a delegate tool whose output status is failed', () => {
			expect(
				isFailedDelegateOutput(DELEGATE_SUB_AGENT_TOOL_NAME, { status: 'failed', answer: '' }),
			).toBe(true);
		});

		it('is false for a completed delegate output', () => {
			expect(
				isFailedDelegateOutput(DELEGATE_SUB_AGENT_TOOL_NAME, { status: 'completed', answer: 'ok' }),
			).toBe(false);
		});

		it('is false for non-delegate tools even when the output looks failed', () => {
			expect(isFailedDelegateOutput('web_search', { status: 'failed' })).toBe(false);
		});

		it('is false when the output is a raw error string', () => {
			expect(isFailedDelegateOutput(DELEGATE_SUB_AGENT_TOOL_NAME, 'boom')).toBe(false);
		});
	});

	describe('humanizeTaskName', () => {
		it('humanizes snake/kebab names', () => {
			expect(humanizeTaskName('research_api')).toBe('Research api');
			expect(humanizeTaskName('compare-pricing')).toBe('Compare pricing');
		});

		it('returns empty string for empty/undefined', () => {
			expect(humanizeTaskName(undefined)).toBe('');
			expect(humanizeTaskName('   ')).toBe('');
		});
	});

	describe('resolveSubAgentName', () => {
		it('prefers the configured sub-agent name from the id map', () => {
			const map = new Map([['agent-1', 'Research Bot']]);
			expect(resolveSubAgentName({ subAgentId: 'agent-1', taskName: 'research_api' }, map)).toBe(
				'Research Bot',
			);
		});

		it('falls back to the humanized task name when the id is unknown', () => {
			expect(
				resolveSubAgentName({ subAgentId: 'missing', taskName: 'research_api' }, new Map()),
			).toBe('Research api');
		});

		it('falls back to the humanized task name for inline subagents', () => {
			expect(
				resolveSubAgentName(
					{ subAgentId: INLINE_SUB_AGENT_ID, taskName: 'compare-pricing' },
					new Map(),
				),
			).toBe('Compare pricing');
		});

		it('ignores a blank resolved name and uses the task name', () => {
			const map = new Map([['agent-1', '   ']]);
			expect(resolveSubAgentName({ subAgentId: 'agent-1', taskName: 'deep_research' }, map)).toBe(
				'Deep research',
			);
		});

		it('returns empty string when neither id nor task name resolve', () => {
			expect(resolveSubAgentName({ subAgentId: INLINE_SUB_AGENT_ID }, new Map())).toBe('');
			expect(resolveSubAgentName('not-an-object', new Map())).toBe('');
		});
	});

	describe('getDelegateDifficultySummary', () => {
		const i18n = {
			baseText: (key: string) => key,
		} as unknown as Parameters<typeof getDelegateDifficultySummary>[1];

		it('returns the localized label for delegate input difficulty', () => {
			expect(
				getDelegateDifficultySummary(
					{
						subAgentId: INLINE_SUB_AGENT_ID,
						taskName: 'research_api',
						difficulty: 'high',
					},
					i18n,
				),
			).toBe('agents.chat.difficulty.high');
		});

		it('returns undefined when difficulty is missing or input is malformed', () => {
			expect(
				getDelegateDifficultySummary({ subAgentId: INLINE_SUB_AGENT_ID }, i18n),
			).toBeUndefined();
			expect(getDelegateDifficultySummary('boom', i18n)).toBeUndefined();
		});
	});

	describe('delegateLabel', () => {
		// Stub returns the chosen key (with the interpolated name) so the assertions
		// pin down both which key is used and the interpolation.
		const i18n = {
			baseText: (key: string, opts?: { interpolate?: { name?: string } }) =>
				opts?.interpolate?.name ? `${key}:${opts.interpolate.name}` : key,
		} as unknown as Parameters<typeof delegateLabel>[0];

		it('uses the named label and interpolates the name', () => {
			expect(delegateLabel(i18n, 'Research Bot')).toBe('agents.chat.delegate.label:Research Bot');
		});

		it('falls back to the bare label when the name is empty', () => {
			expect(delegateLabel(i18n, '')).toBe('agents.chat.delegate.labelFallback');
		});
	});
});
