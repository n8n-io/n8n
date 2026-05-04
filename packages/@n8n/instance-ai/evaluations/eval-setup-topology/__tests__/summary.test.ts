import { formatRunSummary } from '../summary';
import type { EvalSetupTopologyRunResult } from '../types';

function result(caseSlug: string, passed: boolean): EvalSetupTopologyRunResult['results'][number] {
	return {
		caseSlug,
		toolSelection: { evalsToolCalled: true, evalSetupAgentCalled: true, findings: [] },
		topology: { passed, findings: [], targetResults: [], targetNodeNames: [] },
		passed,
	};
}

describe('formatRunSummary', () => {
	it('reports passed and failed workflow counts', () => {
		const runResult: EvalSetupTopologyRunResult = {
			passed: false,
			results: [result('a', true), result('b', false), result('c', true)],
		};

		expect(formatRunSummary(runResult)).toBe('Summary: 2/3 passed, 1 failed');
	});
});
