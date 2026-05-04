import { shouldFailProcessForCompletedRun } from '../exit-policy';
import type { EvalSetupTopologyRunResult } from '../types';

describe('eval setup topology exit policy', () => {
	it('does not fail the process when a completed eval run has topology findings', () => {
		const runResult: EvalSetupTopologyRunResult = {
			passed: false,
			results: [
				{
					caseSlug: 'gmail_email_labeling',
					toolSelection: { evalsToolCalled: true, evalSetupAgentCalled: true, findings: [] },
					topology: {
						passed: false,
						findings: [
							{
								severity: 'error',
								code: 'target_parameters_modified',
								message: 'Eval setup should not modify existing target AI agent parameters.',
							},
						],
						targetResults: [],
						targetNodeNames: ['AI Agent'],
					},
					passed: false,
				},
			],
		};

		expect(shouldFailProcessForCompletedRun(runResult)).toBe(false);
	});
});
