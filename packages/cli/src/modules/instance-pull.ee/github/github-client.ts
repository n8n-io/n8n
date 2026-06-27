import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { type IDataObject, jsonParse } from 'n8n-workflow';

import { InstancePullConfig } from '../instance-pull.config';

const GITHUB_API_BASE = 'https://api.github.com';

export type PullRequestState = 'open' | 'closed';

export interface OpenPullRequestInput {
	head: string;
	base: string;
	title: string;
	body: string;
}

export interface PullRequestRef {
	prNumber: number;
	url: string;
}

export interface PullRequestDetails {
	prNumber: number;
	url: string;
	title: string;
	state: PullRequestState;
	merged: boolean;
	head: { ref: string; sha: string };
	base: { ref: string };
}

interface GitHubPullApiResponse {
	// eslint-disable-next-line id-denylist -- GitHub API response field name
	number: number;
	html_url: string;
	title: string;
	state: PullRequestState;
	merged?: boolean;
	merged_at?: string | null;
	head: { ref: string; sha: string };
	base: { ref: string };
}

/**
 * Minimal GitHub REST client for the instance-pull demo, built on `OutboundHttp`
 * (no octokit). Authenticates with a PAT via the legacy `Authorization: token`
 * header. In the CI-driven model n8n only needs to open/read PRs — the GitHub
 * Action owns the merge-blocking check and the binding comment.
 */
@Service()
export class GitHubClient {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly config: InstancePullConfig,
		private readonly logger: Logger,
		outboundHttp: OutboundHttp,
	) {
		// Fixed, well-known host (api.github.com).
		this.http = outboundHttp.requests({ ssrf: 'disabled' });
	}

	/**
	 * Open a PR from `head` into `base`, or return the existing open one for that
	 * head branch (idempotent — re-raising a review reuses the open PR).
	 */
	async openPullRequest(input: OpenPullRequestInput): Promise<PullRequestRef> {
		const existing = await this.findOpenPullRequestByHead(input.head);
		if (existing) {
			this.logger.debug(`[instance-pull] reusing open PR #${existing.prNumber} for ${input.head}`);
			return existing;
		}

		const created = await this.apiRequest<GitHubPullApiResponse>('POST', this.repoPath('/pulls'), {
			title: input.title,
			body: input.body,
			head: input.head,
			base: input.base,
		});

		return { prNumber: created.number, url: created.html_url };
	}

	async getPullRequest(prNumber: number): Promise<PullRequestDetails> {
		const pr = await this.apiRequest<GitHubPullApiResponse>(
			'GET',
			this.repoPath(`/pulls/${prNumber}`),
		);
		return this.toDetails(pr);
	}

	async listPullRequests(state: PullRequestState): Promise<PullRequestDetails[]> {
		const prs = await this.apiRequest<GitHubPullApiResponse[]>(
			'GET',
			this.repoPath(`/pulls?state=${state}&per_page=100`),
		);
		return prs.map((pr) => this.toDetails(pr));
	}

	private async findOpenPullRequestByHead(head: string): Promise<PullRequestRef | null> {
		const open = await this.listPullRequests('open');
		const match = open.find((pr) => pr.head.ref === head);
		return match ? { prNumber: match.prNumber, url: match.url } : null;
	}

	private toDetails(pr: GitHubPullApiResponse): PullRequestDetails {
		return {
			prNumber: pr.number,
			url: pr.html_url,
			title: pr.title,
			state: pr.state,
			// The list endpoint omits `merged`; fall back to `merged_at`.
			merged: pr.merged ?? Boolean(pr.merged_at),
			head: { ref: pr.head.ref, sha: pr.head.sha },
			base: { ref: pr.base.ref },
		};
	}

	private repoPath(suffix: string): string {
		const { ghOwner, ghRepo } = this.config;
		return `${GITHUB_API_BASE}/repos/${ghOwner}/${ghRepo}${suffix}`;
	}

	private async apiRequest<T = unknown>(
		method: 'GET' | 'POST' | 'PATCH',
		url: string,
		body?: IDataObject,
	): Promise<T> {
		const response = await this.http.request({
			method,
			url,
			body,
			json: true,
			returnFullResponse: true,
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header names
				Authorization: `token ${this.config.ghToken}`,
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header names
				Accept: 'application/vnd.github+json',
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header names
				'X-GitHub-Api-Version': '2022-11-28',
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header names
				'User-Agent': 'n8n-instance-pull',
			},
		});

		const { statusCode, body: responseBody } = response;
		if (statusCode < 200 || statusCode >= 300) {
			throw new Error(`GitHub API ${method} ${url} failed with status ${statusCode}`);
		}

		// `json: true` normally parses the body, but guard against a string payload.
		if (typeof responseBody === 'string') {
			return jsonParse<T>(responseBody, { fallbackValue: undefined as T });
		}
		return responseBody as T;
	}
}
