import type { WorkflowTriggerVerificationProgress } from '../workflow-loop/workflow-loop-state';

export function successfulVerification(
	triggerNodeName: string,
	nodesExecuted = [triggerNodeName],
): WorkflowTriggerVerificationProgress[number] {
	return {
		attempted: true,
		success: true,
		executionId: `exec-${triggerNodeName}`,
		evidence: { triggerNodeName, nodesExecuted },
		claim: {
			level: 'verified',
			plannedNodeCount: nodesExecuted.length,
			reachedNodeCount: nodesExecuted.length,
			nodesNotReached: [],
			simulatedNodes: [],
			pinnedNodes: [],
			unprovenTargets: [],
			publishReady: true,
			liveTestRecommended: false,
		},
	};
}
