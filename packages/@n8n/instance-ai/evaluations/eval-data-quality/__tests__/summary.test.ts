import { formatRunSummary } from '../summary';
import type { EvalDataQualityCaseResult } from '../types';

const caseResult = (passed: boolean): EvalDataQualityCaseResult => ({
	caseSlug: 'slug',
	toolSelection: { evalDataToolCalled: passed, findings: [] },
	dataset: { passed, findings: [], rowCount: 0 },
	passed,
});

describe('formatRunSummary', () => {
	it('reports passed/total/failed counts', () => {
		expect(
			formatRunSummary({
				passed: false,
				results: [caseResult(true), caseResult(false), caseResult(true)],
			}),
		).toBe('Summary: 2/3 passed, 1 failed');
	});

	it('handles an empty run', () => {
		expect(formatRunSummary({ passed: true, results: [] })).toBe('Summary: 0/0 passed, 0 failed');
	});
});
