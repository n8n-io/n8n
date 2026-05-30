import { describe, expect, it } from 'vitest';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	humanizeTaskName,
	isDelegateSubAgentTool,
	isFailedDelegateOutput,
	parseDelegateInput,
	parseDelegateOutput,
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
				}),
			).toEqual({ subAgentId: 'agent-1', taskName: 'research_api' });
		});

		it('returns undefined for non-object input', () => {
			expect(parseDelegateInput('nope')).toBeUndefined();
			expect(parseDelegateInput(undefined)).toBeUndefined();
			expect(parseDelegateInput(null)).toBeUndefined();
		});
	});

	describe('parseDelegateOutput', () => {
		it('keeps status/answer/error and strips the rest', () => {
			expect(
				parseDelegateOutput({
					status: 'completed',
					answer: 'Done',
					usage: { totalTokens: 1234 },
				}),
			).toEqual({ status: 'completed', answer: 'Done' });
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
});
