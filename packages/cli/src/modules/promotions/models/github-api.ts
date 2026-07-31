import { jsonParse, UnexpectedError } from 'n8n-workflow';

const API_BASE = 'https://api.github.com';

/**
 * Label emulating GitHub's native draft state on plans where private repos
 * don't support draft PRs (creation fails with a 422; we fall back to an
 * open PR carrying this label).
 */
export const DRAFT_FALLBACK_LABEL = 'n8n-draft';

/**
 * Marker for the single-identity fallback: when both instances share one
 * GitHub identity, a real PR approval is impossible (authors cannot approve
 * their own PRs), so the destination records its approval as a comment
 * carrying this marker instead.
 */
export const DESTINATION_APPROVAL_MARKER = '<!-- n8n-promotion:destination-approved -->';

export interface GithubTarget {
	owner: string;
	repo: string;
	token: string;
}

export class GithubApiError extends UnexpectedError {
	constructor(
		readonly status: number,
		readonly body: string,
		path: string,
	) {
		super(`GitHub API ${path} responded with ${status}: ${body.slice(0, 300)}`);
	}
}

/** GitHub rejected the review because the acting token authored the PR. */
export class SelfApprovalError extends UnexpectedError {
	constructor() {
		super('GitHub rejected the approval because this identity authored the pull request');
	}
}

export interface PullRequestInfo {
	prNumber: number;
	nodeId: string;
	url: string;
	state: 'open' | 'closed';
	/** Draft in the promotion sense: natively draft OR carrying the fallback label. */
	draft: boolean;
	nativeDraft: boolean;
	merged: boolean;
	baseBranch: string;
	headBranch: string;
	labels: string[];
}

interface RawPullRequest {
	number: number;
	node_id: string;
	html_url: string;
	state: 'open' | 'closed';
	draft?: boolean;
	merged?: boolean;
	base: { ref: string };
	head: { ref: string };
	labels?: Array<{ name: string }>;
}

interface RawReview {
	state: string;
	user: { login: string } | null;
}

interface RawComment {
	body?: string;
}

/** Minimal fetch-based GitHub client for the github-review promotion model. */
export class GithubApi {
	constructor(private readonly target: GithubTarget) {}

	private get repoPath() {
		return `${this.target.owner}/${this.target.repo}`;
	}

	/** HTTPS remote with the token inlined; used only transiently by withRepo clones. */
	get cloneUrl(): string {
		return `https://x-access-token:${this.target.token}@github.com/${this.repoPath}.git`;
	}

	private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const response = await fetch(`${API_BASE}${path}`, {
			method,
			headers: {
				authorization: `Bearer ${this.target.token}`,
				accept: 'application/vnd.github+json',
				'x-github-api-version': '2022-11-28',
				...(body === undefined ? {} : { 'content-type': 'application/json' }),
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const text = await response.text();
		if (!response.ok) throw new GithubApiError(response.status, text, `${method} ${path}`);
		return jsonParse<T>(text || 'null');
	}

	private async graphql(query: string, variables: Record<string, unknown>): Promise<void> {
		const result = await this.request<{ errors?: Array<{ message: string }> }>('POST', '/graphql', {
			query,
			variables,
		});
		if (result?.errors?.length) {
			throw new UnexpectedError(`GitHub GraphQL error: ${result.errors[0].message}`);
		}
	}

	private toInfo(raw: RawPullRequest): PullRequestInfo {
		const labels = (raw.labels ?? []).map((label) => label.name);
		const nativeDraft = raw.draft === true;
		return {
			prNumber: raw['number'],
			nodeId: raw.node_id,
			url: raw.html_url,
			state: raw.state,
			nativeDraft,
			draft: nativeDraft || labels.includes(DRAFT_FALLBACK_LABEL),
			merged: raw.merged === true,
			baseBranch: raw.base.ref,
			headBranch: raw.head.ref,
			labels,
		};
	}

	async createDraftPullRequest(params: {
		title: string;
		body: string;
		head: string;
		base: string;
	}): Promise<PullRequestInfo> {
		try {
			const raw = await this.request<RawPullRequest>('POST', `/repos/${this.repoPath}/pulls`, {
				...params,
				draft: true,
			});
			return this.toInfo(raw);
		} catch (error) {
			// Private repos on some plans reject drafts; emulate with a label
			const draftUnsupported =
				error instanceof GithubApiError && error.status === 422 && /draft/i.test(error.body);
			if (!draftUnsupported) throw error;
		}
		const raw = await this.request<RawPullRequest>('POST', `/repos/${this.repoPath}/pulls`, params);
		await this.request('POST', `/repos/${this.repoPath}/issues/${raw['number']}/labels`, {
			labels: [DRAFT_FALLBACK_LABEL],
		});
		return this.toInfo({ ...raw, labels: [{ name: DRAFT_FALLBACK_LABEL }] });
	}

	async getPullRequest(prNumber: number): Promise<PullRequestInfo> {
		return this.toInfo(
			await this.request<RawPullRequest>('GET', `/repos/${this.repoPath}/pulls/${prNumber}`),
		);
	}

	async listOpenPullRequests(base: string): Promise<PullRequestInfo[]> {
		const raw = await this.request<RawPullRequest[]>(
			'GET',
			`/repos/${this.repoPath}/pulls?state=open&per_page=100&base=${encodeURIComponent(base)}`,
		);
		return raw.map((pr) => this.toInfo(pr));
	}

	async markReadyForReview(pr: PullRequestInfo): Promise<void> {
		if (pr.labels.includes(DRAFT_FALLBACK_LABEL)) {
			await this.request(
				'DELETE',
				`/repos/${this.repoPath}/issues/${pr.prNumber}/labels/${DRAFT_FALLBACK_LABEL}`,
			);
		}
		if (pr.nativeDraft) {
			// The REST API cannot undraft a PR; only the GraphQL mutation can
			await this.graphql(
				'mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { pullRequest { isDraft } } }',
				{ id: pr.nodeId },
			);
		}
	}

	async approve(prNumber: number): Promise<void> {
		try {
			await this.request('POST', `/repos/${this.repoPath}/pulls/${prNumber}/reviews`, {
				event: 'APPROVE',
			});
		} catch (error) {
			if (
				error instanceof GithubApiError &&
				error.status === 422 &&
				/own pull request/i.test(error.body)
			) {
				throw new SelfApprovalError();
			}
			throw error;
		}
	}

	/** True when the latest review of any user is an approval, or the fallback marker comment exists. */
	async hasDestinationApproval(prNumber: number): Promise<boolean> {
		const reviews = await this.request<RawReview[]>(
			'GET',
			`/repos/${this.repoPath}/pulls/${prNumber}/reviews?per_page=100`,
		);
		const latestByUser = new Map<string, string>();
		for (const review of reviews) {
			if (!review.user) continue;
			if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) {
				latestByUser.set(review.user.login, review.state);
			}
		}
		if ([...latestByUser.values()].includes('APPROVED')) return true;

		const comments = await this.request<RawComment[]>(
			'GET',
			`/repos/${this.repoPath}/issues/${prNumber}/comments?per_page=100`,
		);
		return comments.some((comment) => comment.body?.includes(DESTINATION_APPROVAL_MARKER));
	}

	async commentDestinationApproval(prNumber: number): Promise<void> {
		await this.request('POST', `/repos/${this.repoPath}/issues/${prNumber}/comments`, {
			body: `${DESTINATION_APPROVAL_MARKER}\nApproved by the destination n8n instance (single-identity fallback — a real PR review was rejected because both instances share one GitHub identity).`,
		});
	}

	async merge(prNumber: number): Promise<void> {
		await this.request('PUT', `/repos/${this.repoPath}/pulls/${prNumber}/merge`, {});
	}

	async getFileText(path: string, ref: string): Promise<string> {
		const file = await this.request<{ content?: string }>(
			'GET',
			`/repos/${this.repoPath}/contents/${path}?ref=${encodeURIComponent(ref)}`,
		);
		if (!file.content) {
			throw new UnexpectedError(`GitHub contents API returned no content for "${path}"`);
		}
		return Buffer.from(file.content, 'base64').toString('utf-8');
	}
}
