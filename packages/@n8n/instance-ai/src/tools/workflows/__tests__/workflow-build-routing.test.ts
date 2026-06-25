import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { withDeterministicRouting } from '../workflow-build-routing';

function makeOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'src/workflows/main.workflow.ts',
		taskId: 'src/workflows/main.workflow.ts',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		triggerNodes: [{ nodeName: 'Start', nodeType: 'n8n-nodes-base.manualTrigger' }],
		needsUserInput: false,
		summary: 'Workflow saved.',
		...overrides,
	};
}

describe('withDeterministicRouting', () => {
	it('marks manual-trigger workflows as ready for verification', () => {
		const outcome = withDeterministicRouting(makeOutcome());

		expect(outcome.verificationReadiness).toEqual({ status: 'ready' });
	});

	it('keeps workflows with unresolved placeholders ready for verification', () => {
		const outcome = withDeterministicRouting(
			makeOutcome({
				hasUnresolvedPlaceholders: true,
			}),
		);

		expect(outcome.verificationReadiness).toEqual({ status: 'ready' });
		expect(outcome.setupRequirement).toEqual({
			status: 'required',
			reason: 'unresolved-placeholders',
			guidance: 'Route the workflow through setup so the user can fill unresolved values.',
		});
	});

	it('keeps workflows with mocked credentials ready for verification', () => {
		const outcome = withDeterministicRouting(
			makeOutcome({
				mockedNodeNames: ['Send Email'],
				mockedCredentialTypes: ['gmailOAuth2'],
				mockedCredentialsByNode: { 'Send Email': ['gmailOAuth2'] },
			}),
		);

		expect(outcome.verificationReadiness).toEqual({ status: 'ready' });
		expect(outcome.setupRequirement).toEqual({
			status: 'required',
			reason: 'mocked-credentials',
			guidance: 'Route the workflow through setup so the user can add real credentials.',
		});
	});

	it('routes workflows with pending setup requests to setup before verification', () => {
		const outcome = withDeterministicRouting({
			...makeOutcome(),
			workflowNeedsSetup: true,
		});

		expect(outcome.verificationReadiness).toEqual({
			status: 'needs_setup',
			reason: 'workflow-needs-setup',
			guidance: 'Route the workflow through setup so the user can fill pending node setup fields.',
		});
		expect(outcome.setupRequirement).toEqual({
			status: 'required',
			reason: 'workflow-needs-setup',
			guidance: 'Route the workflow through setup so the user can fill pending node setup fields.',
		});
		expect('workflowNeedsSetup' in outcome).toBe(false);
	});
});
