import { createClient, N8nAppError, type RunResult } from '../index.js';

const jsonResponse = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status });

describe('createClient', () => {
	const fetchMock = vi.fn<typeof fetch>();

	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);
		fetchMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('sends the page token from the meta tag as bearer token', async () => {
		vi.stubGlobal('document', {
			querySelector: vi.fn((selector: string) =>
				selector === 'meta[name="n8n-app-token"]' ? { getAttribute: () => 'tok.en' } : null,
			),
		});
		fetchMock.mockResolvedValue(
			jsonResponse(200, { executionId: '1', status: 'success', principal: null }),
		);

		await createClient({ baseUrl: '/x' }).workflows.run('submit');

		expect(fetchMock.mock.calls[0][1]?.headers).toEqual([
			['Content-Type', 'application/json'],
			['Authorization', 'Bearer tok.en'],
		]);
	});

	it('sends no Authorization header when the page has no token', async () => {
		vi.stubGlobal('document', { querySelector: vi.fn(() => null) });
		fetchMock.mockResolvedValue(
			jsonResponse(200, { executionId: '1', status: 'success', principal: null }),
		);

		await createClient({ baseUrl: '/x' }).workflows.run('submit');

		expect(fetchMock.mock.calls[0][1]?.headers).toEqual([['Content-Type', 'application/json']]);
	});

	it('types the principal of an n8n app', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(200, { executionId: '1', status: 'success', principal: { userId: 'u1' } }),
		);

		const result = await createClient({ baseUrl: '/x' }).workflows.run('submit');

		expect(result.principal).toEqual({ userId: 'u1' });
	});

	describe('on 401', () => {
		const reload = vi.fn();

		beforeEach(() => {
			vi.stubGlobal('location', { pathname: '/apps/runner/', reload });
			reload.mockReset();
			fetchMock.mockImplementation(
				async () =>
					await Promise.resolve(
						jsonResponse(401, { code: 'unauthorized', message: 'Reload the app.' }),
					),
			);
		});

		it('reloads the page once and still rejects', async () => {
			await expect(createClient({ baseUrl: '/x' }).workflows.run('submit')).rejects.toMatchObject({
				status: 401,
				code: 'unauthorized',
			});
			await expect(createClient({ baseUrl: '/x' }).workflows.run('submit')).rejects.toMatchObject({
				status: 401,
				code: 'unauthorized',
			});

			expect(reload).toHaveBeenCalledTimes(1);
		});
	});

	it('posts the input as JSON to <baseUrl>/workflows/<key>', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(200, { executionId: '1', status: 'success', output: [], principal: null }),
		);

		await createClient({ baseUrl: '/apps/runner/api/' }).workflows.run('submit', { amount: 3 });

		expect(fetchMock).toHaveBeenCalledWith('/apps/runner/api/workflows/submit', {
			method: 'POST',
			headers: [['Content-Type', 'application/json']],
			body: '{"amount":3}',
			signal: undefined,
		});
	});

	it('prefers import.meta.env.VITE_N8N_API_BASE over BASE_URL', async () => {
		vi.stubEnv('VITE_N8N_API_BASE', '/apps/runner/api');
		vi.stubEnv('BASE_URL', '/preview/');
		fetchMock.mockResolvedValue(
			jsonResponse(200, { executionId: '1', status: 'success', principal: null }),
		);

		await createClient().workflows.run('submit');

		expect(fetchMock.mock.calls[0][0]).toBe('/apps/runner/api/workflows/submit');
	});

	it('derives the base URL from import.meta.env.BASE_URL', async () => {
		vi.stubEnv('BASE_URL', '/apps/runner/');
		fetchMock.mockResolvedValue(
			jsonResponse(200, { executionId: '1', status: 'success', principal: null }),
		);

		await createClient().workflows.run('submit');

		expect(fetchMock.mock.calls[0][0]).toBe('/apps/runner/api/workflows/submit');
	});

	it('falls back to the first two path segments of location.pathname', async () => {
		vi.stubEnv('BASE_URL', undefined);
		vi.stubGlobal('location', { pathname: '/apps/runner/orders/42' });
		fetchMock.mockResolvedValue(
			jsonResponse(200, { executionId: '1', status: 'success', principal: null }),
		);

		await createClient().workflows.run('submit');

		expect(fetchMock.mock.calls[0][0]).toBe('/apps/runner/api/workflows/submit');
	});

	it('resolves the base URL at run time, so createClient works without env and location', async () => {
		vi.stubEnv('BASE_URL', undefined);
		vi.stubGlobal('location', undefined);

		const client = createClient();

		await expect(client.workflows.run('submit')).rejects.toMatchObject({
			status: 0,
			code: 'no_base_url',
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('returns the 200 body', async () => {
		const body = {
			executionId: '1',
			status: 'success',
			output: [{ reply: 'got hi' }],
			principal: null,
		};
		fetchMock.mockResolvedValue(jsonResponse(200, body));

		await expect(createClient({ baseUrl: '/x' }).workflows.run('submit')).resolves.toEqual(body);
	});

	it('types outputTruncated and status unknown as they come from the server', async () => {
		const body = {
			executionId: '1',
			status: 'unknown',
			output: null,
			outputTruncated: true,
			principal: null,
		};
		fetchMock.mockResolvedValue(jsonResponse(200, body));

		const result: RunResult<unknown> = await createClient({ baseUrl: '/x' }).workflows.run(
			'submit',
		);

		expect(result.outputTruncated).toBe(true);
		expect(result.status).toBe('unknown');
	});

	it('returns the 202 body while the execution is still running', async () => {
		const body = { executionId: '1', status: 'running', principal: null };
		fetchMock.mockResolvedValue(jsonResponse(202, body));

		await expect(createClient({ baseUrl: '/x' }).workflows.run('submit')).resolves.toEqual(body);
	});

	it('throws N8nAppError with the server code on a non-2xx response', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(404, { code: 'binding_not_found', message: 'No binding "nope"' }),
		);

		const error = await createClient({ baseUrl: '/x' })
			.workflows.run('nope')
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(N8nAppError);
		expect(error).toMatchObject({
			status: 404,
			code: 'binding_not_found',
			message: 'No binding "nope"',
		});
	});

	it('throws N8nAppError with a fallback code when the error body is not JSON', async () => {
		fetchMock.mockResolvedValue(new Response('Too many requests', { status: 429 }));

		await expect(createClient({ baseUrl: '/x' }).workflows.run('submit')).rejects.toMatchObject({
			status: 429,
			code: 'request_failed',
		});
	});

	it('throws N8nAppError with status 0 when fetch itself fails', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

		const error = await createClient({ baseUrl: '/x' })
			.workflows.run('submit')
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(N8nAppError);
		expect(error).toMatchObject({ status: 0, code: 'request_failed' });
	});

	it('rethrows the abort error of the caller unchanged', async () => {
		const controller = new AbortController();
		const abortError = new DOMException('Aborted', 'AbortError');
		controller.abort();
		fetchMock.mockRejectedValue(abortError);

		await expect(
			createClient({ baseUrl: '/x' }).workflows.run('submit', undefined, {
				signal: controller.signal,
			}),
		).rejects.toBe(abortError);
	});
});
