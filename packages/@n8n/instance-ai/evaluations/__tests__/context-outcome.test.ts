import { classifyContextOutcome } from '../run/context-outcome';
import type { BuildExpectationResult } from '../types';

const ctx = (pass: boolean, incomplete = false): BuildExpectationResult => ({
	expectation: 'context claim',
	pass,
	reason: '',
	kind: 'memory',
	...(incomplete ? { incomplete: true } : {}),
});

const build = (pass: boolean, incomplete = false): BuildExpectationResult => ({
	expectation: 'build claim',
	pass,
	reason: '',
	...(incomplete ? { incomplete: true } : {}),
});

describe('classifyContextOutcome', () => {
	it('names the four cells', () => {
		expect(classifyContextOutcome([ctx(true), build(true)]).outcome).toBe('working');
		expect(classifyContextOutcome([ctx(true), build(false)]).outcome).toBe('context-ignored');
		expect(classifyContextOutcome([ctx(false), build(true)]).outcome).toBe('unattributed-success');
		expect(classifyContextOutcome([ctx(false), build(false)]).outcome).toBe('retrieval-gap');
	});

	it('is unclassified without a graded claim on both axes', () => {
		// Reporting `working` for a case with no context claim would read as evidence
		// that the context layer did something, when nothing was measured.
		expect(classifyContextOutcome([build(true)]).outcome).toBe('unclassified');
		expect(classifyContextOutcome([ctx(true)]).outcome).toBe('unclassified');
		expect(classifyContextOutcome([]).outcome).toBe('unclassified');
		expect(classifyContextOutcome(undefined).outcome).toBe('unclassified');
	});

	it('excludes incomplete verdicts from both axes', () => {
		// `incomplete` means not graded — a missing run-debug capture must not be
		// turned into a retrieval finding.
		const r = classifyContextOutcome([ctx(false, true), build(true)]);
		expect(r.outcome).toBe('unclassified');
		expect(r.contextGraded).toBe(0);

		const r2 = classifyContextOutcome([ctx(true), build(false, true), build(true)]);
		expect(r2.outcome).toBe('working');
		expect(r2.buildGraded).toBe(1);
	});

	it('requires EVERY context claim to pass before calling context present', () => {
		// Strictest reading: partial context plus a wrong build is a retrieval gap,
		// not a half-credit.
		const r = classifyContextOutcome([ctx(true), ctx(false), build(false)]);
		expect(r.outcome).toBe('retrieval-gap');
		expect(r.contextPassed).toBe(1);
		expect(r.contextGraded).toBe(2);
	});

	it('requires EVERY build claim to pass before calling the build correct', () => {
		// This is the shape of the real cross-workflow result: context fully present,
		// three of four conventions matched, one dropped.
		const r = classifyContextOutcome([
			ctx(true),
			ctx(true),
			build(true),
			build(true),
			build(true),
			build(false),
		]);
		expect(r.outcome).toBe('context-ignored');
		expect(r.contextPassed).toBe(2);
		expect(r.buildPassed).toBe(3);
		expect(r.buildGraded).toBe(4);
	});

	it('reports counts even when unclassified, so the reason is visible', () => {
		const r = classifyContextOutcome([build(true), build(false)]);
		expect(r.contextGraded).toBe(0);
		expect(r.buildGraded).toBe(2);
		expect(r.buildPassed).toBe(1);
	});
});
