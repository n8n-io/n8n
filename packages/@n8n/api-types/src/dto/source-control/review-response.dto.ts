import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';

/** Provider hosting the pull/merge request. */
export type ReviewProviderId = 'github' | 'gitlab';

/** File change status within a pull/merge request, normalized across providers. */
export type ReviewFileStatus = 'added' | 'modified' | 'removed' | 'renamed';

/**
 * Minimal workflow snapshot extracted from a `workflows/<id>.json` file at a
 * specific git ref. Carries exactly the fields the visual diff needs.
 */
export interface ReviewWorkflowSnapshot {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	versionId?: string;
}

/** A changed workflow file in a pull/merge request (base vs head). */
export interface ReviewWorkflowFile {
	path: string;
	name: string;
	status: ReviewFileStatus;
	/** `null` when the workflow does not exist at the base ref (added). */
	baseWorkflow: ReviewWorkflowSnapshot | null;
	/** `null` when the workflow does not exist at the head ref (removed). */
	headWorkflow: ReviewWorkflowSnapshot | null;
}

/** Summary of an open pull/merge request targeting the connected branch. */
export interface SourceControlReviewSummary {
	provider: ReviewProviderId;
	/** GitHub PR number / GitLab MR iid. */
	prNumber: number;
	title: string;
	url: string;
	author?: string;
	isDraft: boolean;
	sourceBranch: string;
	targetBranch: string;
	createdAt: string;
	updatedAt: string;
	/** Number of changed workflow files; omitted when not computed. */
	workflowChangeCount?: number;
	/** Commit SHAs for diff sides; included on review detail responses. */
	baseSha?: string;
	headSha?: string;
	/** Whether the pull request has an active approval without pending change requests. */
	isApproved?: boolean;
}

/** Result of merging an approved pull request into the target branch. */
export interface SourceControlReviewDeployResult {
	merged: boolean;
	sha?: string;
	message: string;
}

/** A pull/merge request plus the visual diffs of its changed workflows. */
export interface SourceControlReviewDetail {
	pullRequest: SourceControlReviewSummary;
	workflows: ReviewWorkflowFile[];
}
