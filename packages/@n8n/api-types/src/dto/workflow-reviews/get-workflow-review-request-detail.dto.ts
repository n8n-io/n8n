import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';

import type { WorkflowReviewInboxItem } from './list-workflow-review-inbox.dto';
import type { Iso8601DateTimeString } from '../../datetime';

/** Immutable content of one workflow-history version, as needed by the diff surface. */
export interface WorkflowReviewVersionSnapshot {
	versionId: string;
	name: string | null;
	nodes: INode[];
	connections: IConnections;
	nodeGroups: IWorkflowGroup[];
	createdAt: Iso8601DateTimeString;
}

export interface WorkflowReviewRequestWorkflowDetail {
	workflowId: string;
	workflowName: string;
	/** Pinned version id; null when the history entry was pruned (LIGO-879) */
	workflowVersionId: string | null;
	/** Content of the pinned version; null when the history row no longer exists */
	pinnedVersion: WorkflowReviewVersionSnapshot | null;
	/**
	 * Latest published version, resolved at read time; null = never published,
	 * i.e. the diff baseline is empty.
	 */
	baselineVersion: WorkflowReviewVersionSnapshot | null;
}

/**
 * Why the viewer cannot decide this review. Kept a closed union so the UI can
 * map reasons to copy; unknown future reasons should fall back to a generic
 * hint.
 */
export type WorkflowReviewDecisionIneligibilityReason = 'author' | 'missing_publish_permission';

export interface WorkflowReviewRequestDetail extends WorkflowReviewInboxItem {
	description: string | null;
	workflows: WorkflowReviewRequestWorkflowDetail[];
	/**
	 * Whether the viewer is eligible to decide, per the decision endpoint's
	 * authorization rules. Answers "who", not "when": it ignores the request
	 * lifecycle, so callers must gate on `state`/`decision` as well — a closed or
	 * already approved request is undecidable no matter who asks. Advisory
	 * snapshot; the endpoint re-checks on submission.
	 */
	viewerCanDecide: boolean;
	/** Set if `viewerCanDecide` is false. */
	viewerDecisionIneligibilityReason: WorkflowReviewDecisionIneligibilityReason | null;
	/** Not advisory, unlike `viewerCanDecide`: the comment endpoint applies the same verdict. */
	viewerCanComment: boolean;
}
