import { describe, expect, it } from 'vitest';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	humanizeTaskName,
	isDelegateSubAgentTool,
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
		it('extracts the answer and strips the rest', () => {
			expect(
				parseDelegateOutput({
					status: 'completed',
					answer: 'Done',
					usage: { totalTokens: 1234 },
				}),
			).toEqual({ answer: 'Done' });
		});

		it('returns undefined for a non-object (rejected tool call raw error string)', () => {
			expect(parseDelegateOutput('Something failed')).toBeUndefined();
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
