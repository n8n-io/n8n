import type {
	PromotionAppliedMove,
	PromotionCredentialGrant,
	PromotionCredentialMove,
	PromotionKeptProject,
	PromotionKeptWorkflow,
	PromotionPlaceholderResult,
} from '@n8n/api-types';

import type { AppliedResult } from './promotions.types';

/**
 * What an Apply did apart from the import: placeholders, grants, moves and kept items. The
 * result page lists them, because a person must finish some of them by hand.
 */
export type ApplyOutcome = {
	placeholders: PromotionPlaceholderResult[];
	grants: PromotionCredentialGrant[];
	credentialsMoved: PromotionCredentialMove[];
	credentialsNotMoved: PromotionCredentialMove[];
	keptWorkflows: PromotionKeptWorkflow[];
	keptProjects: PromotionKeptProject[];
	/** The workflows and folders that the Apply moved between two team projects. */
	moves: PromotionAppliedMove[];
	/** The references that stay unresolved after an incomplete Apply. */
	unresolvedCount: number;
};

export function applyOutcome(result: AppliedResult): ApplyOutcome {
	const credentialMoves = result.credentialMoves ?? [];
	return {
		placeholders: result.placeholders ?? [],
		grants: result.grants ?? [],
		credentialsMoved: credentialMoves.filter(({ allowed }) => allowed),
		credentialsNotMoved: credentialMoves.filter(({ allowed }) => !allowed),
		keptWorkflows: result.keptWorkflows ?? [],
		keptProjects: result.keptProjects ?? [],
		moves: result.moves ?? [],
		// A reference to a credential that got a placeholder binds to the placeholder.
		unresolvedCount: (result.dependencyReport?.gaps ?? []).filter(({ placeholder }) => !placeholder)
			.length,
	};
}

/** True when the result holds something that the toast of the Apply cannot say. */
/** True when a person must still do something: enter values, or apply again with more rights. */
export function needsFollowUp(outcome: ApplyOutcome): boolean {
	return (
		outcome.placeholders.length > 0 ||
		outcome.credentialsNotMoved.length > 0 ||
		outcome.unresolvedCount > 0 ||
		outcome.moves.some((move) => !!move.unpublished)
	);
}

export function hasApplyOutcome(result: AppliedResult): boolean {
	const outcome = applyOutcome(result);
	return (
		outcome.placeholders.length > 0 ||
		outcome.grants.length > 0 ||
		outcome.credentialsMoved.length > 0 ||
		outcome.credentialsNotMoved.length > 0 ||
		outcome.keptWorkflows.length > 0 ||
		outcome.keptProjects.length > 0 ||
		outcome.moves.length > 0 ||
		outcome.unresolvedCount > 0
	);
}
