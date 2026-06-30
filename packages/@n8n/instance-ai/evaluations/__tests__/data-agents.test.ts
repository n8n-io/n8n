import { loadAgentEvalTestCasesWithFiles } from '../data/agents';

const INTENT_RECOGNITION_SENTINELS = new Set([
	'workflow-rss-summary-linkedin',
	'hybrid-support-ticket-classify-route',
	'agent-customer-complaint-investigation',
	'ambiguous-inbox-handling',
]);

describe('loadAgentEvalTestCasesWithFiles', () => {
	it('requires one sentinel per rubric to load the intent-recognition skill', () => {
		const cases = loadAgentEvalTestCasesWithFiles();

		expect(cases.length).toBeGreaterThan(0);
		expect(cases.filter(({ fileSlug }) => INTENT_RECOGNITION_SENTINELS.has(fileSlug))).toHaveLength(
			INTENT_RECOGNITION_SENTINELS.size,
		);

		for (const { fileSlug, testCase } of cases) {
			if (INTENT_RECOGNITION_SENTINELS.has(fileSlug)) {
				expect(testCase.expectedToolInvocations).toEqual({
					allOfToolCalls: [
						{
							toolName: 'load_skill',
							argsContainAny: ['intent-recognition'],
						},
					],
				});
			} else {
				expect(testCase.expectedToolInvocations).toBeUndefined();
			}
		}
	});
});
