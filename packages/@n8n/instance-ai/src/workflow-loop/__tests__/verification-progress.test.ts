import { deriveWorkflowVerificationClaim } from '../verification-progress';
import type {
	VerificationClaim,
	WorkflowBuildOutcome,
	WorkflowVerificationEvidence,
} from '../workflow-loop-state';

function makeClaim(overrides: Partial<VerificationClaim> = {}): VerificationClaim {
	return {
		level: 'verified',
		plannedNodeCount: 2,
		reachedNodeCount: 2,
		nodesNotReached: [],
		simulatedNodes: [],
		pinnedNodes: [],
		unprovenTargets: [],
		publishReady: true,
		liveTestRecommended: false,
		...overrides,
	};
}

/** Two triggers, one already passed — the shape that re-derives the claim. */
function makeMultiTriggerOutcome(): WorkflowBuildOutcome {
	return {
		workItemId: 'wi-1',
		taskId: 'task-1',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		executionIntent: 'reusable',
		nodeSimulationPlan: [
			{ nodeName: 'Send Email', verdict: 'live' },
			{ nodeName: 'Log Row', verdict: 'live' },
		],
		triggerNodes: [
			{ nodeName: 'Webhook A', nodeType: 'n8n-nodes-base.webhook' },
			{ nodeName: 'Webhook B', nodeType: 'n8n-nodes-base.webhook' },
		],
		verificationProgress: {
			'Webhook A': [
				{
					attempted: true,
					success: true,
					claim: makeClaim(),
					evidence: { nodesExecuted: ['Send Email'] },
				},
			],
		},
		needsUserInput: false,
		summary: 'built ok',
	} as unknown as WorkflowBuildOutcome;
}

describe('deriveWorkflowVerificationClaim', () => {
	it('keeps the publish state of the latest run when it re-derives coverage', () => {
		// Publish state belongs to the workflow, not to one trigger. Re-deriving
		// from per-trigger coverage would otherwise report a stale live version
		// as unknown, which reads as "no reason to mention production".
		const verification: WorkflowVerificationEvidence & { claim: VerificationClaim } = {
			attempted: true,
			success: true,
			claim: makeClaim({ liveState: 'live-stale', verifiedVersionId: 'draft-2' }),
			evidence: { nodesExecuted: ['Log Row'] },
		};

		const claim = deriveWorkflowVerificationClaim(makeMultiTriggerOutcome(), verification);

		expect(claim.liveState).toBe('live-stale');
		expect(claim.verifiedVersionId).toBe('draft-2');
		// The aggregate still reports the trigger nobody verified.
		expect(claim.pendingTriggers).toEqual(['Webhook B']);
	});

	it('leaves publish state absent when the latest run recorded none', () => {
		const verification: WorkflowVerificationEvidence & { claim: VerificationClaim } = {
			attempted: true,
			success: true,
			claim: makeClaim(),
			evidence: { nodesExecuted: ['Log Row'] },
		};

		const claim = deriveWorkflowVerificationClaim(makeMultiTriggerOutcome(), verification);

		expect(claim.liveState).toBeUndefined();
		expect(claim.verifiedVersionId).toBeUndefined();
	});
});
