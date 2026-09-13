import type {
	VerificationClaim,
	WorkflowBuildOutcome,
	WorkflowVerificationEvidence,
} from './workflow-loop-state';
import { deriveVerificationClaim } from '../tools/orchestration/verification/claim';

export function getMultiTriggerCoverage(outcome: WorkflowBuildOutcome | undefined) {
	const progress = outcome?.verificationProgress;
	const triggers = outcome?.triggerNodes ?? [];
	if (!outcome || outcome.executionIntent === 'one-off' || !progress || triggers.length < 2) {
		return undefined;
	}

	const passedTriggers = triggers.filter((trigger) => Object.hasOwn(progress, trigger.nodeName));
	const passes = passedTriggers.flatMap((trigger) => progress[trigger.nodeName]);
	const coveredNodes = new Set(passes.flatMap((pass) => pass.evidence?.nodesExecuted ?? []));
	return {
		passes,
		allTriggersPassed: passedTriggers.length === triggers.length,
		pendingTriggers: triggers
			.filter((trigger) => !Object.hasOwn(progress, trigger.nodeName))
			.map((trigger) => trigger.nodeName),
		nodesNotReached: (outcome.nodeSimulationPlan ?? [])
			.map((node) => node.nodeName)
			.filter((nodeName) => !coveredNodes.has(nodeName)),
	};
}

export function deriveWorkflowVerificationClaim(
	outcome: WorkflowBuildOutcome,
	verification: WorkflowVerificationEvidence & { claim: VerificationClaim },
) {
	const coverage = getMultiTriggerCoverage(outcome);
	if (!coverage) return verification.claim;

	const liveNodes = new Set(
		coverage.passes.flatMap(({ evidence, claim }) => {
			const simulated = new Set([
				...claim.simulatedNodes.map((node) => node.nodeName),
				...claim.pinnedNodes,
			]);
			return (evidence?.nodesExecuted ?? []).filter((name) => !simulated.has(name));
		}),
	);
	// Only successful scoped passes contribute coverage. Keep the latest run's limitations.
	const claims = [...coverage.passes.map((pass) => pass.claim), verification.claim];

	return deriveVerificationClaim({
		analysis: {
			success: verification.success,
			nodesNotReached: coverage.nodesNotReached,
			reachedSimulatedNodes: [
				...new Map(
					claims
						.flatMap((claim) => claim.simulatedNodes)
						.filter((node) => !liveNodes.has(node.nodeName))
						.map((node) => [node.nodeName, node]),
				).values(),
			],
			workflowPinnedNodeNames: [...new Set(claims.flatMap((claim) => claim.pinnedNodes))].filter(
				(name) => !liveNodes.has(name),
			),
		},
		plannedNodeCount: outcome.nodeSimulationPlan?.length ?? 0,
		fixTargetNodeNames: claims
			.flatMap((claim) => claim.unprovenTargets)
			.filter((name) => !liveNodes.has(name)),
		pendingTriggers: coverage.pendingTriggers,
	});
}
