import { proxyFetch } from '@n8n/ai-utilities';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError, OperationalError } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { createDatabricksAuthFetch } from '@utils/databricks/auth-fetch';
import type { DatabricksOAuth2Credential } from '@utils/databricks/token-provider';

import { createMlflowTransport } from '../transport';

vi.mock('@n8n/ai-utilities', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities')>()),
	proxyFetch: vi.fn(),
}));

vi.mock('@utils/databricks/auth-fetch', () => ({
	createDatabricksAuthFetch: vi.fn(),
}));

const mockedProxyFetch = vi.mocked(proxyFetch);
const mockedCreateDatabricksAuthFetch = vi.mocked(createDatabricksAuthFetch);

const credential: DatabricksOAuth2Credential = {
	host: 'https://my.databricks.com/',
	grantType: 'clientCredentials',
	clientId: 'test-client-id',
	clientSecret: 'test-client-secret',
};

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), { status });
}

describe('createMlflowTransport', () => {
	let ctx: MockProxy<IExecuteFunctions>;
	let mockHelpers: MockProxy<IExecuteFunctions['helpers']>;
	let authFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockHelpers = mock<IExecuteFunctions['helpers']>();
		ctx = mock<IExecuteFunctions>({ helpers: mockHelpers });
		ctx.getNode.mockReturnValue(mock<INode>());
		ctx.getExecutionCancelSignal.mockReturnValue(undefined);

		authFetch = vi.fn().mockResolvedValue(jsonResponse(200, {}));
		mockedCreateDatabricksAuthFetch.mockReturnValue({
			fetch: authFetch as unknown as typeof fetch,
			tokenSource: { getToken: vi.fn(), expiredStatus: 403 },
		});
		mockedProxyFetch.mockResolvedValue(new Response(null, { status: 200 }));
	});

	it('rejects a non-https workspace host before building either transport', () => {
		expect(() =>
			createMlflowTransport(ctx, { ...credential, host: 'http://my.databricks.com' }),
		).toThrow(NodeOperationError);
		expect(mockedCreateDatabricksAuthFetch).not.toHaveBeenCalled();
	});

	describe('request', () => {
		it('authenticates through the shared Databricks auth fetch, with the host and egress filter', () => {
			const egressFilter = { validateUrl: vi.fn() };
			mockHelpers.getSecureEgressFilter.mockReturnValue(egressFilter as never);

			createMlflowTransport(ctx, credential);

			expect(mockedCreateDatabricksAuthFetch).toHaveBeenCalledWith(
				ctx,
				credential,
				expect.objectContaining({
					endpointUrl: 'https://my.databricks.com',
					egressFilter,
				}),
			);
		});

		it('builds the URL from the host and path, and sends query params', async () => {
			const { request } = createMlflowTransport(ctx, credential);

			await request({
				method: 'GET',
				path: '/api/2.0/mlflow/experiments/get-by-name',
				qs: { experiment_name: '/Shared/x' },
			});

			const [url, init] = authFetch.mock.calls[0];
			expect(url).toBe(
				'https://my.databricks.com/api/2.0/mlflow/experiments/get-by-name?experiment_name=%2FShared%2Fx',
			);
			expect(init).toMatchObject({
				method: 'GET',
				headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			});
		});

		it('serializes the body as JSON when present, and omits it otherwise', async () => {
			authFetch.mockImplementation(async () => jsonResponse(200, {}));
			const { request } = createMlflowTransport(ctx, credential);

			await request({
				method: 'POST',
				path: '/api/2.0/mlflow/experiments/create',
				body: { name: 'x' },
			});
			expect(authFetch.mock.calls[0][1]).toMatchObject({ body: JSON.stringify({ name: 'x' }) });

			await request({ method: 'GET', path: '/api/2.0/mlflow/experiments/get-by-name' });
			expect(authFetch.mock.calls[1][1]).toMatchObject({ body: undefined });
		});

		it('reports the status and parsed body instead of throwing on a failure response', async () => {
			authFetch.mockResolvedValue(
				jsonResponse(404, { error_code: 'RESOURCE_DOES_NOT_EXIST', message: 'not found' }),
			);
			const { request } = createMlflowTransport(ctx, credential);

			const result = await request({
				method: 'GET',
				path: '/api/2.0/mlflow/experiments/get-by-name',
			});

			expect(result).toEqual({
				status: 404,
				body: { error_code: 'RESOURCE_DOES_NOT_EXIST', message: 'not found' },
			});
		});

		it('falls back to the raw text when the body is not JSON', async () => {
			authFetch.mockResolvedValue(new Response('not json', { status: 500 }));
			const { request } = createMlflowTransport(ctx, credential);

			const result = await request({
				method: 'GET',
				path: '/api/2.0/mlflow/experiments/get-by-name',
			});

			expect(result).toEqual({ status: 500, body: 'not json' });
		});

		it('reports an empty body as an empty object', async () => {
			authFetch.mockResolvedValue(new Response('', { status: 200 }));
			const { request } = createMlflowTransport(ctx, credential);

			const result = await request({
				method: 'GET',
				path: '/api/2.0/mlflow/experiments/get-by-name',
			});

			expect(result).toEqual({ status: 200, body: {} });
		});
	});

	describe('upload', () => {
		const SIGNED_URI =
			'https://germanywestcentral.storage.azuredatabricks.net/api/2.0/fs/files/x/traces.json?sig=secret';

		it('rejects an http upload URL without sending it anywhere', async () => {
			const { upload } = createMlflowTransport(ctx, credential);

			await expect(
				upload({ url: 'http://storage.example.com/traces.json', body: '{}' }),
			).rejects.toThrow(NodeOperationError);
			expect(mockedProxyFetch).not.toHaveBeenCalled();
		});

		it('rejects an unparseable upload URL', async () => {
			const { upload } = createMlflowTransport(ctx, credential);

			await expect(upload({ url: 'not a url', body: '{}' })).rejects.toThrow(NodeOperationError);
			expect(mockedProxyFetch).not.toHaveBeenCalled();
		});

		it('PUTs the body to the signed URL with no bearer token, bypassing the workspace auth fetch', async () => {
			const { upload } = createMlflowTransport(ctx, credential);

			await upload({ url: SIGNED_URI, body: '{"spans":[]}' });

			expect(authFetch).not.toHaveBeenCalled();
			const [{ input, init }] = mockedProxyFetch.mock.calls[0];
			expect(input).toBe(SIGNED_URI);
			expect(init).toMatchObject({ method: 'PUT', body: '{"spans":[]}' });
			expect(new Headers(init?.headers).has('authorization')).toBe(false);
		});

		it('throws an OperationalError, not a plain Error, when the upload fails', async () => {
			mockedProxyFetch.mockResolvedValue(new Response(null, { status: 500 }));
			const { upload } = createMlflowTransport(ctx, credential);

			await expect(upload({ url: SIGNED_URI, body: '{}' })).rejects.toThrow(OperationalError);
			await expect(upload({ url: SIGNED_URI, body: '{}' })).rejects.toThrow('HTTP 500');
		});

		it('combines the request timeout with the execution cancel signal', async () => {
			const cancelController = new AbortController();
			ctx.getExecutionCancelSignal.mockReturnValue(cancelController.signal);
			cancelController.abort();

			const { upload } = createMlflowTransport(ctx, credential);
			await upload({ url: SIGNED_URI, body: '{}' });

			const [{ init }] = mockedProxyFetch.mock.calls[0];
			expect(init?.signal?.aborted).toBe(true);
		});
	});
});
