import { classifyContextOutcome } from '../run/context-outcome';
import type { BuildExpectationResult } from '../types';

const context = (pass: boolean, incomplete = false): BuildExpectationResult => ({
	expectation: 'context contains "#ops-alerts"',
	pass,
	reason: 'r',
	kind: 'context',
	...(incomplete ? { incomplete: true } : {}),
});

const build = (pass: boolean, incomplete = false): BuildExpectationResult => ({
	expectation: 'the workflow posts to the agreed channel',
	pass,
	reason: 'r',
	...(incomplete ? { incomplete: true } : {}),
});

describe('classifyContextOutcome', () => {
	it('names all four cells of the cross', () => {
		expect(classifyContextOutcome([context(true), build(true)]).outcome).toBe('working');
		expect(classifyContextOutcome([context(true), build(false)]).outcome).toBe('context-ignored');
		expect(classifyContextOutcome([context(false), build(true)]).outcome).toBe(
			'unattributed-success',
		);
		expect(classifyContextOutcome([context(false), build(false)]).outcome).toBe('retrieval-gap');
	});

	it('is unclassified without a graded claim on both axes', () => {
		// Returning `working` for a case with no context claim would let it read as
		// evidence that the context layer did something.
		expect(classifyContextOutcome([build(true)]).outcome).toBe('unclassified');
		expect(classifyContextOutcome([context(true)]).outcome).toBe('unclassified');
		expect(classifyContextOutcome([]).outcome).toBe('unclassified');
		expect(classifyContextOutcome(undefined).outcome).toBe('unclassified');
	});

	it('excludes incomplete verdicts from both axes', () => {
		// "Not graded" counted either way would invent a finding out of a missing
		// capture — here the only context claim is ungraded, so there is no cross.
		const summary = classifyContextOutcome([context(false, true), build(true)]);
		expect(summary.outcome).toBe('unclassified');
		expect(summary.contextGraded).toBe(0);
		expect(summary.buildGraded).toBe(1);
	});

	it('takes the strictest reading on each axis', () => {
		// One failed context claim among several means the context was not present:
		// averaging would turn the interesting cells into a shrug.
		expect(classifyContextOutcome([context(true), context(false), build(true)]).outcome).toBe(
			'unattributed-success',
		);
		expect(classifyContextOutcome([context(true), build(true), build(false)]).outcome).toBe(
			'context-ignored',
		);
	});

	it('reports the counts behind the verdict', () => {
		const summary = classifyContextOutcome([
			context(true),
			context(false),
			build(true),
			build(true),
		]);
		expect(summary).toMatchObject({
			contextPassed: 1,
			contextGraded: 2,
			buildPassed: 2,
			buildGraded: 2,
		});
	});
});
