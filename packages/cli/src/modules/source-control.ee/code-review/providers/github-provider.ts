import type { ReviewFileStatus } from '@n8n/api-types';
import { OperationalError, UserError } from 'n8n-workflow';

import type {
	CodeReviewProvider,
	CreatePullRequestReviewComment,
	PullRequestFile,
	PullRequestReviewComment,
	PullRequestSummary,
} from '../code-review-provider';

interface GitHubProviderOptions {
	apiBaseUrl: string;
	token: string;
	owner: string;
	repo: string;
}

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
	html_url: string;
	user?: { login: string };
	created_at: string;
	updated_at: string;
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

		if (response.status === 401 || response.status === 403) {
			throw new UserError(
				'GitHub rejected the access token. Check the token has pull request read/write access and has not expired.',
			);
		}
		if (response.status >= 500) {
			throw new OperationalError(`GitHub API returned ${response.status}`);
		}

		const body = (await response.json().catch(() => ({}))) as T;
		return { status: response.status, body };
	}

	private toReviewComment(comment: GitHubReviewComment): PullRequestReviewComment {
		return {
			id: comment.id,
			body: comment.body,
			path: comment.path,
			line: comment.line ?? 0,
			side: comment.side,
			url: comment.html_url,
			author: comment.user?.login,
			createdAt: comment.created_at,
			updatedAt: comment.updated_at,
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
		);
		if (!Array.isArray(body)) return [];
		return body.map((pr) => this.toSummary(pr));
	}

	async getPullRequest(prNumber: number): Promise<PullRequestSummary> {
		const { status, body } = await this.request<GitHubPullRequest>(
			`${this.repoPath}/pulls/${prNumber}`,
		);
		if (status === 404) {
			throw new UserError(`Pull request #${prNumber} was not found`);
		}
		return this.toSummary(body);
	}

	async listFiles(prNumber: number): Promise<PullRequestFile[]> {
		const { body } = await this.request<GitHubPullRequestFile[]>(
			`${this.repoPath}/pulls/${prNumber}/files?per_page=100`,
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
		);
		if (!Array.isArray(body)) return [];
		return body.map((comment) => this.toReviewComment(comment));
	}

	async createReviewComment(
		prNumber: number,
		comment: CreatePullRequestReviewComment,
	): Promise<PullRequestReviewComment> {
		const { status, body } = await this.request<GitHubReviewComment>(
			`${this.repoPath}/pulls/${prNumber}/comments`,
			{
				method: 'POST',
				body: JSON.stringify({
					body: comment.body,
					commit_id: comment.commitId,
					path: comment.path,
					line: comment.line,
					side: comment.side,
				}),
			},
		);
		if (status === 422) {
			throw new UserError(
				'GitHub could not place the comment on that line. Try commenting on a changed line in the pull request diff.',
			);
		}
		if (status >= 400) {
			throw new UserError('Failed to create pull request review comment on GitHub.');
		}
		return this.toReviewComment(body);
	}
}
