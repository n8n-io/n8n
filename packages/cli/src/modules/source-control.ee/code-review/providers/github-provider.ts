import type { ReviewFileStatus } from '@n8n/api-types';
import { OperationalError, UserError } from 'n8n-workflow';

import type {
	CodeReviewProvider,
	CreatePullRequest,
	CreatePullRequestReviewComment,
	PullRequestFile,
	PullRequestMergeResult,
	PullRequestReviewComment,
	PullRequestReviewStateEntry,
	PullRequestReviewSubmission,
	PullRequestSummary,
	SubmitPullRequestReview,
} from '../code-review-provider';

interface GitHubProviderOptions {
	apiBaseUrl: string;
	token: string;
	owner: string;
	repo: string;
}

/** Describes what a request is doing, so a 401/403 can name the action + needed permission. */
interface RequestContext {
	action: string;
	permission?: string;
	/** When true, 401/403 are returned instead of throwing (e.g. GET /user with app tokens). */
	allowForbidden?: boolean;
}

const PR_READ = 'Pull requests: Read';
const PR_WRITE = 'Pull requests: Read and write';
const CONTENTS_READ = 'Contents: Read';

const READ_PRS: RequestContext = { action: 'read pull requests', permission: PR_READ };

interface GitHubPullRequest {
	// eslint-disable-next-line id-denylist -- mirrors the GitHub API response field
	number: number;
	title: string;
	html_url: string;
	draft: boolean;
	created_at: string;
	updated_at: string;
	user?: { login: string };
	head: { ref: string; sha: string };
	base: { ref: string; sha: string };
}

interface GitHubPullRequestFile {
	filename: string;
	status: string;
}

interface GitHubContent {
	content?: string;
	encoding?: string;
}

interface GitHubReviewComment {
	id: number;
	body: string;
	path: string;
	line: number | null;
	side: 'LEFT' | 'RIGHT';
	subject_type?: 'line' | 'file';
	html_url: string;
	user?: { login: string };
	created_at: string;
	updated_at: string;
	in_reply_to_id?: number;
}

interface GitHubPullRequestReview {
	id: number;
	body: string;
	html_url: string;
	state: 'PENDING' | 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'DISMISSED';
	submitted_at: string;
	user?: { login: string };
}

interface GitHubPullRequestMergeResult {
	sha?: string;
	merged: boolean;
	message: string;
}

interface GitHubUser {
	login?: string;
}

const NORMALIZED_STATUS: Record<string, ReviewFileStatus> = {
	added: 'added',
	copied: 'added',
	removed: 'removed',
	modified: 'modified',
	changed: 'modified',
	renamed: 'renamed',
};

export class GitHubProvider implements CodeReviewProvider {
	readonly id = 'github' as const;

	private readonly apiBaseUrl: string;

	private readonly token: string;

	private readonly owner: string;

	private readonly repo: string;

	constructor(options: GitHubProviderOptions) {
		this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '');
		this.token = options.token;
		this.owner = options.owner;
		this.repo = options.repo;
	}

	private get repoPath(): string {
		return `repos/${this.owner}/${this.repo}`;
	}

	private async request<T>(
		pathAndQuery: string,
		init?: RequestInit,
		ctx?: RequestContext,
	): Promise<{ status: number; body: T }> {
		const url = `${this.apiBaseUrl}/${pathAndQuery}`;
		let response: Response;
		try {
			response = await fetch(url, {
				...init,
				/* eslint-disable @typescript-eslint/naming-convention -- HTTP header names */
				headers: {
					Authorization: `Bearer ${this.token}`,
					Accept: 'application/vnd.github+json',
					'X-GitHub-Api-Version': '2022-11-28',
					'User-Agent': 'n8n',
					...(init?.body ? { 'Content-Type': 'application/json' } : {}),
					...init?.headers,
				},
				/* eslint-enable @typescript-eslint/naming-convention */
			});
		} catch (error) {
			throw new OperationalError('Failed to reach GitHub API', { cause: error });
		}

		const action = ctx?.action ?? 'access GitHub';
		// 401 = the credential itself is invalid/expired; 403 = authenticated but lacking the
		// permission for this specific action (the common "reads work, writes 403" case).
		if ((response.status === 401 || response.status === 403) && ctx?.allowForbidden) {
			const body = (await response.json().catch(() => ({}))) as T;
			return { status: response.status, body };
		}
		if (response.status === 401) {
			throw new UserError(
				`GitHub rejected the credentials while trying to ${action} (401). The access token or GitHub App key is invalid or has expired.`,
			);
		}
		if (response.status === 403) {
			const permissionHint = ctx?.permission
				? ` This requires the "${ctx.permission}" permission — update your token or GitHub App and, for a GitHub App, accept the permission change on the installation.`
				: '';
			throw new UserError(
				`GitHub denied permission while trying to ${action} (403).${permissionHint}`,
			);
		}
		if (response.status >= 500) {
			throw new OperationalError(`GitHub API returned ${response.status}`);
		}

		const body = (await response.json().catch(() => ({}))) as T;
		return { status: response.status, body };
	}

	private toReviewComment(comment: GitHubReviewComment): PullRequestReviewComment {
		const subjectType = comment.subject_type ?? (comment.line ? 'line' : 'file');
		return {
			id: comment.id,
			body: comment.body,
			path: comment.path,
			line: comment.line ?? undefined,
			side: comment.side,
			subjectType,
			url: comment.html_url,
			author: comment.user?.login,
			createdAt: comment.created_at,
			updatedAt: comment.updated_at,
			inReplyToId: comment.in_reply_to_id,
		};
	}

	private toReviewSubmission(review: GitHubPullRequestReview): PullRequestReviewSubmission {
		return {
			id: review.id,
			body: review.body,
			url: review.html_url,
			state: review.state,
			author: review.user?.login,
			submittedAt: review.submitted_at,
		};
	}

	private toSummary(pr: GitHubPullRequest): PullRequestSummary {
		return {
			provider: this.id,
			prNumber: pr.number,
			title: pr.title,
			url: pr.html_url,
			author: pr.user?.login,
			isDraft: pr.draft,
			sourceBranch: pr.head.ref,
			targetBranch: pr.base.ref,
			baseSha: pr.base.sha,
			headSha: pr.head.sha,
			createdAt: pr.created_at,
			updatedAt: pr.updated_at,
		};
	}

	async listOpenPullRequests(targetBranch: string): Promise<PullRequestSummary[]> {
		const base = encodeURIComponent(targetBranch);
		const { body } = await this.request<GitHubPullRequest[]>(
			`${this.repoPath}/pulls?state=open&base=${base}&per_page=100`,
			undefined,
			READ_PRS,
		);
		if (!Array.isArray(body)) return [];
		return body.map((pr) => this.toSummary(pr));
	}

	async getPullRequest(prNumber: number): Promise<PullRequestSummary> {
		const { status, body } = await this.request<GitHubPullRequest>(
			`${this.repoPath}/pulls/${prNumber}`,
			undefined,
			READ_PRS,
		);
		if (status === 404) {
			throw new UserError(`Pull request #${prNumber} was not found`);
		}
		return this.toSummary(body);
	}

	async listFiles(prNumber: number): Promise<PullRequestFile[]> {
		const { body } = await this.request<GitHubPullRequestFile[]>(
			`${this.repoPath}/pulls/${prNumber}/files?per_page=100`,
			undefined,
			READ_PRS,
		);
		if (!Array.isArray(body)) return [];
		return body.map((file) => ({
			path: file.filename,
			status: NORMALIZED_STATUS[file.status] ?? 'modified',
		}));
	}

	async getFileAtRef(filePath: string, ref: string): Promise<string | null> {
		const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
		const { status, body } = await this.request<GitHubContent>(
			`${this.repoPath}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
			undefined,
			{ action: 'read repository contents', permission: CONTENTS_READ },
		);
		// File absent at this ref (e.g. added/removed in the PR).
		if (status === 404) return null;
		if (body.encoding === 'base64' && body.content) {
			return Buffer.from(body.content, 'base64').toString('utf8');
		}
		return null;
	}

	async listReviewComments(prNumber: number): Promise<PullRequestReviewComment[]> {
		const { body } = await this.request<GitHubReviewComment[]>(
			`${this.repoPath}/pulls/${prNumber}/comments?per_page=100`,
			undefined,
			READ_PRS,
		);
		if (!Array.isArray(body)) return [];
		return body.map((comment) => this.toReviewComment(comment));
	}

	async createReviewComment(
		prNumber: number,
		comment: CreatePullRequestReviewComment,
	): Promise<PullRequestReviewComment> {
		const payload = comment.inReplyToId
			? { body: comment.body, in_reply_to: comment.inReplyToId }
			: comment.subjectType === 'file'
				? {
						body: comment.body,
						commit_id: comment.commitId,
						path: comment.path,
						subject_type: 'file',
					}
				: {
						body: comment.body,
						commit_id: comment.commitId,
						path: comment.path,
						line: comment.line,
						side: comment.side,
					};

		const { status, body } = await this.request<GitHubReviewComment>(
			`${this.repoPath}/pulls/${prNumber}/comments`,
			{
				method: 'POST',
				body: JSON.stringify(payload),
			},
			{ action: 'add a review comment', permission: PR_WRITE },
		);
		if (status === 422) {
			throw new UserError(
				comment.subjectType === 'file'
					? 'GitHub could not add a file comment to this pull request.'
					: 'GitHub could not place the comment on that line. Try commenting on a changed line in the pull request diff.',
			);
		}
		if (status >= 400) {
			throw new UserError('Failed to create pull request review comment on GitHub.');
		}
		return this.toReviewComment(body);
	}

	async deleteReviewComment(commentId: number): Promise<void> {
		const { status } = await this.request<Record<string, never>>(
			`${this.repoPath}/pulls/comments/${commentId}`,
			{ method: 'DELETE' },
			{ action: 'delete a review comment', permission: PR_WRITE },
		);
		if (status === 404) {
			throw new UserError('Pull request review comment was not found.');
		}
		if (status >= 400) {
			throw new UserError('Failed to delete pull request review comment on GitHub.');
		}
	}

	private formatReviewErrorMessage(responseBody: unknown, fallback: string): string {
		if (
			typeof responseBody === 'object' &&
			responseBody !== null &&
			'message' in responseBody &&
			typeof responseBody.message === 'string'
		) {
			const message = responseBody.message.trim();
			if (message.length > 0) return message;
		}
		return fallback;
	}

	private async tryGetAuthenticatedLogin(): Promise<string | undefined> {
		// Installation tokens cannot call GET /user — callers must fall back to other signals.
		const { status, body } = await this.request<GitHubUser>('user', undefined, {
			action: 'resolve the authenticated GitHub user',
			allowForbidden: true,
		});
		if (status >= 400) return undefined;
		return body.login;
	}

	private async inferActingLoginFromRecentComments(prNumber: number): Promise<string | undefined> {
		const comments = await this.listReviewComments(prNumber);
		if (comments.length === 0) return undefined;

		const mostRecent = [...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
		return mostRecent.author;
	}

	private async findPendingReviewId(prNumber: number, login?: string): Promise<number | null> {
		const { body } = await this.request<GitHubPullRequestReview[]>(
			`${this.repoPath}/pulls/${prNumber}/reviews?per_page=100`,
			undefined,
			READ_PRS,
		);
		if (!Array.isArray(body)) return null;

		const pendingReviews = body.filter((review) => review.state === 'PENDING');
		if (pendingReviews.length === 0) return null;

		const matchLogin = (candidate?: string) =>
			candidate
				? (pendingReviews.find((review) => review.user?.login === candidate)?.id ?? null)
				: null;

		const byKnownLogin = matchLogin(login);
		if (byKnownLogin) return byKnownLogin;

		// GitHub App installation tokens cannot resolve GET /user — use the sole pending review.
		if (pendingReviews.length === 1) {
			return pendingReviews[0].id;
		}

		const inferredLogin = await this.inferActingLoginFromRecentComments(prNumber);
		return matchLogin(inferredLogin);
	}

	private async submitPendingPullRequestReview(
		prNumber: number,
		reviewId: number,
		review: SubmitPullRequestReview,
	): Promise<PullRequestReviewSubmission> {
		const { status, body } = await this.request<GitHubPullRequestReview>(
			`${this.repoPath}/pulls/${prNumber}/reviews/${reviewId}/events`,
			{
				method: 'POST',
				body: JSON.stringify({
					body: review.body ?? '',
					event: review.event,
				}),
			},
			{ action: 'submit a review', permission: PR_WRITE },
		);
		if (status === 422) {
			throw new UserError(
				this.formatReviewErrorMessage(
					body,
					'GitHub could not submit the pull request review. You may already have submitted a review on this pull request.',
				),
			);
		}
		if (status >= 400) {
			throw new UserError('Failed to submit pull request review on GitHub.');
		}
		return this.toReviewSubmission(body);
	}

	private async createPullRequestReview(
		prNumber: number,
		review: SubmitPullRequestReview,
	): Promise<{ status: number; body: GitHubPullRequestReview }> {
		const { status, body } = await this.request<GitHubPullRequestReview>(
			`${this.repoPath}/pulls/${prNumber}/reviews`,
			{
				method: 'POST',
				body: JSON.stringify({
					commit_id: review.commitId,
					body: review.body ?? '',
					event: review.event,
				}),
			},
			{ action: 'submit a review', permission: PR_WRITE },
		);
		return { status, body };
	}

	async submitPullRequestReview(
		prNumber: number,
		review: SubmitPullRequestReview,
	): Promise<PullRequestReviewSubmission> {
		const login = await this.tryGetAuthenticatedLogin();
		const pendingReviewId = await this.findPendingReviewId(prNumber, login);

		if (pendingReviewId) {
			return await this.submitPendingPullRequestReview(prNumber, pendingReviewId, review);
		}

		const created = await this.createPullRequestReview(prNumber, review);
		if (created.status < 400) {
			return this.toReviewSubmission(created.body);
		}

		if (created.status === 422) {
			const retryPendingReviewId = await this.findPendingReviewId(prNumber, login);
			if (retryPendingReviewId) {
				return await this.submitPendingPullRequestReview(prNumber, retryPendingReviewId, review);
			}
			throw new UserError(
				this.formatReviewErrorMessage(
					created.body,
					'GitHub could not submit the pull request review.',
				),
			);
		}

		throw new UserError('Failed to submit pull request review on GitHub.');
	}

	async listPullRequestReviews(prNumber: number): Promise<PullRequestReviewStateEntry[]> {
		const { body } = await this.request<GitHubPullRequestReview[]>(
			`${this.repoPath}/pulls/${prNumber}/reviews?per_page=100`,
			undefined,
			READ_PRS,
		);
		if (!Array.isArray(body)) return [];
		return body.map((review) => ({
			author: review.user?.login,
			state: review.state,
			submittedAt: review.submitted_at,
		}));
	}

	async createPullRequest(request: CreatePullRequest): Promise<PullRequestSummary> {
		const { status, body } = await this.request<GitHubPullRequest>(
			`${this.repoPath}/pulls`,
			{
				method: 'POST',
				body: JSON.stringify({
					title: request.title,
					body: request.body ?? '',
					head: request.headBranch,
					base: request.baseBranch,
				}),
			},
			{ action: 'create a pull request', permission: PR_WRITE },
		);
		if (status === 422) {
			throw new UserError(
				'GitHub could not create the pull request. The branch may already have an open pull request.',
			);
		}
		if (status >= 400) {
			throw new UserError('Failed to create pull request on GitHub.');
		}
		return this.toSummary(body);
	}

	async mergePullRequest(prNumber: number): Promise<PullRequestMergeResult> {
		const { status, body } = await this.request<GitHubPullRequestMergeResult>(
			`${this.repoPath}/pulls/${prNumber}/merge`,
			{
				method: 'PUT',
				body: JSON.stringify({}),
			},
			{ action: 'merge a pull request', permission: PR_WRITE },
		);
		if (status === 405) {
			throw new UserError('This pull request is not mergeable.');
		}
		if (status === 409) {
			throw new UserError('This pull request cannot be merged due to a conflict.');
		}
		if (status === 422) {
			throw new UserError(
				body.message ||
					'GitHub could not merge this pull request. It may require additional approvals or checks.',
			);
		}
		if (status >= 400) {
			throw new UserError('Failed to merge pull request on GitHub.');
		}
		return {
			merged: body.merged,
			sha: body.sha,
			message: body.message,
		};
	}
}
