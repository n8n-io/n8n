import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { roundRobinCaseRows } from '../run/rows';
import type { WorkflowTestCase } from '../types';

// Pins the row set + order both drivers evaluate (run/rows.ts is the single
// flattening source for the LangSmith dataset sync AND the direct driver).

function caseWith(fileSlug: string, scenarioNames: string[]): WorkflowTestCaseWithFile {
	const testCase: WorkflowTestCase = {
		conversation: [{ role: 'user', text: `build ${fileSlug}` }],
		complexity: 'simple',
		tags: [],
		datasets: ['full'],
		executionScenarios: scenarioNames.map((name) => ({
			name,
			description: 'd',
			dataSetup: 's',
			successCriteria: 'c',
		})),
	};
	return { testCase, fileSlug };
}

describe('roundRobinCaseRows', () => {
	it('orders scenario #n of every case before scenario #n+1, sentinels last', () => {
		const rows = roundRobinCaseRows([
			caseWith('alpha', ['a1', 'a2', 'a3']),
			caseWith('beta', ['b1', 'b2']),
			caseWith('gamma', []),
		]);

		expect(rows.map((r) => `${r.testCaseFile}/${r.scenario?.name ?? '<sentinel>'}`)).toEqual([
			'alpha/a1',
			'beta/b1',
			'alpha/a2',
			'beta/b2',
			'alpha/a3',
			'gamma/<sentinel>',
		]);
	});

	it('emits exactly one sentinel row per scenario-less case and none otherwise', () => {
		const rows = roundRobinCaseRows([caseWith('one', ['s']), caseWith('two', [])]);
		expect(rows.filter((r) => r.scenario === null)).toHaveLength(1);
		expect(rows.find((r) => r.scenario === null)?.testCaseFile).toBe('two');
	});

	it('returns an empty list for no cases', () => {
		expect(roundRobinCaseRows([])).toEqual([]);
	});
});
