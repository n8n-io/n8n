import type { WorkflowReviewDecisionIneligibilityReason } from '@n8n/api-types';

/** The facts a decision verdict is derived from, resolved by the caller. */
export interface WorkflowReviewDecisionFacts {
	/**
	 * Reading every workflow the review covers is the floor for deciding it. A
	 * decision applies to all of them, and no workflow on a review outranks another.
	 */
	canReadEveryWorkflow: boolean;
	isAuthor: boolean;
	isAssignedReviewer: boolean;
	hasAdminOverride: boolean;
}

export type WorkflowReviewDecisionCapability =
	| { allowed: true }
	| { allowed: false; reason: WorkflowReviewDecisionIneligibilityReason };

const ALLOWED: WorkflowReviewDecisionCapability = { allowed: true };

/**
 * Who may decide a review. The one rule behind two presentations: `decide()`
 * turns a refusal into a 403 or a hiding 404, the detail read turns it into
 * `viewerCanDecide` plus a reason.
 *
 * Assigned reviewers (or admins) may decide, including after they submit or sync
 * a version. Non-reviewer authors stay blocked unless an admin override applies.
 *
 * Answers "who", not "when": the request lifecycle is not an input, so callers
 * gate on `state`/`decision` separately.
 */
export function resolveDecisionCapability(
	facts: WorkflowReviewDecisionFacts,
): WorkflowReviewDecisionCapability {
	// Checked first so someone who cannot see every covered workflow hears about
	// the permission rather than about their authorship.
	if (!facts.canReadEveryWorkflow) {
		return { allowed: false, reason: 'missing_permission' };
	}

	if (facts.hasAdminOverride || facts.isAssignedReviewer) {
		return ALLOWED;
	}

	if (facts.isAuthor) {
		return { allowed: false, reason: 'author' };
	}

	return { allowed: false, reason: 'missing_reviewer_permission' };
}
