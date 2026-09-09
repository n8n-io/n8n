import { deriveVerificationClaim } from './verification-claim';
import type {
	WorkflowBuildOutcome,
	WorkflowTriggerVerificationProgress,
	WorkflowVerificationEvidence,
} from './workflow-loop-state';

function getExecutedNodes(progress: WorkflowTriggerVerificationProgress): string[] {
	return Array.isArray(progress) ? progress : progress.nodesExecuted;
}

function hasVerificationProof(
	progress: WorkflowTriggerVerificationProgress,
): progress is Exclude<WorkflowTriggerVerificationProgress, string[]> {
	return !Array.isArray(progress);
}

export function getMultiTriggerCoverage(outcome: WorkflowBuildOutcome | undefined) {
	const progress = outcome?.verificationProgress;
	const triggers = outcome?.triggerNodes ?? [];
	if (!outcome || outcome.executionIntent === 'one-off' || !progress || triggers.length < 2) {
		return undefined;
	}

	const passedTriggers = triggers.filter((trigger) => Object.hasOwn(progress, trigger.nodeName));
	const passes = passedTriggers.map((trigger) => progress[trigger.nodeName]);
	const coveredNodes = new Set(passes.flatMap(getExecutedNodes));
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
	verification: WorkflowVerificationEvidence,
): WorkflowTriggerVerificationProgress {
	const nodes = verification.evidence?.nodesExecuted ?? [];
	const proofs = previous.filter(hasVerificationProof);
	const simulated = verification.claim?.simulatedNodes ?? [];
	const simulatedNames = new Set([
		...simulated.map((node) => node.nodeName),
		...(verification.claim?.pinnedNodes ?? []),
	]);
	const liveNodes = new Set([
		...proofs.flatMap((pass) => pass.liveNodesExecuted),
		...(verification.claim ? nodes.filter((name) => !simulatedNames.has(name)) : []),
	]);
	return {
		nodesExecuted: [...new Set([...previous.flatMap(getExecutedNodes), ...nodes])],
		liveNodesExecuted: [...liveNodes],
		simulatedNodes: [
			...new Map(
				[...proofs.flatMap((pass) => pass.simulatedNodes), ...simulated]
					.filter((node) => !liveNodes.has(node.nodeName))
					.map((node) => [node.nodeName, node]),
			).values(),
		],
		pinnedNodes: [
			...new Set([
				...proofs.flatMap((pass) => pass.pinnedNodes),
				...(verification.claim?.pinnedNodes ?? []),
			]),
		].filter((name) => !liveNodes.has(name)),
		unprovenTargets: [
			...new Set([
				...proofs.flatMap((pass) => pass.unprovenTargets),
				...(verification.claim?.unprovenTargets ?? []),
			]),
		].filter((name) => !liveNodes.has(name)),
	};
}

export function deriveWorkflowVerificationClaim(
	outcome: WorkflowBuildOutcome,
	verification: WorkflowVerificationEvidence,
) {
	const coverage = getMultiTriggerCoverage(outcome);
	if (!coverage || !verification.claim) return verification.claim;

	const proofs = coverage.passes.filter(hasVerificationProof);
	const liveNodes = new Set(proofs.flatMap((pass) => pass.liveNodesExecuted));
	const simulatedNodes = [
		...new Map(
			[...proofs.flatMap((pass) => pass.simulatedNodes), ...verification.claim.simulatedNodes]
				.filter((node) => !liveNodes.has(node.nodeName))
				.map((node) => [node.nodeName, node]),
		).values(),
	];
	const unprovenTargets = [
		...proofs.flatMap((pass) => pass.unprovenTargets),
		...verification.claim.unprovenTargets,
	].filter((name) => !liveNodes.has(name));
	const knownNodes = new Set([...liveNodes, ...simulatedNodes.map((node) => node.nodeName)]);

	return deriveVerificationClaim({
		analysis: {
			success: verification.success,
			nodesNotReached: coverage.nodesNotReached,
			reachedSimulatedNodes: simulatedNodes,
			workflowPinnedNodeNames: [
				...new Set([
					...proofs.flatMap((pass) => pass.pinnedNodes),
					...verification.claim.pinnedNodes,
				]),
			].filter((name) => !liveNodes.has(name)),
		},
		plannedNodeCount: outcome.nodeSimulationPlan?.length ?? 0,
		fixTargetNodeNames: unprovenTargets,
		// Reachability-only records cannot establish live verification evidence.
		pendingTriggers: [
			...coverage.pendingTriggers,
			...(outcome.triggerNodes ?? [])
				.filter((trigger) => {
					const pass = outcome.verificationProgress?.[trigger.nodeName];
					return (
						pass &&
						(Array.isArray(pass) || pass.nodesExecuted.some((name) => !knownNodes.has(name)))
					);
				})
				.map((trigger) => trigger.nodeName),
		],
	});
}
