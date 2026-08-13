import type { CapturedToolCall } from '../../types';
import { gradeBudget } from '../graders/trace';
import { computeTokenStats, estimateTokens } from '../tokens';
import type { ScenarioTrace } from '../types';

function makeCall(partial: Partial<CapturedToolCall>): CapturedToolCall {
	return {
		toolCallId: partial.toolCallId ?? 'id',
		toolName: partial.toolName ?? 'tool',
		args: partial.args ?? {},
		result: partial.result,
		error: partial.error,
		durationMs: partial.durationMs ?? 0,
	};
}

function makeTrace(calls: CapturedToolCall[]): ScenarioTrace {
	return {
		events: [],
		toolCalls: calls,
		confirmations: [],
		finalText: '',
		durationMs: 0,
		tokens: computeTokenStats(calls),
		threadId: 'test-thread',
	};
}

describe('estimateTokens', () => {
	it('returns 0 for null/undefined', () => {
		expect(estimateTokens(null)).toBe(0);
		expect(estimateTokens(undefined)).toBe(0);
	});

	it('uses chars-per-4 for strings', () => {
		expect(estimateTokens('a'.repeat(8))).toBe(2);
		expect(estimateTokens('a'.repeat(9))).toBe(3);
	});

	it('JSON-stringifies non-strings before counting', () => {
		const small = estimateTokens({ a: 1 });
		const big = estimateTokens({ blob: 'x'.repeat(4000) });
		expect(big).toBeGreaterThan(small);
		expect(big).toBeGreaterThanOrEqual(1000);
	});

	it('counts a base64 image blob — what actually goes back to the model', () => {
		const fakePng = { content: [{ type: 'image', data: 'A'.repeat(40_000) }] };
		expect(estimateTokens(fakePng)).toBeGreaterThan(9_000);
	});
});

describe('computeTokenStats', () => {
	it('finds the largest result and tags it with the tool name', () => {
		const stats = computeTokenStats([
			makeCall({ toolName: 'workflows', result: { items: ['a', 'b'] } }),
			makeCall({ toolName: 'browser_snapshot', result: 'x'.repeat(40_000) }),
			makeCall({ toolName: 'write_file', result: 'ok' }),
		]);
		expect(stats.largestResultToolName).toBe('browser_snapshot');
		expect(stats.largestResultEst).toBeGreaterThanOrEqual(10_000);
		expect(stats.totalResultsEst).toBeGreaterThanOrEqual(stats.largestResultEst);
	});

	it('handles an empty trace', () => {
		const stats = computeTokenStats([]);
		expect(stats).toEqual({
			perCall: [],
			totalArgsEst: 0,
			totalResultsEst: 0,
			largestResultEst: 0,
			largestResultToolName: undefined,
			estimated: true,
		});
	});
});

describe('trace.budget — token caps', () => {
	it('passes when totals are within budget', () => {
		const trace = makeTrace([makeCall({ toolName: 'a', result: 'short' })]);
		const r = gradeBudget(trace, {
			type: 'trace.budget',
			maxToolResultTokensEst: 1_000,
			maxSingleToolResultTokensEst: 500,
		});
		expect(r.pass).toBe(true);
	});

	it('fails when total tool-result tokens exceed the cap', () => {
		const trace = makeTrace([
			makeCall({ toolName: 'a', result: 'x'.repeat(8_000) }),
			makeCall({ toolName: 'b', result: 'x'.repeat(8_000) }),
		]);
		const r = gradeBudget(trace, {
			type: 'trace.budget',
			maxToolResultTokensEst: 1_000,
		});
		expect(r.pass).toBe(false);
		expect(r.reason).toContain('total tool-result tokens');
	});

	it('fails when a single tool result exceeds the per-call cap and names the offender', () => {
		const trace = makeTrace([
			makeCall({ toolName: 'browser_snapshot', result: 'x'.repeat(40_000) }),
			makeCall({ toolName: 'write_file', result: 'ok' }),
		]);
		const r = gradeBudget(trace, {
			type: 'trace.budget',
			maxSingleToolResultTokensEst: 5_000,
		});
		expect(r.pass).toBe(false);
		expect(r.reason).toContain('browser_snapshot');
	});
});
