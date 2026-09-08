import { createClient, N8nAppError } from '../index.js';

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
