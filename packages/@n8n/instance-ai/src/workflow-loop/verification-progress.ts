import type {
	VerificationClaim,
	WorkflowBuildOutcome,
	WorkflowTriggerVerificationProgress,
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
	const passes = passedTriggers.map((trigger) => progress[trigger.nodeName]);
	const coveredNodes = new Set(passes.flatMap((pass) => pass.nodesExecuted));
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

export function mergeTriggerVerificationProgress(
	previous: WorkflowTriggerVerificationProgress[],
	verification: Pick<WorkflowVerificationEvidence, 'evidence'> & { claim: VerificationClaim },
): WorkflowTriggerVerificationProgress {
	const nodes = verification.evidence?.nodesExecuted ?? [];
	const simulated = verification.claim.simulatedNodes;
	const simulatedNames = new Set([
		...simulated.map((node) => node.nodeName),
		...verification.claim.pinnedNodes,
	]);
	const liveNodes = new Set([
		...previous.flatMap((pass) => pass.liveNodesExecuted),
		...nodes.filter((name) => !simulatedNames.has(name)),
	]);
	return {
		nodesExecuted: [...new Set([...previous.flatMap((pass) => pass.nodesExecuted), ...nodes])],
		liveNodesExecuted: [...liveNodes],
		simulatedNodes: [
			...new Map(
				[...previous.flatMap((pass) => pass.simulatedNodes), ...simulated]
					.filter((node) => !liveNodes.has(node.nodeName))
					.map((node) => [node.nodeName, node]),
			).values(),
		],
		pinnedNodes: [
			...new Set([
				...previous.flatMap((pass) => pass.pinnedNodes),
				...verification.claim.pinnedNodes,
			]),
		].filter((name) => !liveNodes.has(name)),
		unprovenTargets: [
			...new Set([
				...previous.flatMap((pass) => pass.unprovenTargets),
				...verification.claim.unprovenTargets,
			]),
		].filter((name) => !liveNodes.has(name)),
	};
}

export function deriveWorkflowVerificationClaim(
	outcome: WorkflowBuildOutcome,
	verification: WorkflowVerificationEvidence & { claim: VerificationClaim },
) {
	const coverage = getMultiTriggerCoverage(outcome);
	if (!coverage) return verification.claim;

	// Only successful scoped passes contribute coverage. Keep the latest run's limitations.
	const progress = mergeTriggerVerificationProgress(coverage.passes, { claim: verification.claim });

	return deriveVerificationClaim({
		analysis: {
			success: verification.success,
			nodesNotReached: coverage.nodesNotReached,
			reachedSimulatedNodes: progress.simulatedNodes,
			workflowPinnedNodeNames: progress.pinnedNodes,
		},
		plannedNodeCount: outcome.nodeSimulationPlan?.length ?? 0,
		fixTargetNodeNames: progress.unprovenTargets,
		pendingTriggers: coverage.pendingTriggers,
	});
}
