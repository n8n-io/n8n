import { loadAgentEvalTestCasesWithFiles } from '../data/agents';

describe('agents dataset (intent-resolution suite)', () => {
	const cases = loadAgentEvalTestCasesWithFiles();

	it('loads and schema-validates every case file', () => {
		expect(cases.length).toBeGreaterThan(0);
	});

	it('every case grades routing via expectations and belongs to the agents dataset', () => {
		for (const { testCase, fileSlug } of cases) {
			expect(testCase.datasets, fileSlug).toContain('agents');
			// This suite grades enacted behavior — the exam-corpus mechanism
			// (intentExpectation + injected classification preamble) must not leak in.
			expect(testCase.intentExpectation, fileSlug).toBeUndefined();
			expect(testCase.processExpectations?.length ?? 0, fileSlug).toBeGreaterThan(0);
			const firstTurn = testCase.conversation?.[0]?.text ?? '';
			expect(firstTurn, fileSlug).not.toContain('classify the intent');
			expect(firstTurn, fileSlug).not.toContain('```intent');
		}
	});
});
