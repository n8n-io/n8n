import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError } from 'n8n-workflow';

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const TIMEOUT_MS = 15_000;

export type GitHubReadErrorKind = 'not_found' | 'rate_limited' | 'unavailable';

/** GitHub did not answer as expected. `kind` tells the caller what to show. */
export class GitHubReadError extends OperationalError {
	constructor(
		readonly kind: GitHubReadErrorKind,
		message: string,
		readonly retryAt?: Date,
	) {
		super(message);
	}
}

export type GitHubCommit = {
	sha: string;
	treeSha: string;
	message: string | null;
	author: string | null;
	date: Date | null;
};

export type GitHubTreeEntry = { path: string; type: 'blob' | 'tree'; sha: string; size?: number };

/**
 * Reads public GitHub repositories without a token. Every call goes to a fixed GitHub
 * host, and only the owner, repo, ref and paths come from the user, encoded into the path.
 */
@Service()
export class GitHubClient {
	private readonly http: HttpRequestClient;

	constructor(outboundHttp: OutboundHttp) {
		// Fixed hosts (api.github.com, raw.githubusercontent.com). User input only fills path segments.
		this.http = outboundHttp.requests({
			useDefaultSsrfPolicy: 'unsafe',
			timeout: TIMEOUT_MS,
			headers: { 'User-Agent': 'n8n-skills-hub' },
		});
	}

	async defaultBranch(owner: string, repo: string): Promise<string> {
		const body = await this.api(`/repos/${seg(owner)}/${seg(repo)}`);
		const branch = isRecord(body) ? body.default_branch : undefined;
		if (typeof branch !== 'string') throw unexpected();
		return branch;
	}

	/** True when `ref` is a branch. A tag or a commit SHA answers false. */
	async isBranch(owner: string, repo: string, ref: string): Promise<boolean> {
		try {
			await this.api(`/repos/${seg(owner)}/${seg(repo)}/branches/${seg(ref)}`);
			return true;
		} catch (error) {
			if (error instanceof GitHubReadError && error.kind === 'not_found') return false;
			throw error;
		}
	}

	/** The commit a branch, tag or SHA points to now. */
	async commit(owner: string, repo: string, ref: string): Promise<GitHubCommit> {
		const body = await this.api(`/repos/${seg(owner)}/${seg(repo)}/commits/${seg(ref)}`);
		if (!isRecord(body) || typeof body.sha !== 'string' || !isRecord(body.commit)) {
			throw unexpected();
		}
		const { commit } = body;
		const tree = isRecord(commit.tree) ? commit.tree.sha : undefined;
		if (typeof tree !== 'string') throw unexpected();
		const author = isRecord(commit.author) ? commit.author : {};
		const login = isRecord(body.author) ? body.author.login : undefined;
		return {
			sha: body.sha,
			treeSha: tree,
			message: typeof commit.message === 'string' ? commit.message : null,
			author:
				typeof login === 'string' ? login : typeof author.name === 'string' ? author.name : null,
			date: typeof author.date === 'string' ? new Date(author.date) : null,
		};
	}

	/** Every file and folder of a commit's tree. GitHub cuts very large trees. */
	async tree(
		owner: string,
		repo: string,
		treeSha: string,
	): Promise<{ entries: GitHubTreeEntry[]; truncated: boolean }> {
		const body = await this.api(
			`/repos/${seg(owner)}/${seg(repo)}/git/trees/${seg(treeSha)}?recursive=1`,
		);
		if (!isRecord(body) || !Array.isArray(body.tree)) throw unexpected();
		const entries: GitHubTreeEntry[] = [];
		for (const item of body.tree) {
			if (!isRecord(item) || typeof item.path !== 'string' || typeof item.sha !== 'string')
				continue;
			if (item.type !== 'blob' && item.type !== 'tree') continue;
			entries.push({
				path: item.path,
				type: item.type,
				sha: item.sha,
				...(typeof item.size === 'number' ? { size: item.size } : {}),
			});
		}
		return { entries, truncated: body.truncated === true };
	}

	/** How many commits lie between two commits. Undefined when GitHub cannot tell. */
	async commitsBetween(
		owner: string,
		repo: string,
		from: string,
		to: string,
	): Promise<number | undefined> {
		try {
			const body = await this.api(
				`/repos/${seg(owner)}/${seg(repo)}/compare/${seg(from)}...${seg(to)}`,
			);
			return isRecord(body) && typeof body.total_commits === 'number'
				? body.total_commits
				: undefined;
		} catch (error) {
			if (error instanceof GitHubReadError && error.kind === 'not_found') return undefined;
			throw error;
		}
	}

	/** The text of one file at one commit. Raw file reads do not use the API budget. */
	async file(owner: string, repo: string, commitSha: string, path: string): Promise<string> {
		const encodedPath = path.split('/').map(seg).join('/');
		const response = await this.http.request<string>({
			url: `${RAW}/${seg(owner)}/${seg(repo)}/${seg(commitSha)}/${encodedPath}`,
			method: 'GET',
			encoding: 'text',
			json: false,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		});
		if (response.statusCode === 404) {
			throw new GitHubReadError('not_found', `File not found: ${path}`);
		}
		if (response.statusCode !== 200 || typeof response.body !== 'string') {
			throw new GitHubReadError('unavailable', `GitHub answered ${response.statusCode}`);
		}
		return response.body;
	}

	private async api(path: string): Promise<unknown> {
		let response;
		try {
			response = await this.http.request<unknown>({
				url: `${API}${path}`,
				method: 'GET',
				json: true,
				headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			});
		} catch (error) {
			throw new GitHubReadError(
				'unavailable',
				`n8n could not reach GitHub: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		const { statusCode, headers } = response;
		if (statusCode >= 200 && statusCode < 300) return response.body;
		const remaining = headers['x-ratelimit-remaining'];
		if ((statusCode === 403 || statusCode === 429) && (remaining === '0' || remaining === 0)) {
			const reset = Number(headers['x-ratelimit-reset']);
			throw new GitHubReadError(
				'rate_limited',
				'GitHub limits how often n8n can read it without a token. Try again later.',
				Number.isFinite(reset) ? new Date(reset * 1000) : undefined,
			);
		}
		if (statusCode === 404 || statusCode === 451) {
			throw new GitHubReadError(
				'not_found',
				'n8n cannot read this repository. n8n reads public repositories only. Check the link, or make the repository public.',
			);
		}
		throw new GitHubReadError('unavailable', `GitHub answered ${statusCode}`);
	}
}

function seg(value: string): string {
	return encodeURIComponent(value);
}

function unexpected() {
	return new GitHubReadError('unavailable', 'GitHub sent an answer n8n does not understand.');
}
