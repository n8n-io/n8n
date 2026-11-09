import {
	MAX_RERUN_ATTEMPTS,
	attemptResult,
	compareToolCalls,
	decideOutcome,
	needsAnotherRun,
} from '../rerun-outcome';
import type { RerunAttempt } from '../rerun-outcome';

const own = new Set(['lookup_order', 'send_email', 'refund_order']);

function attempt(overrides: Partial<RerunAttempt> = {}): RerunAttempt {
	return { offScriptTools: [], toolChanges: [], judge: 'pass', reasoning: null, ...overrides };
}

describe('compareToolCalls', () => {
	const saved = [
		{ tool: 'lookup_order', input: {}, output: {} },
		{ tool: 'send_email', input: {}, output: {} },
	];

	it('finds no change when the run calls the same tools the same number of times', () => {
		expect(compareToolCalls(saved, ['send_email', 'lookup_order'], own)).toEqual([]);
	});

	it('counts each of the agent own tools, and ignores built-in tools', () => {
		expect(
			compareToolCalls(saved, ['lookup_order', 'send_email', 'send_email', 'tool_search'], own),
		).toEqual([{ tool: 'send_email', saved: 1, now: 2 }]);
	});

	it('reports a tool the run no longer calls and one it calls for the first time', () => {
		expect(compareToolCalls(saved, ['lookup_order', 'refund_order'], own)).toEqual([
			{ tool: 'refund_order', saved: 0, now: 1 },
			{ tool: 'send_email', saved: 1, now: 0 },
		]);
	});
});

describe('attemptResult', () => {
	it('is a fail for an answer test when a tool count changed, whatever the judge said', () => {
		expect(
			attemptResult('answer', attempt({ toolChanges: [{ tool: 'a', saved: 1, now: 2 }] })),
		).toBe('fail');
	});

	it('ignores tool changes for a note test: the saved run was the wrong one', () => {
		expect(attemptResult('note', attempt({ toolChanges: [{ tool: 'a', saved: 1, now: 2 }] }))).toBe(
			'pass',
		);
	});

	it('follows the judge when the tools did not change', () => {
		expect(attemptResult('answer', attempt({ judge: 'fail' }))).toBe('fail');
		expect(attemptResult('answer', attempt({ judge: 'pass' }))).toBe('pass');
	});

	it('cannot tell when the judge failed to answer', () => {
		expect(attemptResult('answer', attempt({ judge: 'error' }))).toBe('unknown');
	});

	it('cannot tell when the run went off script', () => {
		expect(attemptResult('answer', attempt({ offScriptTools: ['search_faq'] }))).toBe('unknown');
	});
});

describe('needsAnotherRun', () => {
	it('stops after a first run that passes', () => {
		expect(needsAnotherRun('answer', [attempt()])).toBe(false);
	});

	it('runs again while every run so far failed, up to the limit', () => {
		const fail = attempt({ judge: 'fail' });
		expect(needsAnotherRun('answer', [fail])).toBe(true);
		expect(needsAnotherRun('answer', [fail, fail])).toBe(true);
		expect(needsAnotherRun('answer', Array(MAX_RERUN_ATTEMPTS).fill(fail))).toBe(false);
	});

	it('stops once a later run passes', () => {
		expect(needsAnotherRun('answer', [attempt({ judge: 'fail' }), attempt()])).toBe(false);
	});

	it('stops on a run it cannot read', () => {
		expect(needsAnotherRun('answer', [attempt({ offScriptTools: ['x'] })])).toBe(false);
	});
});

describe('decideOutcome', () => {
	const fail = attempt({ judge: 'fail', reasoning: 'The date is different.' });

	it('passes on one clean run', () => {
		expect(decideOutcome('answer', [attempt()])).toEqual({
			outcome: 'pass',
			runs: 1,
			failedRuns: 0,
		});
	});

	it('fails only when every run failed', () => {
		expect(decideOutcome('answer', [fail, fail, fail])).toMatchObject({
			outcome: 'fail',
			runs: 3,
			failedRuns: 3,
			reasoning: 'The date is different.',
		});
	});

	it('is flaky when the runs disagree', () => {
		expect(decideOutcome('answer', [fail, attempt()])).toMatchObject({
			outcome: 'flaky',
			runs: 2,
			failedRuns: 1,
		});
	});

	it("is couldn't check when a run went off script, naming the tools", () => {
		expect(decideOutcome('answer', [attempt({ offScriptTools: ['search_faq'] })])).toMatchObject({
			outcome: 'couldnt_check',
			offScriptTools: ['search_faq'],
		});
	});

	it('keeps the tool changes of the failed runs as evidence', () => {
		const changed = attempt({ toolChanges: [{ tool: 'send_email', saved: 1, now: 2 }] });
		expect(decideOutcome('answer', [changed, changed, changed]).toolChanges).toEqual([
			{ tool: 'send_email', saved: 1, now: 2 },
		]);
	});
});
