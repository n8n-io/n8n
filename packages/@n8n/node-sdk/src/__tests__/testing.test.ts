import { arr, defineCredential, defineNode, int, isHttpError, obj, str } from '../index';
import { mockHttp, runAction } from '../testing';

const todoApi = defineCredential({
	name: 'todoApi',
	displayName: 'Todo API',
	properties: [
		{ name: 'apiKey', displayName: 'API Key', type: 'string', typeOptions: { password: true } },
		{ name: 'workspace', displayName: 'Workspace', type: 'string' },
	],
	authenticate: {
		headers: { Authorization: '=Bearer {{$credentials.apiKey}}' },
		qs: { workspace: '={{ $credentials.workspace }}' },
	},
	test: { request: { baseURL: 'https://todo.test/v1', url: '/me' } },
});

const todo = defineNode({
	id: 'todo',
	displayName: 'Todo',
	credentials: [todoApi.name],
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

const credential = { type: 'todoApi', data: { apiKey: 'k-1', workspace: 'w-1' } };
const credentials = [todoApi];

describe('defineCredential', () => {
	it('builds an n8n credential type with generic authentication', () => {
		expect(todoApi).toEqual({
			name: 'todoApi',
			displayName: 'Todo API',
			properties: [
				{
					name: 'apiKey',
					displayName: 'API Key',
					type: 'string',
					typeOptions: { password: true },
					default: '',
				},
				{
					name: 'workspace',
					displayName: 'Workspace',
					type: 'string',
					typeOptions: {},
					default: '',
				},
			],
			authenticate: {
				type: 'generic',
				properties: {
					headers: { Authorization: '=Bearer {{$credentials.apiKey}}' },
					qs: { workspace: '={{ $credentials.workspace }}' },
				},
			},
			test: { request: { baseURL: 'https://todo.test/v1', url: '/me' } },
		});
	});

	it('keeps an authenticate function', async () => {
		const signed = defineCredential({
			name: 'signedApi',
			displayName: 'Signed API',
			properties: [{ name: 'secret', displayName: 'Secret', type: 'string' }],
			authenticate: async (data, request) => ({
				...request,
				headers: { ...request.headers, 'x-signature': `sig-${data.secret as string}` },
			}),
		});
		const action = {
			...listTasks,
			node: { ...todo, credentials: ['signedApi'] },
			credentialTypes: ['signedApi'],
		};
		const fetch = mockHttp([{ path: '/tasks', reply: { json: [] } }]);
		const result = await runAction(action, {
			input: {},
			credential: { type: 'signedApi', data: { secret: 's' } },
			credentials: [signed],
			fetch,
		});
		expect(result).toEqual({ ok: true, items: [] });
		expect(fetch.calls[0]?.headers['x-signature']).toBe('sig-s');
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
		const result = await runAction(listTasks, { input: {}, credential, credentials, fetch });
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
		const result = await runAction(listTasks, { input: { limit: 0 }, credential, credentials });
		expect(result).toEqual({
			ok: false,
			error: { message: 'input.limit: must be at least 1', path: 'input.limit' },
		});
	});

	it('returns the path of an invalid output field', async () => {
		const fetch = mockHttp([{ path: '/tasks', reply: { json: [{ id: 't1', tags: 'a' }] } }]);
		const result = await runAction(listTasks, { input: {}, credential, credentials, fetch });
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
		const result = await runAction(listTasks, { input: {}, credential, credentials, fetch });
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
		const result = await runAction(retryAfter, { input: {}, credential, credentials, fetch });
		expect(result).toEqual({
			ok: true,
			items: [{ status: 429, retryAfter: '2', body: '{"error":"slow"}' }],
		});
	});

	it('fails a request that no mock route matches', async () => {
		const fetch = mockHttp([{ method: 'POST', path: '/tasks', reply: { json: [] } }]);
		const result = await runAction(listTasks, { input: {}, credential, credentials, fetch });
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
		const result = await runAction(listTasks, { input: {}, credential, credentials, fetch });
		expect(result).toEqual({ ok: true, items: [] });
	});

	it('answers a route with "times" at most that many times', async () => {
		const fetch = mockHttp([
			{ path: '/tasks', times: 1, reply: { status: 404, json: { error: 'no' } } },
			{ path: '/tasks', reply: { json: [{ id: 't1', tags: [] }] } },
		]);
		const first = await runAction(listTasks, { input: {}, credential, credentials, fetch });
		const second = await runAction(listTasks, { input: {}, credential, credentials, fetch });
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
		const result = await runAction(pageLoop, { input: {}, credential, credentials, fetch });
		expect(result.ok ? '' : result.error.message).toMatch(/^mockHttp: more than 1000 calls/);
		expect(fetch.calls).toHaveLength(1001);
	});

	it('needs a known credential', async () => {
		expect(await runAction(listTasks, { input: {} })).toEqual({
			ok: false,
			error: { message: 'todo.task.getAll needs a credential of type todoApi' },
		});
		expect(await runAction(listTasks, { input: {}, credential })).toEqual({
			ok: false,
			error: { message: 'No credential definition for todoApi. Pass it in "credentials".' },
		});
	});
});
