import { compat, credential } from '../../entry/credentials';
import { toContract } from '../../define';
import { defineNode, isRecord, t, type Action } from '../../index';
import { mockHttp, runAction } from '../../testing';
import { packHttpGuest } from '../../pack';
import {
	extendedConfig,
	liftHttpGuest,
	parentNodeOf,
	parseHttpGuestConfig,
	valueAt,
	type HttpGuestConfig,
} from '../http';

const NOTION_VERSION = { 'Notion-Version': '2022-06-28' };

const notion = defineNode({
	id: 'notion',
	displayName: 'Notion',
	baseUrl: 'https://api.notion.com/v1',
	credential: credential({
		types: [compat('notionApi')],
		scopes: { 'users:read': 'Read users', 'content:read': 'Read content' },
	}),
});

const notionUser = t
	.obj({ object: t.lit('user'), id: t.str(), name: t.nullable(t.str()).optional() })
	.with({ additionalProperties: true });

const getUser = notion
	.resource('user', { input: { user: t.str().with({ minLength: 1 }) } })
	.action('get', {
		action: 'Get a user',
		summary: 'Get one Notion user by ID.',
		flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
		scopes: ['users:read'],
		input: {},
		output: notionUser,
		request: { method: 'GET', path: '/users/{user}', headers: NOTION_VERSION },
	});

const page = t.obj({ object: t.lit('page'), id: t.str() });

const searchPages = notion.resource('page', { input: {} }).action('search', {
	action: 'Search pages',
	summary: 'Search pages by title.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	scopes: ['content:read'],
	input: { query: t.str() },
	output: page,
	list: {
		method: 'POST',
		path: '/search',
		headers: NOTION_VERSION,
		body: { query: { input: 'query' } },
		response: t.obj({ results: t.arr(page), next_cursor: t.nullable(t.str()) }),
		items: (body) => body.results,
		pages: {
			style: 'cursor',
			next: (body) => body.next_cursor,
			send: { body: 'start_cursor' },
			size: { body: 'page_size', max: 2 },
		},
	},
});

const userConfig = (): HttpGuestConfig => ({
	contract: toContract(getUser),
	baseUrl: 'https://api.notion.com/v1',
	request: { method: 'GET', path: '/users/{user}', headers: NOTION_VERSION },
});

const searchConfig = (): HttpGuestConfig => ({
	contract: toContract(searchPages),
	baseUrl: 'https://api.notion.com/v1',
	list: {
		method: 'POST',
		path: '/search',
		headers: NOTION_VERSION,
		body: { query: { input: 'query' } },
		items: '/results',
		pages: {
			style: 'cursor',
			next: '/next_cursor',
			send: { body: 'start_cursor' },
			size: { body: 'page_size', max: 2 },
		},
	},
});

const credentials = [{ name: 'notionApi', displayName: 'Notion', properties: [] }];

const runBoth = async (
	actions: readonly Action[],
	input: unknown,
	routes: Parameters<typeof mockHttp>[0],
) =>
	await Promise.all(
		actions.map(async (action) => {
			const fetch = mockHttp(routes);
			const result = await runAction(action, {
				input,
				fetch,
				credential: { type: 'notionApi', data: {} },
				credentials,
			});
			return { result, calls: fetch.calls };
		}),
	);

describe('liftHttpGuest', () => {
	it('gives the contract of the config', () => {
		expect(toContract(liftHttpGuest(parseHttpGuestConfig(userConfig())))).toEqual(
			toContract(getUser),
		);
		expect(toContract(liftHttpGuest(parseHttpGuestConfig(searchConfig())))).toEqual(
			toContract(searchPages),
		);
	});

	it('sends the same request and gives the same item as the TS request binding', async () => {
		const routes = [
			{
				method: 'GET',
				path: '/v1/users/u-1',
				reply: { json: { object: 'user', id: 'u-1', name: 'Ada' } },
			},
		];
		const [ts, lifted] = await runBoth(
			[getUser, liftHttpGuest(parseHttpGuestConfig(userConfig()))],
			{ user: 'u-1' },
			routes,
		);
		expect(ts?.result).toEqual({ ok: true, items: [{ object: 'user', id: 'u-1', name: 'Ada' }] });
		expect(lifted).toEqual(ts);
	});

	it('pages a list as the TS list binding does', async () => {
		const routes = [
			{
				method: 'POST',
				path: '/v1/search',
				times: 1,
				reply: {
					json: {
						results: [
							{ object: 'page', id: 'p1' },
							{ object: 'page', id: 'p2' },
						],
						next_cursor: 'c2',
					},
				},
			},
			{
				method: 'POST',
				path: '/v1/search',
				reply: { json: { results: [{ object: 'page', id: 'p3' }], next_cursor: null } },
			},
		];
		const input = { query: 'roadmap', paging: { mode: 'all' } };
		const [ts, lifted] = await runBoth(
			[searchPages, liftHttpGuest(parseHttpGuestConfig(searchConfig()))],
			input,
			routes,
		);
		const ids = ts?.result.ok
			? ts.result.items.map((item) => (isRecord(item) ? item.id : item))
			: ts;
		expect(ids).toEqual(['p1', 'p2', 'p3']);
		expect(ts?.calls.map(({ body }) => body)).toEqual([
			{ query: 'roadmap', page_size: 2 },
			{ query: 'roadmap', page_size: 2, start_cursor: 'c2' },
		]);
		expect(lifted).toEqual(ts);
	});

	it('fails a response that matches errorOf with its message', async () => {
		const action = liftHttpGuest(
			parseHttpGuestConfig({
				...userConfig(),
				errorOf: '={{ $response.body.ok === false ? $response.body.error : undefined }}',
			}),
		);
		const fetch = mockHttp([
			{ path: '/v1/users/u-1', reply: { json: { ok: false, error: 'user_not_found' } } },
		]);
		const result = await runAction(action, {
			input: { user: 'u-1' },
			fetch,
			credential: { type: 'notionApi', data: {} },
			credentials,
		});
		expect(result).toMatchObject({ ok: false, error: { message: 'user_not_found' } });
	});

	it('refuses a binding that gives another contract', () => {
		const config = parseHttpGuestConfig({ ...userConfig(), baseUrl: 'https://evil.example.com' });
		expect(() => liftHttpGuest(config)).toThrow(
			'notion.user.get does not give its contract: egress',
		);
	});
});

describe('liftHttpGuest node fields', () => {
	const repos = defineNode({
		id: 'ghe',
		displayName: 'GitHub Enterprise',
		credential: credential({
			types: [compat('githubApi', { fields: { server: t.str() }, baseUrl: '{server}' })],
		}),
	});
	const getRepo = repos.resource('repo', { input: { name: t.str() } }).action('get', {
		action: 'Get a repository',
		summary: 'Get one repository.',
		flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
		input: {},
		output: t.obj({ id: t.int() }),
		request: { path: '/repos/{name}' },
	});
	const config = (): HttpGuestConfig => ({
		contract: toContract(getRepo),
		node: { displayName: 'GitHub Enterprise', icon: 'node:n8n-nodes-base.github' },
		credentials: [
			{ name: 'githubApi', baseUrl: '{server}', fields: { server: { type: 'string' } } },
		],
		request: { path: '/repos/{name}' },
	});

	it('takes the display name, and the base URL of the stored credential', async () => {
		const action = liftHttpGuest(parseHttpGuestConfig(config()));
		expect(action.node.displayName).toBe('GitHub Enterprise');
		const fetch = mockHttp([{ path: '/repos/n8n', reply: { json: { id: 1 } } }]);
		const result = await runAction(action, {
			input: { name: 'n8n' },
			fetch,
			credential: { type: 'githubApi', data: { server: 'https://ghe.example.com/api/v3' } },
			credentials: [{ name: 'githubApi', displayName: 'GitHub', properties: [] }],
		});
		expect(result).toEqual({ ok: true, items: [{ id: 1 }] });
		expect(fetch.calls[0]?.url).toBe('https://ghe.example.com/api/v3/repos/n8n');
	});

	it('refuses a credential base URL that is not a template', () => {
		const bad = { ...config(), credentials: [{ name: 'githubApi', baseUrl: 'ftp://x' }] };
		expect(() => liftHttpGuest(parseHttpGuestConfig(bad))).toThrow('must start with https://');
	});
});

describe('extending a node', () => {
	const ERROR_OF = '={{ $response.body.message ?? undefined }}' as const;
	const gh = defineNode({
		id: 'gh',
		displayName: 'GitHub',
		credential: credential({
			types: [compat('githubApi', { fields: { server: t.str() }, baseUrl: '{server}' })],
		}),
		errorOf: ERROR_OF,
	});
	const issue = gh.resource('issue', { input: { owner: t.str(), repository: t.str() } });
	const getIssue = issue.action('get', {
		action: 'Get an issue',
		summary: 'Get one issue.',
		flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
		input: { issueNumber: t.int() },
		output: t.obj({ id: t.int() }),
		request: { path: '/repos/{owner}/{repository}/issues/{issueNumber}' },
	});
	const draft = (): HttpGuestConfig => ({
		extends: 'gh',
		contract: {
			id: 'gh.issue.lock',
			version: 1,
			node: 'gh',
			nodeDisplayName: 'GH',
			action: 'Lock an issue',
			summary: 'Lock the conversation of an issue.',
			flow: { effect: 'write', cardinality: 'per-item', idempotent: true, passthrough: 'replace' },
			credentials: [],
			input: {
				type: 'object',
				properties: { issueNumber: { type: 'integer' } },
				required: ['issueNumber'],
			},
			output: { type: 'object' },
		},
		request: { method: 'PUT', path: '/repos/{owner}/{repository}/issues/{issueNumber}/lock' },
	});

	it('copies the base URL, credentials, errorOf and resource input of the parent', async () => {
		const parent = parentNodeOf([getIssue], 'gh');
		if (!parent?.extendable) throw new Error('gh is not extendable');
		const config = extendedConfig(draft(), parent, 'node:n8n-nodes-base.github');
		expect(config).toMatchObject({
			node: { displayName: 'GitHub', icon: 'node:n8n-nodes-base.github' },
			credentials: [
				{ name: 'githubApi', baseUrl: '{server}', fields: { server: { type: 'string' } } },
			],
			errorOf: ERROR_OF,
			contract: {
				credentials: ['githubApi'],
				input: { required: ['owner', 'repository', 'issueNumber'] },
			},
		});
		const { bundle } = await packHttpGuest(config, { parentOf: () => parent });
		const action = liftHttpGuest(parseHttpGuestConfig(JSON.parse(bundle)));
		const run = async (reply: unknown) => {
			const fetch = mockHttp([
				{ method: 'PUT', path: '/repos/n8n/n8n/issues/7/lock', reply: { json: reply } },
			]);
			const result = await runAction(action, {
				input: { owner: 'n8n', repository: 'n8n', issueNumber: 7 },
				fetch,
				credential: { type: 'githubApi', data: { server: 'https://ghe.example.com/api/v3' } },
				credentials: [{ name: 'githubApi', displayName: 'GitHub', properties: [] }],
			});
			return { result, url: fetch.calls[0]?.url };
		};
		expect(await run({})).toEqual({
			result: { ok: true, items: [{}] },
			url: 'https://ghe.example.com/api/v3/repos/n8n/n8n/issues/7/lock',
		});
		expect((await run({ message: 'Issue is locked' })).result).toMatchObject({
			ok: false,
			error: { message: 'Issue is locked' },
		});
	});

	it('keeps the resource input, so its actions give the node as a parent', async () => {
		const parent = parentNodeOf([getIssue], 'gh');
		if (!parent?.extendable) throw new Error('gh is not extendable');
		const { bundle } = await packHttpGuest(draft(), { parentOf: () => parent });
		const lifted = liftHttpGuest(parseHttpGuestConfig(JSON.parse(bundle)));

		expect(JSON.parse(bundle)).toMatchObject({ resourceFields: ['owner', 'repository'] });
		const again = parentNodeOf([lifted], 'gh');
		expect(again).toMatchObject({
			extendable: true,
			resources: { issue: { required: ['owner', 'repository'] } },
		});
	});

	it('packs a config without resource fields as before', async () => {
		const parent = parentNodeOf([getIssue], 'gh');
		if (!parent?.extendable) throw new Error('gh is not extendable');
		const { resourceFields: _, extends: __, ...old } = extendedConfig(draft(), parent);
		const first = await packHttpGuest(old);
		const lifted = liftHttpGuest(parseHttpGuestConfig(JSON.parse(first.bundle)));

		expect((await packHttpGuest(old)).manifest.bundleHash).toBe(first.manifest.bundleHash);
		expect(lifted.resourceFields).toEqual([]);
	});

	it('packs a draft that lists the resource input itself, in any key order', async () => {
		const parent = parentNodeOf([getIssue], 'gh');
		if (!parent?.extendable) throw new Error('gh is not extendable');
		const listed = draft();
		const input = {
			type: 'object',
			properties: {
				owner: { type: 'string' },
				repository: { type: 'string' },
				issueNumber: { type: 'integer' },
			},
			required: ['owner', 'repository', 'issueNumber'],
		};
		await expect(
			packHttpGuest(
				{ ...listed, contract: { ...listed.contract, input } },
				{ parentOf: () => parent },
			),
		).resolves.toMatchObject({ manifest: { id: 'gh.issue.lock' } });
	});

	it('refuses a node that checks its responses with code or has no base URL, and an id of another node', () => {
		const coded = defineNode({ id: 'coded', displayName: 'Coded', errorOf: () => undefined });
		const ping = coded.action('ping', {
			action: 'Ping',
			summary: 'Ping.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {},
			output: t.obj({}),
			request: { path: '/ping' },
		});
		expect(parentNodeOf([ping], 'coded')).toEqual({
			id: 'coded',
			extendable: false,
			reason: 'coded checks its responses with code',
		});
		const plain = defineNode({ id: 'plain', displayName: 'Plain' }).action('run', {
			action: 'Run',
			summary: 'Run.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {},
			output: t.obj({}),
			run: async () => ({}),
		});
		expect(parentNodeOf([plain], 'plain')).toMatchObject({
			extendable: false,
			reason: 'plain has no API base URL',
		});
		const parent = parentNodeOf([getIssue], 'gh');
		if (!parent?.extendable) throw new Error('gh is not extendable');
		const other = { ...draft(), contract: { ...draft().contract, id: 'acme.issue.lock' } };
		expect(() => extendedConfig(other, parent)).toThrow('needs an id that starts with gh.');
	});
});

describe('parseHttpGuestConfig', () => {
	it('names the path of a bad field', () => {
		const { list, ...rest } = searchConfig();
		expect(() => parseHttpGuestConfig({ ...rest, list: { ...list, items: 'results' } })).toThrow(
			'input.list.items',
		);
	});

	it('needs exactly one of request and list', () => {
		expect(() => parseHttpGuestConfig({ ...userConfig(), list: searchConfig().list })).toThrow(
			'exactly one of request and list',
		);
		const { request: _, ...none } = userConfig();
		expect(() => parseHttpGuestConfig(none)).toThrow('exactly one of request and list');
	});

	it('refuses a binding that does not fit the cardinality', () => {
		const config = { ...searchConfig(), list: undefined, request: userConfig().request };
		expect(() => liftHttpGuest(parseHttpGuestConfig(config))).toThrow('A request is per item');
	});
});

describe('valueAt', () => {
	const doc = { foo: ['bar', 'baz'], '': 0, 'a/b': 1, 'm~n': 8, nested: { list: [{ id: 'x' }] } };

	it.each([
		['', doc],
		['/foo', ['bar', 'baz']],
		['/foo/0', 'bar'],
		['/', 0],
		['/a~1b', 1],
		['/m~0n', 8],
		['/nested/list/0/id', 'x'],
		['/foo/01', undefined],
		['/missing/x', undefined],
	])('reads %j', (at, expected) => {
		expect(valueAt(doc, at)).toEqual(expected);
	});
});
