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
});
