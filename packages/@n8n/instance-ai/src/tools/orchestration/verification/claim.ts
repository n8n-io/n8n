/**
 * Deterministic verification claim.
 *
 * The model narrates around this structure but never produces it: instruction
 * following degrades over a long thread, so the strength of the claim shown to
 * the user is computed from run evidence instead of asked for in a prompt.
 */

import type { VerificationAnalysis } from './analyze-result';
import type {
	VerificationClaim,
	VerificationClaimLevel,
	VerificationLiveState,
} from '../../../workflow-loop/workflow-loop-state';

/** Version pair that decides whether the verified draft is the version running. */
export interface VerificationPublishState {
	/** Published version, or null while the workflow is unpublished. */
	activeVersionId: string | null;
	/** Draft version the verification run executed. */
	draftVersionId: string;
}

export interface DeriveVerificationClaimArgs {
	analysis: Pick<
		VerificationAnalysis,
		'success' | 'nodesNotReached' | 'reachedSimulatedNodes' | 'workflowPinnedNodeNames'
	>;
	pendingTriggers?: string[];
	/** Planned nodes from the build outcome simulation plan. */
	plannedNodeCount: number;
	/**
	 * Nodes this change was about: the node a previous verdict sent for repair,
	 * or the failing node the user reported. Empty means no target-specific
	 * downgrade applies and coverage alone decides the level.
	 */
	fixTargetNodeNames?: readonly string[];
	/**
	 * Publish state read next to the run. Omitted when the lookup failed: an
	 * unknown state stays unknown rather than becoming a claim about production.
	 */
	publishState?: VerificationPublishState;
}

export function deriveVerificationClaim(args: DeriveVerificationClaimArgs): VerificationClaim {
	const { analysis, plannedNodeCount, fixTargetNodeNames = [], publishState } = args;
	const nodesNotReached = [...analysis.nodesNotReached];
	const simulatedNodes = [...analysis.reachedSimulatedNodes];

	const unproven = new Set([...nodesNotReached, ...simulatedNodes.map((n) => n.nodeName)]);
	const unprovenTargets = [...new Set(fixTargetNodeNames.filter((name) => unproven.has(name)))];

	const level = resolveLevel({
		success: analysis.success,
		hasUnreached: nodesNotReached.length > 0,
		hasSimulated: simulatedNodes.length > 0,
		hasUnprovenTarget: unprovenTargets.length > 0,
		hasPendingTrigger: (args.pendingTriggers?.length ?? 0) > 0,
	});

	return {
		level,
		plannedNodeCount,
		// Counted over the simulation plan, the same set `nodesNotReached` comes
		// from. `reachedNames` covers the whole run, and the plan skips mockable
		// triggers, so comparing the two produced counts like "2 of 1".
		reachedNodeCount: Math.max(plannedNodeCount - nodesNotReached.length, 0),
		nodesNotReached,
		simulatedNodes,
		pinnedNodes: [...analysis.workflowPinnedNodeNames],
		unprovenTargets,
		...(args.pendingTriggers ? { pendingTriggers: args.pendingTriggers } : {}),
		publishReady: level === 'verified',
		liveTestRecommended: level === 'partial' || level === 'unproven',
		...(publishState
			? {
					liveState: resolveLiveState(publishState),
					verifiedVersionId: publishState.draftVersionId,
				}
			: {}),
	};
}

function resolveLiveState(publishState: VerificationPublishState): VerificationLiveState {
	if (publishState.activeVersionId === null) return 'unpublished';
	// Every assistant write saves a draft without republishing, so a published
	// workflow whose active version is not the verified one keeps serving the
	// code this run did not test.
	return publishState.activeVersionId === publishState.draftVersionId
		? 'live-current'
		: 'live-stale';
}

function resolveLevel(facts: {
	success: boolean;
	hasUnreached: boolean;
	hasSimulated: boolean;
	hasUnprovenTarget: boolean;
	hasPendingTrigger: boolean;
}): VerificationClaimLevel {
	if (!facts.success) return 'failed';
	// A named target that never ran for real outranks overall coverage: the user
	// asked about that node, so a green run elsewhere does not answer them.
	if (facts.hasUnprovenTarget) return 'unproven';
	if (facts.hasUnreached || facts.hasSimulated || facts.hasPendingTrigger) return 'partial';
	return 'verified';
}
