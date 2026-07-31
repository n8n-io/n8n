import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';

import type { WorkflowReviewInboxItem } from './list-workflow-review-inbox.dto';
import type { Iso8601DateTimeString } from '../../datetime';

/** Immutable content of one workflow-history version, as needed by the diff surface. */
export interface WorkflowReviewVersionSnapshot {
	versionId: string;
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

export interface WorkflowReviewRequestDetail extends WorkflowReviewInboxItem {
	description: string | null;
	workflows: WorkflowReviewRequestWorkflowDetail[];
}
