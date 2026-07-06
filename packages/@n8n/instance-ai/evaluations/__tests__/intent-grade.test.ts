import { gradeIntentDeterministic, matchPartsToPredictions, matchTuple } from '../intent/grade';
import type { IntentAccept, IntentExpectation, IntentPrediction } from '../types';

function prediction(over: Partial<IntentPrediction> = {}): IntentPrediction {
	return { anchor: 'wf', embedsOther: false, ...over };
}

describe('matchTuple', () => {
	it('passes on an exact tuple match', () => {
		const accepts: IntentAccept[] = [{ anchor: 'wf', embedsOther: false }];
		const result = matchTuple(accepts, prediction({ anchor: 'wf', embedsOther: false }));
		expect(result).toEqual({ pass: true, anchorMatch: true, embedsMatch: true });
	});

	it('passes when the prediction matches the second of two accepted tuples (tolerance case)', () => {
		const accepts: IntentAccept[] = [
			{ anchor: 'agent', embedsOther: false },
			{ anchor: 'agent', embedsOther: true },
		];
		const result = matchTuple(accepts, prediction({ anchor: 'agent', embedsOther: true }));
		expect(result).toEqual({ pass: true, anchorMatch: true, embedsMatch: true });
	});

	it('reports anchorMatch true but pass false when the anchor is right and embeds_other is wrong', () => {
		const accepts: IntentAccept[] = [{ anchor: 'wf', embedsOther: true }];
		const result = matchTuple(accepts, prediction({ anchor: 'wf', embedsOther: false }));
		expect(result).toEqual({ pass: false, anchorMatch: true, embedsMatch: false });
	});

	it('fails entirely when the anchor itself does not match', () => {
		const accepts: IntentAccept[] = [{ anchor: 'wf', embedsOther: false }];
		const result = matchTuple(accepts, prediction({ anchor: 'agent', embedsOther: false }));
		expect(result).toEqual({ pass: false, anchorMatch: false, embedsMatch: false });
	});

	it('matches expected n/a against predicted n/a', () => {
		const accepts: IntentAccept[] = [{ anchor: 'clarify', embedsOther: 'n/a' }];
		const result = matchTuple(accepts, prediction({ anchor: 'clarify', embedsOther: 'n/a' }));
		expect(result).toEqual({ pass: true, anchorMatch: true, embedsMatch: true });
	});

	it('does not match n/a against a boolean', () => {
		const accepts: IntentAccept[] = [{ anchor: 'clarify', embedsOther: 'n/a' }];
		const result = matchTuple(accepts, prediction({ anchor: 'clarify', embedsOther: false }));
		expect(result).toEqual({ pass: false, anchorMatch: true, embedsMatch: false });
	});
});

describe('matchPartsToPredictions', () => {
	it('matches a span above the 0.5 token-overlap threshold', () => {
		const expectedSpans = ['summarize my meetings'];
		const predictions = [prediction({ span: 'summarize my meetings daily' })];
		expect(matchPartsToPredictions(expectedSpans, predictions)).toEqual([0]);
	});

	it('does not match a span below the 0.5 token-overlap threshold', () => {
		const expectedSpans = ['summarize my meetings and follow up on action items'];
		const predictions = [prediction({ span: 'follow up' })];
		expect(matchPartsToPredictions(expectedSpans, predictions)).toEqual([undefined]);
	});

	it('falls back to positional assignment when no prediction carries a span and counts line up', () => {
		const expectedSpans = ['part 1', 'part 2'];
		const predictions = [prediction({ anchor: 'wf' }), prediction({ anchor: 'agent' })];
		expect(matchPartsToPredictions(expectedSpans, predictions)).toEqual([0, 1]);
	});
});

describe('gradeIntentDeterministic', () => {
	const singlePartExpectation: IntentExpectation = {
		context: 'standalone',
		accepts: [{ anchor: 'wf', embedsOther: false }],
		rationale: 'Fixed trigger + fixed action, no reasoning.',
		source: 'synthetic',
	};

	it('grades a single-part case as a pass on an exact match', () => {
		const grade = gradeIntentDeterministic(singlePartExpectation, {
			predictions: [prediction({ anchor: 'wf', embedsOther: false })],
		});
		expect(grade.parseError).toBeUndefined();
		expect(grade.parts).toHaveLength(1);
		expect(grade.parts[0].jointPass).toBe(true);
		expect(grade.parts[0].anchorMatch).toBe(true);
		expect(grade.parts[0].embedsMatch).toBe(true);
	});

	it('fails a single-part case when the model answers with more than one block', () => {
		const grade = gradeIntentDeterministic(singlePartExpectation, {
			predictions: [prediction({ span: 'a' }), prediction({ span: 'b' })],
		});
		expect(grade.parts).toHaveLength(1);
		expect(grade.parts[0].jointPass).toBe(false);
		expect(grade.parts[0].reason).toContain('exactly one classification block');
	});

	it('marks every expected part as failed with parseError when the response is unparseable', () => {
		const expectation: IntentExpectation = {
			context: 'standalone',
			parts: [
				{ span: 'part 1', accepts: [{ anchor: 'wf', embedsOther: false }], rationale: 'r1' },
				{ span: 'part 2', accepts: [{ anchor: 'agent', embedsOther: false }], rationale: 'r2' },
			],
			source: 'synthetic',
		};
		const grade = gradeIntentDeterministic(expectation, {
			predictions: [],
			error: 'no classification block found',
		});
		expect(grade.parseError).toBe('no classification block found');
		expect(grade.parts).toHaveLength(2);
		expect(grade.parts.every((p) => !p.jointPass)).toBe(true);
		expect(grade.parts[0].expectedSpan).toBe('part 1');
		expect(grade.parts[1].expectedSpan).toBe('part 2');
	});

	it('grades each compound part independently by matching spans', () => {
		const expectation: IntentExpectation = {
			context: 'standalone',
			parts: [
				{ span: 'part 1', accepts: [{ anchor: 'wf', embedsOther: false }], rationale: 'r1' },
				{ span: 'part 2', accepts: [{ anchor: 'agent', embedsOther: false }], rationale: 'r2' },
			],
			source: 'synthetic',
		};
		const grade = gradeIntentDeterministic(expectation, {
			predictions: [
				prediction({ span: 'part 1', anchor: 'wf', embedsOther: false }),
				prediction({ span: 'part 2', anchor: 'agent', embedsOther: true }),
			],
		});
		expect(grade.parts[0].jointPass).toBe(true);
		expect(grade.parts[1].jointPass).toBe(false);
		expect(grade.parts[1].anchorMatch).toBe(true);
		expect(grade.parts[1].embedsMatch).toBe(false);
	});
});
