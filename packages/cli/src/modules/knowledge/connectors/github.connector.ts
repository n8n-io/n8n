import { Service } from '@n8n/di';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { OperationalError, UserError } from 'n8n-workflow';
import { z } from 'zod';

import type {
	ConnectorSyncContext,
	ConnectorSyncResult,
	KnowledgeConnector,
	KnowledgeDocumentDraft,
} from './connector.types';
import type { KnowledgeSourceType } from '../knowledge.constants';

const DEFAULT_SERVER = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const USER_AGENT = 'n8n-knowledge';
const PER_PAGE = 100;
/** Safety valve so a misbehaving endpoint can never spin forever. */
const MAX_PAGES = 100;
const MAX_ATTEMPTS = 3;
const MAX_RETRY_WAIT_MS = 60_000;
const FALLBACK_RETRY_WAIT_MS = 1_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const githubConfigSchema = z.object({
	owner: z.string().min(1),
	repo: z.string().min(1),
	includeIssues: z.boolean().default(true),
	includePullRequests: z.boolean().default(true),
	historyDays: z.number().int().positive().default(365),
});

export type GithubKnowledgeConfig = z.infer<typeof githubConfigSchema>;

/** Only the fields we read; everything optional stays lenient so GitHub can add or omit keys. */
const githubIssueSchema = z.object({
	// eslint-disable-next-line id-denylist -- `number` is GitHub's field name
	number: z.number(),
	title: z.string(),
	html_url: z.string().optional(),
	state: z.string().optional(),
	body: z.string().nullish(),
	user: z.object({ login: z.string().optional() }).nullish(),
	labels: z.array(z.union([z.string(), z.object({ name: z.string().optional() })])).optional(),
	comments: z.number().optional(),
	created_at: z.string(),
	updated_at: z.string(),
	/** Present only on pull requests — this is how the issues endpoint marks them. */
	pull_request: z.unknown().optional(),
});

const githubCommentSchema = z.object({
	user: z.object({ login: z.string().optional() }).nullish(),
	body: z.string().nullish(),
	created_at: z.string(),
});

type GithubIssue = z.infer<typeof githubIssueSchema>;
type GithubComment = z.infer<typeof githubCommentSchema>;

/**
 * Indexes issues and pull requests of a single GitHub repository.
 *
 * The issues endpoint returns pull requests too, so one pass covers both kinds;
 * `pull_request` on an item is what distinguishes them.
 */
@Service()
export class GithubKnowledgeConnector implements KnowledgeConnector {
	readonly type: KnowledgeSourceType = 'github';

	readonly requiresCredential = true;

	/** Overridable so tests can drive the connector without real HTTP. */
	fetchImpl: typeof globalThis.fetch = globalThis.fetch;

	/** Overridable so tests do not have to wait out rate-limit backoff. */
	protected sleepFn: (ms: number) => Promise<void> = async (ms) => {
		await new Promise((resolve) => setTimeout(resolve, ms));
	};

	parseConfig(config: unknown): GithubKnowledgeConfig {
		const parsed = githubConfigSchema.safeParse(config);

		if (!parsed.success) {
			const details = parsed.error.issues
				.map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
				.join('; ');

			throw new UserError(`Invalid GitHub knowledge source configuration: ${details}`);
		}

		return parsed.data;
	}

	async *sync(
		ctx: ConnectorSyncContext,
	): AsyncGenerator<KnowledgeDocumentDraft, ConnectorSyncResult> {
		const config = this.parseConfig(ctx.source.config);
		const { server, token } = this.parseCredential(ctx.credential);
		const repoRef = `${config.owner}/${config.repo}`;
		const since = this.resolveSince(ctx.checkpoint, config.historyDays);

		let maxUpdatedAt: string | null = null;

		for (let page = 1; page <= MAX_PAGES; page++) {
			this.assertNotAborted(ctx);

			const url =
				`${server}/repos/${config.owner}/${config.repo}/issues` +
				`?state=all&sort=updated&direction=asc&since=${encodeURIComponent(since)}` +
				`&per_page=${PER_PAGE}&page=${page}`;

			const items = await this.fetchList(url, githubIssueSchema, token, ctx, repoRef);

			if (items.length === 0) break;

			for (const item of items) {
				// Advance the cursor for every item we saw, including filtered-out ones:
				// items arrive sorted by `updated` ascending, so anything skipped here
				// would only be skipped again on the next run.
				maxUpdatedAt = this.laterOf(maxUpdatedAt, item.updated_at);

				const isPullRequest = item.pull_request !== undefined && item.pull_request !== null;

				if (isPullRequest && !config.includePullRequests) continue;
				if (!isPullRequest && !config.includeIssues) continue;

				const comments =
					(item.comments ?? 0) > 0
						? await this.fetchComments(server, config, item.number, token, ctx, repoRef)
						: [];

				yield this.toDraft(item, comments, isPullRequest, repoRef);
			}

			if (page === MAX_PAGES) {
				ctx.logger.warn(
					`Stopped syncing "${repoRef}" at the page limit; the next sync resumes from the checkpoint`,
					{ pages: MAX_PAGES },
				);
			}
		}

		return { checkpoint: { since: maxUpdatedAt ?? since } };
	}

	private async fetchComments(
		server: string,
		config: GithubKnowledgeConfig,
		issueNumber: number,
		token: string,
		ctx: ConnectorSyncContext,
		repoRef: string,
	): Promise<GithubComment[]> {
		const comments: GithubComment[] = [];

		for (let page = 1; page <= MAX_PAGES; page++) {
			this.assertNotAborted(ctx);

			const url =
				`${server}/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments` +
				`?per_page=${PER_PAGE}&page=${page}`;

			const items = await this.fetchList(url, githubCommentSchema, token, ctx, repoRef);

			if (items.length === 0) break;

			comments.push(...items);
		}

		return comments;
	}

	private toDraft(
		item: GithubIssue,
		comments: GithubComment[],
		isPullRequest: boolean,
		repoRef: string,
	): KnowledgeDocumentDraft {
		const author = item.user?.login ?? '';
		const labels = (item.labels ?? [])
			.map((label) => (typeof label === 'string' ? label : (label.name ?? '')))
			.filter((label) => label !== '');

		const headerParts = [
			`${isPullRequest ? 'Pull request' : 'Issue'} #${item.number} (${item.state ?? 'unknown'}) by @${author || 'unknown'}`,
			labels.length > 0 ? `labels: ${labels.join(', ')}` : null,
			`created: ${item.created_at}`,
			`updated: ${item.updated_at}`,
		].filter((part) => part !== null);

		const sections = [
			headerParts.join(' | '),
			item.body?.trim() ? item.body.trim() : '(no description)',
			...comments.map(
				(comment) =>
					`--- @${comment.user?.login ?? 'unknown'} (${comment.created_at}):\n${comment.body?.trim() ?? ''}`,
			),
		];

		return {
			externalId: `${isPullRequest ? 'pr' : 'issue'}:${item.number}`,
			title: `#${item.number} ${item.title}`,
			url: item.html_url,
			text: sections.join('\n\n'),
			metadata: {
				kind: isPullRequest ? 'pr' : 'issue',
				// eslint-disable-next-line id-denylist -- `number` mirrors GitHub's field name
				number: item.number,
				state: item.state ?? '',
				author,
				labels: labels.join(', '),
				repo: repoRef,
			},
			sourceUpdatedAt: new Date(item.updated_at),
		};
	}

	private parseCredential(credential: ICredentialDataDecryptedObject | null): {
		server: string;
		token: string;
	} {
		const accessToken = credential?.accessToken;

		if (typeof accessToken !== 'string' || accessToken.trim() === '') {
			throw new UserError('The GitHub credential is missing an access token');
		}

		const configuredServer = credential?.server;
		const server =
			typeof configuredServer === 'string' && configuredServer.trim() !== ''
				? configuredServer.trim()
				: DEFAULT_SERVER;

		return { server: server.replace(/\/+$/, ''), token: accessToken.trim() };
	}

	/** Checkpoint wins when it holds a usable date; otherwise fall back to the history horizon. */
	private resolveSince(checkpoint: Record<string, unknown> | null, historyDays: number): string {
		const stored = checkpoint?.since;

		if (typeof stored === 'string') {
			const parsed = new Date(stored);
			if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
		}

		return new Date(Date.now() - historyDays * MS_PER_DAY).toISOString();
	}

	private laterOf(current: string | null, candidate: string): string | null {
		const candidateTime = new Date(candidate).getTime();

		if (Number.isNaN(candidateTime)) return current;
		if (current === null) return candidate;

		return candidateTime > new Date(current).getTime() ? candidate : current;
	}

	private assertNotAborted(ctx: ConnectorSyncContext): void {
		if (ctx.abortSignal?.aborted) throw new OperationalError('Sync aborted');
	}

	private async fetchList<T>(
		url: string,
		schema: z.ZodType<T>,
		token: string,
		ctx: ConnectorSyncContext,
		repoRef: string,
	): Promise<T[]> {
		const body = await this.request(url, token, ctx, repoRef);
		const parsed = z.array(schema).safeParse(body);

		if (!parsed.success) {
			throw new OperationalError(`GitHub returned an unexpected response shape for ${url}`);
		}

		return parsed.data;
	}

	private async request(
		url: string,
		token: string,
		ctx: ConnectorSyncContext,
		repoRef: string,
	): Promise<unknown> {
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			const response = await this.fetchImpl(url, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/vnd.github+json',
					'X-GitHub-Api-Version': API_VERSION,
					'User-Agent': USER_AGENT,
				},
			});

			if (response.ok) {
				try {
					const body: unknown = await response.json();
					return body;
				} catch {
					throw new OperationalError(`GitHub returned a malformed JSON response for ${url}`);
				}
			}

			if (response.status === 401) {
				throw new UserError('GitHub credential is invalid or lacks access');
			}

			if (response.status === 404) {
				throw new UserError(
					`GitHub repository "${repoRef}" was not found, or the credential cannot access it`,
				);
			}

			if (this.isThrottled(response) && attempt < MAX_ATTEMPTS) {
				const waitMs = this.retryDelayMs(response.headers);

				ctx.logger.warn('Throttled by GitHub, retrying after a wait', { url, attempt, waitMs });
				await this.sleepFn(waitMs);
				continue;
			}

			throw new OperationalError(`GitHub request failed with status ${response.status} for ${url}`);
		}

		throw new OperationalError(`GitHub request failed after ${MAX_ATTEMPTS} attempts for ${url}`);
	}

	private isThrottled(response: Response): boolean {
		if (response.status === 429) return true;

		return response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0';
	}

	private retryDelayMs(headers: Headers): number {
		const retryAfterSeconds = Number(headers.get('retry-after'));

		if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
			return Math.min(retryAfterSeconds * 1000, MAX_RETRY_WAIT_MS);
		}

		const resetEpochSeconds = Number(headers.get('x-ratelimit-reset'));

		if (Number.isFinite(resetEpochSeconds) && resetEpochSeconds > 0) {
			const waitMs = resetEpochSeconds * 1000 - Date.now();
			return Math.min(Math.max(waitMs, 0), MAX_RETRY_WAIT_MS);
		}

		return FALLBACK_RETRY_WAIT_MS;
	}
}
