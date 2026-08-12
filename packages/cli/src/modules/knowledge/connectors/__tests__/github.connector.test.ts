import type { Logger } from '@n8n/backend-common';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { OperationalError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeSource } from '../../database/entities';
import type {
	ConnectorSyncContext,
	ConnectorSyncResult,
	KnowledgeDocumentDraft,
} from '../connector.types';
import { GithubKnowledgeConnector } from '../github.connector';

/** Records the backoff instead of waiting it out. */
class TestGithubConnector extends GithubKnowledgeConnector {
	readonly sleeps: number[] = [];

	protected override sleepFn = async (ms: number) => {
		this.sleeps.push(ms);
		await Promise.resolve();
	};
}

interface IssuePayload {
	number: number;
	title: string;
	html_url?: string;
	state?: string;
	body?: string | null;
	user?: { login: string } | null;
	labels?: Array<{ name: string }>;
	comments?: number;
	created_at: string;
	updated_at: string;
	pull_request?: { url: string };
}

interface CommentPayload {
	user?: { login: string } | null;
	body?: string | null;
	created_at: string;
}

const anIssue = (over: Partial<IssuePayload> = {}): IssuePayload => ({
	number: 1,
	title: 'Something broke',
	html_url: 'https://github.com/acme/docs/issues/1',
	state: 'open',
	body: 'Body text',
	user: { login: 'alice' },
	labels: [],
	comments: 0,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-05T00:00:00Z',
	...over,
});

const aPullRequest = (over: Partial<IssuePayload> = {}): IssuePayload =>
	anIssue({
		number: 2,
		title: 'Fix the thing',
		html_url: 'https://github.com/acme/docs/pull/2',
		pull_request: { url: 'https://api.github.com/repos/acme/docs/pulls/2' },
		...over,
	});

const aComment = (over: Partial<CommentPayload> = {}): CommentPayload => ({
	user: { login: 'bob' },
	body: 'Looks fine to me',
	created_at: '2024-01-02T00:00:00Z',
	...over,
});

const jsonResponse = (
	body: unknown,
	init: { status?: number; headers?: Record<string, string> } = {},
) =>
	new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		headers: { 'content-type': 'application/json', ...init.headers },
	});

const logger = mock<Logger>();
const source = mock<KnowledgeSource>();

const defaultCredential: ICredentialDataDecryptedObject = {
	server: 'https://api.github.com',
	user: 'octocat',
	accessToken: 'ghp_secret',
};

const createContext = (
	over: {
		config?: Record<string, unknown>;
		checkpoint?: Record<string, unknown> | null;
		credential?: ICredentialDataDecryptedObject | null;
		abortSignal?: AbortSignal;
	} = {},
): ConnectorSyncContext => {
	source.config = over.config ?? { owner: 'acme', repo: 'docs' };

	return {
		source,
		checkpoint: over.checkpoint ?? null,
		credential: over.credential === undefined ? defaultCredential : over.credential,
		logger,
		abortSignal: over.abortSignal,
	};
};

const urlOf = (input: RequestInfo | URL): string => {
	if (typeof input === 'string') return input;

	return input instanceof URL ? input.href : input.url;
};

/** Serves the queued responses in order; a function entry can run a side effect first. */
const stubFetch = (queue: Array<Response | (() => Response)>) => {
	const urls: string[] = [];
	const inits: Array<RequestInit | undefined> = [];
	let index = 0;

	const impl: typeof globalThis.fetch = async (input, init) => {
		const url = urlOf(input);
		urls.push(url);
		inits.push(init);

		const next = queue[index++];
		if (next === undefined) throw new Error(`Unexpected GitHub request: ${url}`);

		return await Promise.resolve(typeof next === 'function' ? next() : next);
	};

	return { impl, urls, inits };
};

const drain = async (
	generator: AsyncGenerator<KnowledgeDocumentDraft, ConnectorSyncResult>,
): Promise<{ documents: KnowledgeDocumentDraft[]; result: ConnectorSyncResult }> => {
	const documents: KnowledgeDocumentDraft[] = [];

	let step = await generator.next();
	while (!step.done) {
		documents.push(step.value);
		step = await generator.next();
	}

	return { documents, result: step.value };
};

describe('GithubKnowledgeConnector', () => {
	let connector: TestGithubConnector;

	beforeEach(() => {
		vi.clearAllMocks();
		connector = new TestGithubConnector();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('is a credential-backed github connector', () => {
		expect(connector.type).toBe('github');
		expect(connector.requiresCredential).toBe(true);
	});

	describe('parseConfig', () => {
		test('applies defaults', () => {
			expect(connector.parseConfig({ owner: 'acme', repo: 'docs' })).toEqual({
				owner: 'acme',
				repo: 'docs',
				includeIssues: true,
				includePullRequests: true,
				historyDays: 365,
			});
		});

		test('keeps explicit values', () => {
			expect(
				connector.parseConfig({
					owner: 'acme',
					repo: 'docs',
					includeIssues: false,
					includePullRequests: true,
					historyDays: 30,
				}),
			).toEqual({
				owner: 'acme',
				repo: 'docs',
				includeIssues: false,
				includePullRequests: true,
				historyDays: 30,
			});
		});

		const invalidConfigs: Array<[string, Record<string, unknown>, string]> = [
			['an empty owner', { owner: '', repo: 'docs' }, 'owner'],
			['a missing repo', { owner: 'acme' }, 'repo'],
			['a zero history window', { owner: 'acme', repo: 'docs', historyDays: 0 }, 'historyDays'],
			[
				'a fractional history window',
				{ owner: 'acme', repo: 'docs', historyDays: 1.5 },
				'historyDays',
			],
			[
				'a wrongly typed flag',
				{ owner: 'acme', repo: 'docs', includeIssues: 'yes' },
				'includeIssues',
			],
		];

		test.each(invalidConfigs)('rejects %s', (_label, config, mentioned) => {
			expect(() => connector.parseConfig(config)).toThrow(UserError);
			expect(() => connector.parseConfig(config)).toThrow(mentioned);
		});

		test('rejects a non-object config', () => {
			expect(() => connector.parseConfig(null)).toThrow(UserError);
		});
	});

	describe('sync', () => {
		test('pages through issues until an empty page comes back', async () => {
			const { impl, urls, inits } = stubFetch([
				jsonResponse([anIssue({ number: 1 })]),
				jsonResponse([anIssue({ number: 2, updated_at: '2024-01-06T00:00:00Z' })]),
				jsonResponse([]),
			]);
			connector.fetchImpl = impl;

			const { documents, result } = await drain(connector.sync(createContext()));

			expect(documents.map((doc) => doc.externalId)).toEqual(['issue:1', 'issue:2']);
			expect(urls).toHaveLength(3);
			expect(urls[0]).toContain('https://api.github.com/repos/acme/docs/issues?');
			expect(urls[0]).toContain('state=all&sort=updated&direction=asc');
			expect(urls[0]).toContain('per_page=100&page=1');
			expect(urls[1]).toContain('per_page=100&page=2');
			expect(urls[2]).toContain('per_page=100&page=3');
			expect(result.checkpoint).toEqual({ since: '2024-01-06T00:00:00Z' });

			const headers = new Headers(inits[0]?.headers);
			expect(headers.get('authorization')).toBe('Bearer ghp_secret');
			expect(headers.get('accept')).toBe('application/vnd.github+json');
			expect(headers.get('x-github-api-version')).toBe('2022-11-28');
			expect(headers.get('user-agent')).toBe('n8n-knowledge');
		});

		test('trims a trailing slash off the configured server', async () => {
			const { impl, urls } = stubFetch([jsonResponse([])]);
			connector.fetchImpl = impl;

			await drain(
				connector.sync(
					createContext({
						credential: { ...defaultCredential, server: 'https://github.acme.com/api/v3/' },
					}),
				),
			);

			expect(urls[0]).toContain('https://github.acme.com/api/v3/repos/acme/docs/issues?');
		});

		test('skips pull requests when they are excluded', async () => {
			const { impl } = stubFetch([
				jsonResponse([anIssue({ number: 1 }), aPullRequest({ number: 2 })]),
				jsonResponse([]),
			]);
			connector.fetchImpl = impl;

			const { documents } = await drain(
				connector.sync(
					createContext({ config: { owner: 'acme', repo: 'docs', includePullRequests: false } }),
				),
			);

			expect(documents.map((doc) => doc.externalId)).toEqual(['issue:1']);
		});

		test('skips plain issues when they are excluded', async () => {
			const { impl } = stubFetch([
				jsonResponse([anIssue({ number: 1 }), aPullRequest({ number: 2 })]),
				jsonResponse([]),
			]);
			connector.fetchImpl = impl;

			const { documents } = await drain(
				connector.sync(
					createContext({ config: { owner: 'acme', repo: 'docs', includeIssues: false } }),
				),
			);

			expect(documents).toHaveLength(1);
			expect(documents[0].externalId).toBe('pr:2');
			expect(documents[0].metadata.kind).toBe('pr');
			expect(documents[0].url).toBe('https://github.com/acme/docs/pull/2');
		});

		test('assembles the document text from the issue and its comments', async () => {
			const { impl, urls } = stubFetch([
				jsonResponse([
					anIssue({
						number: 7,
						title: 'Search is slow',
						html_url: 'https://github.com/acme/docs/issues/7',
						labels: [{ name: 'bug' }, { name: 'ui' }],
						comments: 2,
					}),
				]),
				jsonResponse([
					aComment(),
					aComment({
						user: { login: 'carol' },
						body: 'Fixed in main',
						created_at: '2024-01-03T00:00:00Z',
					}),
				]),
				jsonResponse([]),
				jsonResponse([]),
			]);
			connector.fetchImpl = impl;

			const { documents } = await drain(connector.sync(createContext()));

			expect(urls[1]).toBe(
				'https://api.github.com/repos/acme/docs/issues/7/comments?per_page=100&page=1',
			);
			expect(urls[2]).toContain('/issues/7/comments?per_page=100&page=2');
			expect(documents).toHaveLength(1);
			expect(documents[0]).toEqual({
				externalId: 'issue:7',
				title: '#7 Search is slow',
				url: 'https://github.com/acme/docs/issues/7',
				text: [
					'Issue #7 (open) by @alice | labels: bug, ui | created: 2024-01-01T00:00:00Z | updated: 2024-01-05T00:00:00Z',
					'',
					'Body text',
					'',
					'--- @bob (2024-01-02T00:00:00Z):',
					'Looks fine to me',
					'',
					'--- @carol (2024-01-03T00:00:00Z):',
					'Fixed in main',
				].join('\n'),
				metadata: {
					kind: 'issue',
					number: 7,
					state: 'open',
					author: 'alice',
					labels: 'bug, ui',
					repo: 'acme/docs',
				},
				sourceUpdatedAt: new Date('2024-01-05T00:00:00Z'),
			});
		});

		test('does not fetch comments for items without any', async () => {
			const { impl, urls } = stubFetch([
				jsonResponse([anIssue({ comments: 0, body: null })]),
				jsonResponse([]),
			]);
			connector.fetchImpl = impl;

			const { documents } = await drain(connector.sync(createContext()));

			expect(urls.every((url) => !url.includes('/comments'))).toBe(true);
			expect(documents[0].text).toContain('(no description)');
		});

		test('uses the history horizon on the first sync', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-06-01T00:00:00Z'));

			const { impl, urls } = stubFetch([jsonResponse([])]);
			connector.fetchImpl = impl;

			const { result } = await drain(
				connector.sync(createContext({ config: { owner: 'acme', repo: 'docs', historyDays: 10 } })),
			);

			expect(urls[0]).toContain(`since=${encodeURIComponent('2024-05-22T00:00:00.000Z')}`);
			expect(result.checkpoint).toEqual({ since: '2024-05-22T00:00:00.000Z' });
		});

		test('resumes from the stored checkpoint on later syncs', async () => {
			const { impl, urls } = stubFetch([
				jsonResponse([anIssue({ updated_at: '2024-05-20T10:00:00Z' })]),
				jsonResponse([]),
			]);
			connector.fetchImpl = impl;

			const { result } = await drain(
				connector.sync(createContext({ checkpoint: { since: '2024-05-01T00:00:00.000Z' } })),
			);

			expect(urls[0]).toContain(`since=${encodeURIComponent('2024-05-01T00:00:00.000Z')}`);
			expect(result.checkpoint).toEqual({ since: '2024-05-20T10:00:00Z' });
		});

		test('keeps the previous checkpoint when nothing changed', async () => {
			const { impl } = stubFetch([jsonResponse([])]);
			connector.fetchImpl = impl;

			const { result } = await drain(
				connector.sync(createContext({ checkpoint: { since: '2024-05-01T00:00:00.000Z' } })),
			);

			expect(result.checkpoint).toEqual({ since: '2024-05-01T00:00:00.000Z' });
		});

		test('retries once the rate limit window is reported as exhausted', async () => {
			const resetAt = Math.floor(Date.now() / 1000) + 5;
			const { impl, urls } = stubFetch([
				jsonResponse(
					{ message: 'API rate limit exceeded' },
					{
						status: 403,
						headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': `${resetAt}` },
					},
				),
				jsonResponse([anIssue()]),
				jsonResponse([]),
			]);
			connector.fetchImpl = impl;

			const { documents } = await drain(connector.sync(createContext()));

			expect(documents).toHaveLength(1);
			expect(urls).toHaveLength(3);
			expect(connector.sleeps).toHaveLength(1);
			expect(connector.sleeps[0]).toBeGreaterThan(0);
			expect(connector.sleeps[0]).toBeLessThanOrEqual(5_000);
			expect(logger.warn).toHaveBeenCalled();
		});

		test('caps the retry wait at a minute', async () => {
			const { impl } = stubFetch([
				jsonResponse({}, { status: 429, headers: { 'retry-after': '600' } }),
				jsonResponse([]),
			]);
			connector.fetchImpl = impl;

			await drain(connector.sync(createContext()));

			expect(connector.sleeps).toEqual([60_000]);
		});

		test('gives up after three throttled attempts', async () => {
			const throttled = () => jsonResponse({}, { status: 429, headers: { 'retry-after': '1' } });
			const { impl, urls } = stubFetch([throttled, throttled, throttled]);
			connector.fetchImpl = impl;

			await expect(drain(connector.sync(createContext()))).rejects.toThrow(OperationalError);
			expect(urls).toHaveLength(3);
			expect(connector.sleeps).toEqual([1_000, 1_000]);
		});

		test('reports an unauthorized credential as a user error', async () => {
			const { impl } = stubFetch([jsonResponse({ message: 'Bad credentials' }, { status: 401 })]);
			connector.fetchImpl = impl;

			await expect(drain(connector.sync(createContext()))).rejects.toThrow(
				'GitHub credential is invalid or lacks access',
			);
		});

		test('reports an unreachable repository as a user error', async () => {
			const { impl } = stubFetch([jsonResponse({ message: 'Not Found' }, { status: 404 })]);
			connector.fetchImpl = impl;

			const error = await drain(connector.sync(createContext())).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(UserError);
			expect(error).toHaveProperty('message', expect.stringContaining('acme/docs'));
		});

		test('reports other failures as operational errors', async () => {
			const { impl } = stubFetch([jsonResponse({ message: 'Server error' }, { status: 500 })]);
			connector.fetchImpl = impl;

			const error = await drain(connector.sync(createContext())).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(OperationalError);
			expect(error).toHaveProperty('message', expect.stringContaining('status 500'));
		});

		test('rejects a response that is not a list of issues', async () => {
			const { impl } = stubFetch([jsonResponse({ message: 'unexpected' })]);
			connector.fetchImpl = impl;

			await expect(drain(connector.sync(createContext()))).rejects.toThrow(OperationalError);
		});

		test('requires an access token on the credential', async () => {
			const { impl } = stubFetch([]);
			connector.fetchImpl = impl;

			await expect(
				drain(connector.sync(createContext({ credential: { server: 'https://api.github.com' } }))),
			).rejects.toThrow('The GitHub credential is missing an access token');
		});

		test('stops at the next page boundary once aborted', async () => {
			const controller = new AbortController();
			const { impl, urls } = stubFetch([
				() => {
					controller.abort();
					return jsonResponse([anIssue()]);
				},
			]);
			connector.fetchImpl = impl;

			const generator = connector.sync(createContext({ abortSignal: controller.signal }));

			await expect(generator.next()).resolves.toMatchObject({ done: false });
			await expect(generator.next()).rejects.toThrow('Sync aborted');
			expect(urls).toHaveLength(1);
		});

		test('does not fetch at all when aborted upfront', async () => {
			const { impl, urls } = stubFetch([]);
			connector.fetchImpl = impl;

			const generator = connector.sync(createContext({ abortSignal: AbortSignal.abort() }));

			await expect(generator.next()).rejects.toThrow(OperationalError);
			expect(urls).toHaveLength(0);
		});
	});
});
