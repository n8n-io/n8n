import { proxyFetch } from '@n8n/ai-utilities';
import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError, OperationalError } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { DatabricksOAuth2Credential } from '@utils/databricks/token-provider';

import { createMlflowTransport } from '../transport';

vi.mock('@n8n/ai-utilities', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/ai-utilities')>()),
	proxyFetch: vi.fn(),
}));

const mockedProxyFetch = vi.mocked(proxyFetch);

const credential: DatabricksOAuth2Credential = {
	host: 'https://my.databricks.com/',
	grantType: 'clientCredentials',
	clientId: 'test-client-id',
	clientSecret: 'test-client-secret',
};

describe('createMlflowTransport', () => {
	let ctx: MockProxy<IExecuteFunctions>;
	let mockHelpers: MockProxy<IExecuteFunctions['helpers']>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockHelpers = mock<IExecuteFunctions['helpers']>();
		ctx = mock<IExecuteFunctions>({ helpers: mockHelpers });
		ctx.getNode.mockReturnValue(mock<INode>());
		ctx.getExecutionCancelSignal.mockReturnValue(undefined);

		mockHelpers.httpRequestWithAuthentication.mockResolvedValue({
			statusCode: 200,
			body: {},
			headers: {},
		});
		mockedProxyFetch.mockResolvedValue(new Response(null, { status: 200 }));
	});

	it('rejects a non-https workspace host before building either transport', () => {
		expect(() =>
			createMlflowTransport(ctx, { ...credential, host: 'http://my.databricks.com' }),
		).toThrow(NodeOperationError);
		expect(mockHelpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	describe('request', () => {
		it('authenticates through the databricksOAuth2Api credential', async () => {
			const { request } = createMlflowTransport(ctx, credential);

			await request({ method: 'GET', path: '/api/2.0/mlflow/experiments/get-by-name' });

			expect(mockHelpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'databricksOAuth2Api',
				expect.anything(),
			);
			expect(mockHelpers.httpRequestWithAuthentication.mock.contexts[0]).toBe(ctx);
		});

		it('builds the URL from the host and path, sends query params, and sets the timeout and partner User-Agent', async () => {
			const { request } = createMlflowTransport(ctx, credential);

			await request({
				method: 'GET',
				path: '/api/2.0/mlflow/experiments/get-by-name',
				qs: { experiment_name: '/Shared/x' },
			});

			const [, options] = mockHelpers.httpRequestWithAuthentication.mock.calls[0];
			expect(options).toMatchObject({
				method: 'GET',
				url: 'https://my.databricks.com/api/2.0/mlflow/experiments/get-by-name',
				qs: { experiment_name: '/Shared/x' },
				timeout: 60_000,
				headers: { 'User-Agent': DATABRICKS_PARTNER_USER_AGENT },
			});
		});

		it('passes the body through as-is, letting core serialize it', async () => {
			const { request } = createMlflowTransport(ctx, credential);

			await request({
				method: 'POST',
				path: '/api/2.0/mlflow/experiments/create',
				body: { name: 'x' },
			});

			const [, options] = mockHelpers.httpRequestWithAuthentication.mock.calls[0];
			expect(options).toMatchObject({ body: { name: 'x' } });
		});

		it('does not report a failure as status+body - it rejects, so core can refresh and retry', async () => {
			// `ignoreHttpStatusErrors` would make a non-2xx resolve instead of reject,
			// which would silently stop core's OAuth2 refresh-and-retry from ever
			// running (it only fires on a rejection) - see requestOAuth2 in
			// packages/core/.../request-helpers/oauth.ts.
			const { request } = createMlflowTransport(ctx, credential);
			await request({ method: 'GET', path: '/api/2.0/mlflow/experiments/get-by-name' });

			const [, options] = mockHelpers.httpRequestWithAuthentication.mock.calls[0];
			expect(options).not.toHaveProperty('ignoreHttpStatusErrors');
			expect(options).toMatchObject({ returnFullResponse: true });
		});

		it('reports the status and body of a failure caught from a thrown NodeApiError', async () => {
			mockHelpers.httpRequestWithAuthentication.mockRejectedValue(
				new NodeApiError(
					ctx.getNode(),
					{ response: { data: { error_code: 'RESOURCE_DOES_NOT_EXIST', message: 'not found' } } },
					{ httpCode: '404' },
				),
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

		it('rethrows a failure that is not a NodeApiError', async () => {
			mockHelpers.httpRequestWithAuthentication.mockRejectedValue(new Error('network down'));
			const { request } = createMlflowTransport(ctx, credential);

			await expect(
				request({ method: 'GET', path: '/api/2.0/mlflow/experiments/get-by-name' }),
			).rejects.toThrow('network down');
		});

		it('passes the credential domain allowlist through when the credential restricts domains', async () => {
			const { request } = createMlflowTransport(ctx, {
				...credential,
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'other.example.com',
			} as DatabricksOAuth2Credential);

			await request({ method: 'GET', path: '/api/2.0/mlflow/experiments/get-by-name' });

			const [, options] = mockHelpers.httpRequestWithAuthentication.mock.calls[0];
			expect(options.allowedDomains).toBe('my.databricks.com, other.example.com');
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

		it('PUTs the body to the signed URL with no bearer token, bypassing the credential entirely', async () => {
			const { upload } = createMlflowTransport(ctx, credential);

			await upload({ url: SIGNED_URI, body: '{"spans":[]}' });

			expect(mockHelpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
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
