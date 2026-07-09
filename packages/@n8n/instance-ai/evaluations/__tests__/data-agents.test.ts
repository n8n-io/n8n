import { loadAgentEvalTestCasesWithFiles } from '../data/agents';

describe('agents dataset (intent-resolution suite)', () => {
	const cases = loadAgentEvalTestCasesWithFiles();

	it('loads and schema-validates every case file', () => {
		expect(cases.length).toBeGreaterThan(0);
	});

	it('every case grades routing via expectations and belongs to the agents dataset', () => {
		for (const { testCase, fileSlug } of cases) {
			expect(testCase.datasets, fileSlug).toContain('agents');
			expect(testCase.processExpectations?.length ?? 0, fileSlug).toBeGreaterThan(0);
		}
	});
});
