// The `@example` blocks of the public JSDoc, in code that tsc checks. Keep both in step.
import { compat, credential, defineCredential, field } from '../entry/credentials';
import {
	defineNode,
	defineResource,
	isHttpError,
	limitOf,
	pages,
	paging,
	parse,
	path,
	promptReply,
	provider,
	readAs,
	ref,
	replyOutput,
	replyOutputOf,
	replySchema,
	t,
	type ChatModel,
	type DataTableFilter,
	type Http,
	type HttpRequest,
	type Infer,
} from '../index';
import { mockHttp, runAction } from '../testing';

const notionToken = defineCredential({
	id: 'notion.token',
	legacyName: 'notionApi',
	displayName: 'Notion API',
	fields: { apiKey: field.secret('Internal Integration Secret') },
	baseUrl: 'https://api.notion.com/v1',
	auth: (a) => a.bearer('apiKey'),
	test: { get: '/users/me' },
});

const notionOAuth2 = compat('notionOAuth2Api');

export const gmailOAuth2 = compat('gmailOAuth2', { hosts: ['gmail.googleapis.com'] });

export const regional = defineCredential({
	id: 'acme.apiKey',
	displayName: 'Acme API',
	fields: {
		apiKey: field.secret('API Key'),
		region: field.options('Region', { eu: { name: 'Europe' }, us: { name: 'United States' } }),
	},
	baseUrl: { on: 'region', values: { eu: 'https://eu.acme.test', us: 'https://us.acme.test' } },
	auth: (a) => a.header('X-Api-Key', '{apiKey}'),
});

export const anyCredential = credential({ types: [notionToken, notionOAuth2] });

const notion = defineNode({
	id: 'notion',
	displayName: 'Notion',
	credential: credential({
		types: [notionToken],
		scopes: { 'content:read': 'Read pages, databases and data sources' },
	}),
	baseUrl: 'https://api.notion.com/v1',
});

export const plainNode = defineNode({
	id: 'notion',
	displayName: 'Notion',
	credential: credential({ types: [notionToken] }),
	baseUrl: 'https://api.notion.com/v1',
});

const notionUserId = defineResource({
	id: 'notion.user',
	label: 'User',
	shape: { pattern: '^[a-z0-9-]+$' },
});

export const notionDatabase = defineResource({
	id: 'notion.database',
	label: 'Database',
	shape: { pattern: '[0-9a-f]{32}', 'x-n8n-hint': 'Notion database ID or URL' },
});

const user = notion.resource('user', { input: { user: ref(notionUserId) } });

export const getUser = user.action('get', {
	action: 'Get a user',
	summary: 'Get one user by ID.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: {},
	output: t.obj({ id: t.str(), name: t.str() }),
	request: { path: '/users/{user}' },
});

const userItem = t.obj({ id: t.str() });

export const listUsers = notion.action('listUsers', {
	action: 'Get many users',
	summary: 'List the users.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {},
	output: userItem,
	list: {
		path: '/users',
		response: t.obj({ users: t.arr(userItem) }),
		items: (page) => page.users,
		pages: { style: 'link' },
	},
});

export const getPage = notion.action('getPage', {
	action: 'Get a page',
	summary: 'Get one page by ID.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: { page: t.str() },
	output: t.json(),
	request: { method: 'GET', path: '/pages/{page}' },
});

export const findPage = notion.action('findPage', {
	action: 'Find a page',
	summary: 'Get one page, or found: false.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: { page: t.str() },
	output: t.jsonValue(),
	async run({ input, http }) {
		try {
			return await http.request({ path: path`/pages/${input.page}` });
		} catch (error) {
			if (isHttpError(error) && error.status === 404) return { found: false };
			throw error;
		}
	},
});

export const listIssues = notion.action('listIssues', {
	action: 'List issues',
	summary: 'Get the issues of a repository.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: { owner: t.str(), repo: t.str() },
	output: t.jsonValue(),
	async run({ input, http }) {
		const issues = await http.request({ path: path`/repos/${input.owner}/${input.repo}/issues` });
		return issues;
	},
});

export const download = notion.action('download', {
	action: 'Download a file',
	summary: 'Get a page and a file.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: { fileUrl: t.str() },
	output: t.obj({ page: t.jsonValue(), file: t.binary() }),
	egress: { fromInput: 'fileUrl' },
	async run({ input: { fileUrl }, http }) {
		const page = await http.request({ path: path`/pages/abc` });
		const file = await http.request({ url: fileUrl, response: 'binary' });
		return { page, file };
	},
});

export const search = notion.action('search', {
	action: 'Search',
	summary: 'Search pages.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: { paging },
	output: t.obj({ id: t.str() }),
	async *run({ input, http }) {
		yield* pages(http, {
			page: t.obj({ results: t.arr(t.obj({ id: t.str() })), next_cursor: t.nullable(t.str()) }),
			request: (cursor) => ({ path: path`/search`, query: { start_cursor: cursor } }),
			items: (page) => page.results,
			next: (page) => page.next_cursor,
			limit: limitOf(input.paging),
		});
	},
});

const page = t.obj({ results: t.arr(t.obj({ id: t.str() })), next: t.nullable(t.str()) });
const request = (cursor: string | undefined): HttpRequest => ({
	path: path`/search`,
	query: { cursor },
});
const items = (body: Infer<typeof page>) => body.results;
const next = (body: Infer<typeof page>) => body.next;

export const searchLimited = notion.action('searchLimited', {
	action: 'Search with a limit',
	summary: 'Search pages up to a limit.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	output: t.obj({ id: t.str() }),
	input: { query: t.str(), paging },
	async *run({ input, http }) {
		const limit = limitOf(input.paging); // undefined for all items
		yield* pages(http, { page, request, items, next, limit });
	},
});

export const countLeads = notion.action('countLeads', {
	action: 'Count leads',
	summary: 'Count the rows of a data table.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: { email: t.str() },
	output: t.obj({ count: t.int() }),
	imports: ['dataTables'],
	async run({ dataTables, input: { email } }) {
		const filter: DataTableFilter = {
			match: 'all',
			conditions: [{ column: 'email', op: 'eq', value: email }],
		};
		const table = await dataTables.open({ name: 'Leads' });
		const { rows } = await table.rows({ limit: 10 });
		const { count } = await table.rows({ filter, limit: 1 });
		return { count: rows.length + count };
	},
});

export const reply = notion.action('reply', {
	action: 'Reply',
	summary: 'Ask a chat model with tools.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: { model: provider.input('chatModel'), tools: t.arr(provider.input('tool')) },
	output: t.obj({ text: t.str() }),
	async run({ input }) {
		const { text } = await input.model.chat({ messages: [{ role: 'user', content: 'Hi' }] });
		return { text };
	},
});

export const prompt = notion.action('prompt', {
	action: 'Prompt',
	summary: 'Prompt a chat model.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: { model: provider.input('chatModel'), prompt: t.str(), schema: replySchema },
	output: replyOutput,
	deriveOutput: ({ schema }) => replyOutputOf(schema),
	run: async ({ input }) => await promptReply(input.model, input),
});

const xAi = defineNode({ id: 'xAi', displayName: 'xAI', baseUrl: 'https://api.x.ai/v1' });

const grokModel = async (http: Http, model: string): Promise<ChatModel> =>
	await Promise.resolve({
		model,
		async chat({ messages }) {
			const body = parse(
				t.obj({ text: t.str() }),
				await http.request({ method: 'POST', path: path`/chat`, body: { model, messages } }),
			);
			return { text: body.text ?? '', toolCalls: [], finishReason: 'stop' };
		},
	});

const resultsPage = t.obj({
	results: t.arr(t.obj({ id: t.str() })),
	next_cursor: t.nullable(t.str()),
});

export const resultIdsOf = (body: unknown) => {
	const { value: page, drift } = readAs(resultsPage, body, {
		path: 'page',
		read: (page) => [page.results, page.next_cursor],
	});
	return { ids: page.results.map(({ id }) => id), drift };
};

export const chatModel = xAi.provider('chatModel', {
	action: 'xAI Grok Chat Model',
	summary: 'An xAI Grok chat model for an AI node.',
	provides: 'chatModel',
	input: { model: t.modelId('xai') },
	provide: async ({ input, http }) => await grokModel(http, input.model),
});

const fields = t.obj({
	model: t.str().hint('A model ID from the catalog; never invent one'),
	title: t.str().describe('The page title'),
	cursor: t.str().optional(),
	object: t.lit('user'),
	type: t.oneOf('person', 'bot'),
	tags: t.arr(t.str()),
	database: ref(notionDatabase),
	catalogModel: t.modelId('openai'),
	nextCursor: t.pageValue(t.str()).optional(),
	body: t.variant('type', {
		text: { text: t.str() },
		file: { file: t.binary() },
	}),
});

export const looseOwner = t.loose(t.obj({ id: t.str(), owner: t.obj({ login: t.str() }) }));
export const archivedPage = t.obj({ id: t.str(), title: t.str(), archived: t.bool().optional() });
export const member = t.obj({
	id: t.str(),
	age: t.int().optional(),
	role: t.oneOf('admin', 'member'),
});

export const upload = notion.action('upload', {
	action: 'Upload a file',
	summary: 'Upload a file.',
	flow: { effect: 'write', cardinality: 'per-item' },
	input: { file: t.binary() },
	output: t.obj({ id: t.str(), data: t.binary() }),
	async run({ input }) {
		return await Promise.resolve({ id: input.file.meta.fileName ?? 'file', data: input.file });
	},
});

const hook = t.obj({ id: t.str() });
const create = ({ url, secret }: { readonly url: string; readonly secret?: string }) => ({
	method: 'POST' as const,
	path: path`/hooks`,
	body: { url, secret },
});
const remove = ({ id }: { readonly id: string }) => ({
	method: 'DELETE' as const,
	path: path`/hooks/${id}`,
});

export const onEvent = notion.trigger('event', {
	trigger: 'On event',
	summary: 'Starts on each event that the service sends.',
	input: {},
	output: t.json(),
	webhook: {
		verify: {
			algorithm: 'sha256',
			header: 'x-hub-signature-256',
			prefix: 'sha256=',
			secret: 'generated',
		},
		register: { create, id: (body) => parse(hook, body).id ?? undefined, delete: remove },
		emit: (request) => [request.body],
	},
});

const event = t.obj({ id: t.str(), created: t.str() });

export const onPoll = notion.trigger('polled', {
	trigger: 'On new event',
	summary: 'Starts on each new event.',
	input: {},
	output: event,
	poll: {
		request: ({ since }) => ({ path: path`/events`, query: { since } }),
		response: t.obj({ events: t.arr(event) }),
		items: (body) => body.events,
		cursor: { timestamp: (item) => item.created, key: (item) => item.id },
	},
});

describe('JSDoc examples', () => {
	it('infer the value type of a schema', () => {
		const typed = t.obj({ id: t.str(), name: t.str().optional() });
		type User = Infer<typeof typed>; // { id: string; name?: string }
		expectTypeOf<User>().toEqualTypeOf<{ id: string; name?: string }>();
		expect(fields.json.required).toContain('body');
	});

	it('runAction runs an action against mockHttp', async () => {
		const fetch = mockHttp([{ path: '/users/u-1', reply: { json: { id: 'u-1', name: 'Ada' } } }]);
		const credential = { type: 'notionApi', data: { apiKey: 'k-1' } };
		const result = await runAction(getUser, { input: { user: 'u-1' }, credential, fetch });
		expect(result).toEqual({ ok: true, items: [{ id: 'u-1', name: 'Ada' }] });
	});

	it('mockHttp records the calls', async () => {
		const credential = { type: 'notionApi', data: { apiKey: 'k-1' } };
		const fetch = mockHttp([{ method: 'GET', path: '/users', reply: { json: { users: [] } } }]);
		await runAction(listUsers, { input: {}, credential, fetch });
		expect(fetch.calls[0]?.headers.authorization).toBe('Bearer k-1');
	});
});
