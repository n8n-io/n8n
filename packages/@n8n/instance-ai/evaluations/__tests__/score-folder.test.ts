import { applyBinaryCheckResults, BINARY_CHECK_FAILURE_CATEGORY } from '../harness/score-folder';
import type { BinaryCheckOutcome } from '../types';

const passing: BinaryCheckOutcome = { name: 'has_nodes', pass: true };
const failingA: BinaryCheckOutcome = { name: 'has_trigger', pass: false, comment: 'no trigger' };
const failingB: BinaryCheckOutcome = { name: 'all_nodes_connected', pass: false };

const verifierPass = {
	success: true,
	score: 1,
	reasoning: 'looks fine',
	failureCategory: undefined,
};

const verifierFail = {
	success: false,
	score: 0,
	reasoning: 'missing email send',
	failureCategory: 'builder_issue',
};

describe('applyBinaryCheckResults', () => {
	it('returns base unchanged when no binary checks were run', () => {
		expect(applyBinaryCheckResults(verifierPass, undefined)).toEqual(verifierPass);
		expect(applyBinaryCheckResults(verifierFail, undefined)).toEqual(verifierFail);
	});

	it('returns base unchanged when the binary array is empty', () => {
		expect(applyBinaryCheckResults(verifierPass, [])).toEqual(verifierPass);
	});

	it('returns base unchanged when every binary check passed', () => {
		expect(applyBinaryCheckResults(verifierPass, [passing, passing])).toEqual(verifierPass);
	});

	it('flips a verifier-passing scenario to failure when any binary check failed', () => {
		const folded = applyBinaryCheckResults(verifierPass, [passing, failingA]);
		expect(folded.success).toBe(false);
		expect(folded.score).toBe(0);
		expect(folded.failureCategory).toBe(BINARY_CHECK_FAILURE_CATEGORY);
		expect(folded.reasoning).toContain('has_trigger');
		expect(folded.reasoning).toContain('Verifier: looks fine');
	});

	it('lists every failing check name in the reasoning prefix', () => {
		const folded = applyBinaryCheckResults(verifierPass, [failingA, failingB, passing]);
		expect(folded.reasoning).toContain('has_trigger');
		expect(folded.reasoning).toContain('all_nodes_connected');
	});

	it('overrides an existing failureCategory when binary checks fail', () => {
		const folded = applyBinaryCheckResults(verifierFail, [failingA]);
		expect(folded.failureCategory).toBe(BINARY_CHECK_FAILURE_CATEGORY);
		expect(folded.reasoning).toContain('Verifier: missing email send');
	});
});
