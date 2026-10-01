import {
	arr,
	compat,
	custom,
	defineAction,
	defineNode,
	int,
	isHttpError,
	obj,
	str,
} from '../index';
import { mockHttp, runAction } from '../testing';

const todoApi = custom({
	name: 'todoApi',
	displayName: 'Todo API',
	fields: { workspace: str().with({ title: 'Workspace' }) },
	secrets: { apiKey: str().with({ title: 'API Key' }) },
	async authenticate({ apiKey, workspace }, request) {
		return await Promise.resolve({
			...request,
			headers: { ...request.headers, Authorization: `Bearer ${apiKey}` },
			qs: { ...request.qs, workspace },
		});
	},
	test: { request: { baseURL: 'https://todo.test/v1', url: '/me' } },
});

const todo = defineNode({
	id: 'todo',
	displayName: 'Todo',
	credentials: [todoApi],
	baseUrl: 'https://todo.test/v1',
});

const listTasks = defineAction({
	node: todo,
	id: 'todo.task.getAll',
	action: 'Get many tasks',
	summary: 'List tasks.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
	input: { limit: int().with({ minimum: 1 }).default(10), project: str().optional() },
	output: obj({ id: str(), tags: arr(str()) }),
	async run({ input, http, emit }) {
		const response = await http.request({ path: '/tasks', query: { limit: input.limit } });
		const tasks = Array.isArray(response) ? response : [];
		tasks.forEach((task) => emit(task));
	},
});

const credential = { type: 'todoApi', data: { apiKey: 'k-1', workspace: 'w-1' } };

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
		const result = await runAction(listTasks, { input: {}, credential, fetch });
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
		const result = await runAction(listTasks, { input: { limit: 0 }, credential });
		expect(result).toEqual({
			ok: false,
			error: { message: 'input.limit: must be at least 1', path: 'input.limit' },
		});
	});

	it('returns the path of an invalid output field', async () => {
		const fetch = mockHttp([{ path: '/tasks', reply: { json: [{ id: 't1', tags: 'a' }] } }]);
		const result = await runAction(listTasks, { input: {}, credential, fetch });
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
		const result = await runAction(listTasks, { input: {}, credential, fetch });
		expect(result).toEqual({
			ok: false,
			error: expect.objectContaining({ httpStatus: 404 }),
		});
	});

	it('throws an HttpError with the status, headers and body of a failed request', async () => {
		const retryAfter = defineAction({
			...listTasks,
			output: obj({ status: int(), retryAfter: str(), body: str() }),
			async run({ http, emit }) {
				try {
					await http.request({ path: '/tasks', retry: false });
				} catch (error) {
					if (!isHttpError(error)) throw error;
					const body = JSON.stringify(error.body);
					emit({ status: error.status, retryAfter: error.headers['retry-after'] ?? '', body });
				}
			},
		});
		const fetch = mockHttp([
			{
				path: '/tasks',
				reply: { status: 429, json: { error: 'slow' }, headers: { 'Retry-After': '2' } },
			},
		]);
		const result = await runAction(retryAfter, { input: {}, credential, fetch });
		expect(result).toEqual({
			ok: true,
			items: [{ status: 429, retryAfter: '2', body: '{"error":"slow"}' }],
		});
	});

	it('fails a request that no mock route matches', async () => {
		const fetch = mockHttp([{ method: 'POST', path: '/tasks', reply: { json: [] } }]);
		const result = await runAction(listTasks, { input: {}, credential, fetch });
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
		const result = await runAction(listTasks, { input: {}, credential, fetch });
		expect(result).toEqual({ ok: true, items: [] });
	});

	it('answers a route with "times" at most that many times', async () => {
		const fetch = mockHttp([
			{ path: '/tasks', times: 1, reply: { status: 404, json: { error: 'no' } } },
			{ path: '/tasks', reply: { json: [{ id: 't1', tags: [] }] } },
		]);
		const first = await runAction(listTasks, { input: {}, credential, fetch });
		const second = await runAction(listTasks, { input: {}, credential, fetch });
		expect([first.ok, second]).toEqual([false, { ok: true, items: [{ id: 't1', tags: [] }] }]);
	});

	it('fails a run that makes more calls than a test needs', async () => {
		const pageLoop = defineAction({
			...listTasks,
			id: 'todo.task.loop',
			async run({ http }) {
				for (;;) await http.request({ path: '/tasks' });
			},
		});
		const fetch = mockHttp([{ path: '/tasks', reply: { json: [] } }]);
		const result = await runAction(pageLoop, { input: {}, credential, fetch });
		expect(result.ok ? '' : result.error.message).toMatch(/^mockHttp: more than 1000 calls/);
		expect(fetch.calls).toHaveLength(1001);
	});

	it('needs a known credential', async () => {
		expect(await runAction(listTasks, { input: {} })).toEqual({
			ok: false,
			error: { message: 'todo.task.getAll needs a credential of type todoApi' },
		});
		const legacyApi = compat('todoLegacyApi');
		const legacy = defineAction({
			...listTasks,
			id: 'todo.task.getAll',
			node: { ...todo, credentials: [legacyApi] },
			credentials: [legacyApi],
		});
		const data = { type: 'todoLegacyApi', data: {} };
		expect(await runAction(legacy, { input: {}, credential: data })).toEqual({
			ok: false,
			error: { message: 'No credential definition for todoLegacyApi. Pass it in "credentials".' },
		});
	});
});
