import { createClient, N8nAppError } from '../index.js';

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

function sse(lines: string[]) {
	return new Response(lines.join(''), { headers: { 'Content-Type': 'text/event-stream' } });
}

const fetchMock = vi.fn<typeof fetch>();

function lastCall(index = -1) {
	const call = fetchMock.mock.calls.at(index);
	if (!call) throw new Error('fetch was not called');
	const [input, init = {}] = call;
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
	return { url, init, body };
}

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('createClient', () => {
	it('calls the same-origin app API with the app request header', async () => {
		fetchMock.mockResolvedValue(json({ user: null, visibility: 'public' }));

		const me = await createClient().me();

		expect(me).toEqual({ user: null, visibility: 'public' });
		const { url, init } = lastCall();
		expect(url).toBe('/_n8n/api/v1/me');
		expect(init.credentials).toBe('same-origin');
		expect(init.headers).toEqual({ 'x-n8n-app-request': '1' });
	});

	it('turns an error body into N8nAppError', async () => {
		fetchMock.mockResolvedValue(json({ code: 'permission_denied', message: 'No.' }, 403));

		const error = await createClient()
			.tables.tasks.insert([{ title: 'x' }])
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(N8nAppError);
		expect(error).toMatchObject({ status: 403, code: 'permission_denied', message: 'No.' });
	});

	describe('tables', () => {
		it('sends list options as query parameters', async () => {
			fetchMock.mockResolvedValue(json({ count: 0, data: [] }));
			const filter = { filters: [{ columnName: 'done', value: false }] };

			await createClient().tables.tasks.list({ filter, sortBy: 'title:asc', take: 5 });

			const url = new URL(lastCall().url, 'https://app.test');
			expect(url.pathname).toBe('/_n8n/api/v1/tables/tasks/rows');
			expect(JSON.parse(url.searchParams.get('filter') ?? '')).toEqual(filter);
			expect(url.searchParams.get('sortBy')).toBe('title:asc');
			expect(url.searchParams.get('take')).toBe('5');
		});

		it('deletes with a JSON body on a POST route', async () => {
			fetchMock.mockResolvedValue(json({ data: [] }));
			const filter = { filters: [{ columnName: 'id', value: 1 }] };

			await createClient().tables.tasks.delete(filter);

			const { url, init, body } = lastCall();
			expect(url).toBe('/_n8n/api/v1/tables/tasks/rows/delete');
			expect(init.method).toBe('POST');
			expect(init.headers).toEqual({
				'x-n8n-app-request': '1',
				'Content-Type': 'application/json',
			});
			expect(body).toEqual({ filter });
		});
	});

	describe('workflows', () => {
		it('polls a long run until it finishes', async () => {
			vi.useFakeTimers();
			fetchMock
				.mockResolvedValueOnce(json({ executionId: '9', status: 'running' }, 202))
				.mockResolvedValueOnce(json({ executionId: '9', status: 'running' }, 202))
				.mockResolvedValueOnce(
					json({ executionId: '9', status: 'success', output: [{ ok: true }] }),
				);

			const pending = createClient().workflows.submit.run({ email: 'a@b.c' });
			await vi.runAllTimersAsync();
			const result = await pending;

			expect(result).toEqual({ executionId: '9', status: 'success', output: [{ ok: true }] });
			expect(lastCall(0).url).toBe('/_n8n/api/v1/workflows/submit/run');
			expect(lastCall().url).toBe('/_n8n/api/v1/workflows/submit/runs/9');
		});

		it('removes the abort listener after each poll', async () => {
			vi.useFakeTimers();
			fetchMock
				.mockResolvedValueOnce(json({ executionId: '9', status: 'running' }, 202))
				.mockResolvedValueOnce(json({ executionId: '9', status: 'running' }, 202))
				.mockResolvedValueOnce(json({ executionId: '9', status: 'success', output: [] }));
			const { signal } = new AbortController();
			const add = vi.spyOn(signal, 'addEventListener');
			const remove = vi.spyOn(signal, 'removeEventListener');

			const pending = createClient().workflows.submit.run({}, { signal });
			await vi.runAllTimersAsync();
			await pending;

			const pollListeners = add.mock.calls.filter(([type]) => type === 'abort').map(([, l]) => l);
			expect(pollListeners.length).toBeGreaterThan(0);
			for (const listener of pollListeners) {
				expect(remove).toHaveBeenCalledWith('abort', listener);
			}
		});

		it('returns a running result at once when asked not to wait', async () => {
			fetchMock.mockResolvedValue(json({ executionId: '9', status: 'running' }, 202));

			const result = await createClient().workflows.submit.run({}, { wait: false });

			expect(result.status).toBe('running');
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
	});

	describe('agents', () => {
		it('reuses one session and joins the streamed text', async () => {
			fetchMock.mockImplementation(async () =>
				sse([
					':ok\n\n',
					`data: ${JSON.stringify({ type: 'text-delta', id: '1', delta: 'Hel' })}\n\n`,
					`data: ${JSON.stringify({ type: 'text-delta', id: '1', delta: 'lo' })}\n\n`,
					`data: ${JSON.stringify({ type: 'done' })}\n\n`,
				]),
			);
			const client = createClient();

			expect(await client.agents.support.chat('Hi').text()).toBe('Hello');
			await client.agents.support.chat('Again').text();

			const first = lastCall(0).body as { sessionId: string };
			const second = lastCall(1).body as { sessionId: string };
			expect(first.sessionId).toMatch(/^[0-9a-f-]{36}$/);
			expect(second.sessionId).toBe(first.sessionId);
		});

		it('throws on an error event', async () => {
			fetchMock.mockResolvedValue(
				sse([
					`data: ${JSON.stringify({ type: 'error', message: 'The agent could not answer.' })}\n\n`,
				]),
			);

			await expect(createClient().agents.support.chat('Hi').text()).rejects.toMatchObject({
				code: 'execution_failed',
				message: 'The agent could not answer.',
			});
		});

		it('starts a new session on request', () => {
			const agent = createClient().agents.support;
			const first = agent.sessionId();
			const next = agent.newSession();
			expect(next).not.toBe(first);
			expect(agent.sessionId()).toBe(next);
		});
	});
});
