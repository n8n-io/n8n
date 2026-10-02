import {
	arr,
	compat,
	credential,
	credentialType,
	defineNode,
	int,
	isHttpError,
	isRecord,
	obj,
	str,
	t,
	toCredentialType,
} from '../index';
import { mockHttp, runAction } from '../testing';

const todoApi = credentialType({
	id: 'todo.token',
	legacyName: 'todoApi',
	displayName: 'Todo API',
	fields: { workspace: t.text('Workspace'), apiKey: t.secret('API Key') },
	baseUrl: 'https://todo.test/v1',
	auth: (a) =>
		a.custom({
			reason: 'Test of the escape hatch',
			async sign({ apiKey: key, workspace }, request) {
				return await Promise.resolve({
					...request,
					headers: { ...request.headers, Authorization: `Bearer ${key}` },
					qs: { ...request.qs, workspace },
				});
			},
		}),
	test: { get: '/me' },
});

const todo = defineNode({
	id: 'todo',
	displayName: 'Todo',
	credential: credential({ types: [todoApi] }),
	baseUrl: 'https://todo.test/v1',
});

const task = todo.resource('task');

const listSpec = {
	action: 'Get many tasks',
	summary: 'List tasks.',
	input: { limit: int().with({ minimum: 1 }).default(10), project: str().optional() },
	output: obj({ id: str(), tags: arr(str()) }),
};

const listTasks = task.action('getAll', {
	...listSpec,
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	async *run({ input, http }) {
		const response = await http.request({ path: '/tasks', query: { limit: input.limit } });
		yield* Array.isArray(response) ? response : [];
	},
});

const todoCredential = { type: 'todoApi', data: { apiKey: 'k-1', workspace: 'w-1' } };

describe('credential types', () => {
	it('project an API key to an n8n type with generic authentication', () => {
		const keyed = credentialType({
			id: 'key.apiKey',
			legacyName: 'keyApi',
			displayName: 'Key API',
			fields: { apiKey: t.secret('API Key') },
			baseUrl: 'https://todo.test/v1',
			auth: (a) => a.header('X-Api-Key', '{apiKey}'),
			test: { get: '/me' },
		});
		expect(toCredentialType(keyed)).toEqual({
			name: 'keyApi',
			displayName: 'Key API',
			properties: [
				{
					name: 'apiKey',
					displayName: 'API Key',
					type: 'string',
					required: true,
					typeOptions: { password: true },
					default: '',
				},
			],
			authenticate: {
				type: 'generic',
				properties: { headers: { 'X-Api-Key': '={{$credentials.apiKey}}' } },
			},
			test: { request: { baseURL: 'https://todo.test/v1', url: '/me' } },
		});
	});

	it('sign each request with a custom authenticate', async () => {
		const fetch = mockHttp([{ path: '/tasks', reply: { json: [] } }]);
		const result = await runAction(listTasks, { input: {}, credential: todoCredential, fetch });
		expect(result).toEqual({ ok: true, items: [] });
		expect(fetch.calls[0]?.headers.authorization).toBe('Bearer k-1');
	});
});

describe('runAction', () => {
	it('applies the credential and parameter defaults, and returns the items', async () => {
		const fetch = mockHttp([
			{
				method: 'GET',
				path: '/tasks',
				query: { limit: 10 },
				reply: { json: [{ id: 't1', tags: ['a'] }] },
			},
		]);
		const result = await runAction(listTasks, { input: {}, credential: todoCredential, fetch });
		expect(result).toEqual({ ok: true, items: [{ id: 't1', tags: ['a'] }] });
		expect(fetch.calls).toEqual([
			expect.objectContaining({
				method: 'GET',
				url: 'https://todo.test/v1/tasks?limit=10&workspace=w-1',
				headers: { authorization: 'Bearer k-1' },
			}),
		]);
	});

	it('returns the path of an invalid input field', async () => {
		const result = await runAction(listTasks, { input: { limit: 0 }, credential: todoCredential });
		expect(result).toEqual({
			ok: false,
			error: { message: 'input.limit: must be at least 1', path: 'input.limit' },
		});
	});

	it('returns the path of an invalid output field', async () => {
		const fetch = mockHttp([{ path: '/tasks', reply: { json: [{ id: 't1', tags: 'a' }] } }]);
		const result = await runAction(listTasks, { input: {}, credential: todoCredential, fetch });
		expect(result).toEqual({
			ok: false,
			error: {
				message: 'Output does not match the contract: output[0].tags: must be array, got "a"',
				path: 'output[0].tags',
			},
		});
	});

	it('returns the HTTP status of a failed request', async () => {
		const fetch = mockHttp([{ path: '/tasks', reply: { status: 404, json: { error: 'no' } } }]);
		const result = await runAction(listTasks, { input: {}, credential: todoCredential, fetch });
		expect(result).toEqual({
			ok: false,
			error: expect.objectContaining({ httpStatus: 404 }),
		});
	});

	it('throws an HttpError with the status, headers and body of a failed request', async () => {
		const retryAfter = task.action('getAll', {
			...listSpec,
			flow: { effect: 'read', cardinality: 'per-item' },
			output: obj({ status: int(), retryAfter: str(), body: str() }),
			async run({ http }) {
				const error = await http.request({ path: '/tasks', retry: false }).then(
					() => undefined,
					(caught: unknown) => caught,
				);
				if (!isHttpError(error)) throw new Error('The request did not fail');
				const body = JSON.stringify(error.body);
				return { status: error.status, retryAfter: error.headers['retry-after'] ?? '', body };
			},
		});
		const fetch = mockHttp([
			{
				path: '/tasks',
				reply: { status: 429, json: { error: 'slow' }, headers: { 'Retry-After': '2' } },
			},
		]);
		const result = await runAction(retryAfter, { input: {}, credential: todoCredential, fetch });
		expect(result).toEqual({
			ok: true,
			items: [{ status: 429, retryAfter: '2', body: '{"error":"slow"}' }],
		});
	});

	it('fails a request that no mock route matches', async () => {
		const fetch = mockHttp([{ method: 'POST', path: '/tasks', reply: { json: [] } }]);
		const result = await runAction(listTasks, { input: {}, credential: todoCredential, fetch });
		expect(result).toEqual({
			ok: false,
			error: {
				message: 'mockHttp: no route for GET /v1/tasks?limit=10&workspace=w-1. Routes: POST /tasks',
			},
		});
	});

	it('answers from the route with the most matching query parameters', async () => {
		const fetch = mockHttp([
			{ path: '/tasks', query: { limit: 10 }, reply: { json: [{ id: 'first', tags: [] }] } },
			{ path: '/tasks', query: { limit: 10, workspace: 'w-1' }, reply: { json: [] } },
		]);
		const result = await runAction(listTasks, { input: {}, credential: todoCredential, fetch });
		expect(result).toEqual({ ok: true, items: [] });
	});

	it('answers a route with "times" at most that many times', async () => {
		const fetch = mockHttp([
			{ path: '/tasks', times: 1, reply: { status: 404, json: { error: 'no' } } },
			{ path: '/tasks', reply: { json: [{ id: 't1', tags: [] }] } },
		]);
		const first = await runAction(listTasks, { input: {}, credential: todoCredential, fetch });
		const second = await runAction(listTasks, { input: {}, credential: todoCredential, fetch });
		expect([first.ok, second]).toEqual([false, { ok: true, items: [{ id: 't1', tags: [] }] }]);
	});

	it('fails a run that makes more calls than a test needs', async () => {
		const pageLoop = task.action('loop', {
			...listSpec,
			flow: listTasks.flow,
			async *run({ http }) {
				for (;;) {
					const page = await http.request({ path: '/tasks' });
					yield* Array.isArray(page) ? page : [];
				}
			},
		});
		const fetch = mockHttp([{ path: '/tasks', reply: { json: [] } }]);
		const result = await runAction(pageLoop, { input: {}, credential: todoCredential, fetch });
		expect(result.ok ? '' : result.error.message).toMatch(/^mockHttp: more than 1000 calls/);
		expect(fetch.calls).toHaveLength(1001);
	});

	it('needs a known credential', async () => {
		expect(await runAction(listTasks, { input: {} })).toEqual({
			ok: false,
			error: { message: 'todo.task.getAll needs a credential of type todoApi' },
		});
		const legacy = {
			...listTasks,
			node: { ...todo, credential: credential({ types: [compat('legacyApi')] }) },
			credentialTypes: ['legacyApi'],
		};
		const legacyCredential = { type: 'legacyApi', data: {} };
		expect(await runAction(legacy, { input: {}, credential: legacyCredential })).toEqual({
			ok: false,
			error: { message: 'No credential definition for legacyApi. Pass it in "credentials".' },
		});
	});
});

describe('runAction with an exchange credential', () => {
	const sessionApi = credentialType({
		id: 'session.login',
		legacyName: 'sessionApi',
		displayName: 'Session API',
		fields: { url: t.url('URL'), username: t.text('Username'), password: t.secret('Password') },
		baseUrl: '{url}',
		auth: (a) =>
			a.exchange({
				post: '{url}/api/session',
				json: { username: '{username}', password: '{password}' },
				token: { path: 'id', field: 'sessionToken' },
				headers: { 'X-Session': '{$token}' },
			}),
	});
	const session = defineNode({
		id: 'session',
		displayName: 'Session',
		credential: credential({ types: [sessionApi] }),
	});
	const seen: unknown[] = [];
	const twice = session.action('twice', {
		action: 'Read twice',
		summary: 'Read the user twice.',
		flow: { effect: 'read', cardinality: 'per-item' },
		input: {},
		output: obj({ id: str() }),
		async run({ http, credential: used }) {
			seen.push(used);
			await http.request({ path: '/api/user' });
			const user = await http.request({ path: '/api/user' });
			return isRecord(user) && typeof user.id === 'string' ? { id: user.id } : { id: '' };
		},
	});
	const data = { url: 'https://bi.acme.test', username: 'ada', password: 'pw-secret-1' };

	it('logs in once for two requests, and once more after a 401', async () => {
		const fetch = mockHttp([
			{ method: 'POST', path: '/api/session', reply: { json: { id: 'session-secret-1' } } },
			{ path: '/api/user', times: 1, reply: { json: { id: 'u-1' } } },
			{ path: '/api/user', times: 1, reply: { status: 401, json: { message: 'expired' } } },
			{ path: '/api/user', reply: { json: { id: 'u-1' } } },
		]);
		const result = await runAction(twice, {
			input: {},
			credential: { type: 'sessionApi', data },
			fetch,
		});
		expect(result).toEqual({ ok: true, items: [{ id: 'u-1' }] });
		expect(fetch.calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
			'POST /api/session',
			'GET /api/user',
			'GET /api/user',
			'POST /api/session',
			'GET /api/user',
		]);
		expect(fetch.calls[0]?.body).toEqual({ username: 'ada', password: 'pw-secret-1' });
		expect(fetch.calls[4]?.headers['x-session']).toBe('session-secret-1');
		expect(seen.at(-1)).toEqual({
			type: 'sessionApi',
			fields: { url: 'https://bi.acme.test', username: 'ada' },
		});
	});

	it('keeps the token and the password out of the error text', async () => {
		const fetch = mockHttp([
			{ method: 'POST', path: '/api/session', reply: { json: { id: 'session-secret-1' } } },
			{
				path: '/api/user',
				reply: { status: 500, json: { echo: 'session-secret-1 pw-secret-1' } },
			},
		]);
		const result = await runAction(twice, {
			input: {},
			credential: { type: 'sessionApi', data },
			fetch,
		});
		expect(result.ok).toBe(false);
		expect(JSON.stringify(result)).not.toMatch(/session-secret-1|pw-secret-1/);
	});
});
