import type { ReviewFileStatus, ReviewProviderId } from '@n8n/api-types';

/** Summary of an open pull/merge request as returned by a provider. */
export interface PullRequestSummary {
	provider: ReviewProviderId;
	/** GitHub PR number / GitLab MR iid. */
	prNumber: number;
	title: string;
	url: string;
	author?: string;
	isDraft: boolean;
	sourceBranch: string;
	targetBranch: string;
	/** Commit SHA the PR is merging into (diff base). */
	baseSha: string;
	/** Commit SHA at the tip of the PR branch (diff head). */
	headSha: string;
	createdAt: string;
	updatedAt: string;
}

/** A single changed file within a pull/merge request. */
export interface PullRequestFile {
	path: string;
	status: ReviewFileStatus;
}

export type PullRequestCommentSide = 'LEFT' | 'RIGHT';

export type PullRequestCommentSubjectType = 'line' | 'file';

/** A review comment on a pull/merge request diff. */
export interface PullRequestReviewComment {
	id: number;
	body: string;
	path: string;
	line?: number;
	side: PullRequestCommentSide;
	subjectType: PullRequestCommentSubjectType;
	url: string;
	author?: string;
	createdAt: string;
	updatedAt: string;
	inReplyToId?: number;
}

export interface CreatePullRequestReviewComment {
	body: string;
	path?: string;
	line?: number;
	side?: PullRequestCommentSide;
	commitId?: string;
	inReplyToId?: number;
	subjectType?: PullRequestCommentSubjectType;
}

export type PullRequestReviewEvent = 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';

export interface SubmitPullRequestReview {
	body?: string;
	event: PullRequestReviewEvent;
	commitId?: string;
}

export interface PullRequestReviewSubmission {
	id: number;
	url: string;
	state: string;
	body: string;
	author?: string;
	submittedAt: string;
}

export type PullRequestReviewState =
	| 'PENDING'
	| 'COMMENTED'
	| 'APPROVED'
	| 'CHANGES_REQUESTED'
	| 'DISMISSED';

export interface PullRequestReviewStateEntry {
	author?: string;
	state: PullRequestReviewState;
	submittedAt: string;
}

export interface CreatePullRequest {
	title: string;
	body?: string;
	headBranch: string;
	baseBranch: string;
}

export interface PullRequestMergeResult {
	merged: boolean;
	sha?: string;
	message: string;
}

/**
 * Platform-agnostic access to a git host's code-review API
 * (GitHub PRs, GitLab MRs, ...). Implementations translate provider responses
 * into the normalized shapes above.
 */
export interface CodeReviewProvider {
	readonly id: ReviewProviderId;

	/** List open pull/merge requests targeting `targetBranch`. */
	listOpenPullRequests(targetBranch: string): Promise<PullRequestSummary[]>;

	/** Fetch a single pull/merge request by number/iid. */
	getPullRequest(prNumber: number): Promise<PullRequestSummary>;

	/** List changed files in a pull/merge request. */
	listFiles(prNumber: number): Promise<PullRequestFile[]>;

	/** Raw file content at a git ref, or `null` if the file is absent there. */
	getFileAtRef(filePath: string, ref: string): Promise<string | null>;

	/** Line-level review comments on the pull request diff. */
	listReviewComments(prNumber: number): Promise<PullRequestReviewComment[]>;

	createReviewComment(
		prNumber: number,
		comment: CreatePullRequestReviewComment,
	): Promise<PullRequestReviewComment>;

	deleteReviewComment(commentId: number): Promise<void>;

	submitPullRequestReview(
		prNumber: number,
		review: SubmitPullRequestReview,
	): Promise<PullRequestReviewSubmission>;

	listPullRequestReviews(prNumber: number): Promise<PullRequestReviewStateEntry[]>;

	createPullRequest(request: CreatePullRequest): Promise<PullRequestSummary>;

	mergePullRequest(prNumber: number): Promise<PullRequestMergeResult>;
}
