import FormData from 'form-data';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { clearAtlassianAccessibleResourcesCache } from '@utils/atlassian';

import {
	confluenceApiRequest,
	confluenceApiRequestBinary,
	confluenceApiRequestUpload,
} from '../../transport';

const accessibleResources = [
	{ id: 'cloud-1', url: 'https://example.atlassian.net', name: 'example' },
	{ id: 'cloud-2', url: 'https://Other.Atlassian.NET' },
];

const siteByUrl = (url: string) => ({ __rl: true, mode: 'url', value: url });

// Simulates a genuinely (not-expiry-related) failing gateway call: accessible-resources
// keeps succeeding (so a forced refresh is a no-op) while every actual gateway
// request rejects with `error`, on both the first attempt and the retry.
function alwaysFailGatewayCalls(mock: Mock, error: unknown): void {
	mock.mockImplementation(async (_credentialType: string, options: { url: string }) => {
		if (options.url === 'https://api.atlassian.com/oauth/token/accessible-resources') {
			return accessibleResources;
		}
		throw error;
	});
}

const pageNotFoundResponse = {
	message: 'Request failed with status code 404',
	response: {
		status: 404,
		data: {
			errors: [
				{
					status: 404,
					code: 'NOT_FOUND',
					title: 'Page not found',
					detail: 'No page with this ID exists',
				},
			],
		},
	},
};

describe('confluenceApiRequest', () => {
	let ctx: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockHttpRequestWithAuthentication: Mock;

	async function captureRejection(endpoint: string): Promise<NodeApiError | null> {
		return await confluenceApiRequest
			.call(ctx, 'GET', endpoint)
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);
	}

	function failNextRequest(error: unknown): void {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockRejectedValueOnce(error);
	}

	function failNextRequestWrapped(payload: JsonObject): NodeApiError {
		const wrapped = new NodeApiError(mockNode, payload);
		failNextRequest(wrapped);
		return wrapped;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		clearAtlassianAccessibleResourcesCache();
		ctx = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = vi.fn().mockResolvedValue(accessibleResources);
		ctx.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;

		mockNode = {
			id: 'test-node',
			name: 'Test Confluence Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { confluenceCloudOAuth2Api: { id: 'cred-1', name: 'account' } },
		};
		ctx.getNode.mockReturnValue(mockNode);
		ctx.getNodeParameter.mockReturnValue(siteByUrl('https://example.atlassian.net/wiki') as never);
	});

	it('routes requests to https://api.atlassian.com/ex/confluence/{cloudId}', async () => {
		await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		expect(ctx.getNodeParameter).toHaveBeenCalledWith('site', 0, null);
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'confluenceCloudOAuth2Api',
			expect.objectContaining({
				url: 'https://api.atlassian.com/oauth/token/accessible-resources',
			}),
		);
		expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'confluenceCloudOAuth2Api',
			expect.objectContaining({
				url: 'https://api.atlassian.com/ex/confluence/cloud-1/wiki/api/v2/pages',
			}),
		);
	});

	it('reuses the cached cloudId across requests', async () => {
		await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');
		await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/spaces');

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(3);
		const urls = mockHttpRequestWithAuthentication.mock.calls.map(([, options]) => options.url);
		expect(urls).toEqual([
			'https://api.atlassian.com/oauth/token/accessible-resources',
			'https://api.atlassian.com/ex/confluence/cloud-1/wiki/api/v2/pages',
			'https://api.atlassian.com/ex/confluence/cloud-1/wiki/api/v2/spaces',
		]);
	});

	it('passes method, body and qs through', async () => {
		const body = { title: 'New page' };
		const qs = { limit: 25 };

		await confluenceApiRequest.call(ctx, 'POST', '/wiki/api/v2/pages', body, qs);

		expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'confluenceCloudOAuth2Api',
			expect.objectContaining({ method: 'POST', body, qs, json: true }),
		);
	});

	it('sends an array body through as an array', async () => {
		const body = [{ prefix: 'global', name: 'a' }];

		await confluenceApiRequest.call(ctx, 'POST', '/wiki/rest/api/content/1/label', body);

		expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'confluenceCloudOAuth2Api',
			expect.objectContaining({ body: [{ prefix: 'global', name: 'a' }] }),
		);
	});

	it('defaults body and qs to empty objects', async () => {
		await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'confluenceCloudOAuth2Api',
			expect.objectContaining({ body: {}, qs: {}, json: true }),
		);
	});

	it('wraps request failures in NodeApiError, keeping status and message', async () => {
		// 500 (not 404/403) so this test exercises plain wrapping, not the expired-token retry
		failNextRequest({ message: 'boom', response: { status: 500 } });

		const error = await captureRejection('/wiki/api/v2/pages');

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe('500');
		expect(error?.messages).toContain('boom');
	});

	it("surfaces Atlassian's v2 error envelope instead of the generic status message", async () => {
		// A page that's genuinely gone still 404s after the forced-refresh retry
		alwaysFailGatewayCalls(mockHttpRequestWithAuthentication, pageNotFoundResponse);

		const error = await captureRejection('/wiki/api/v2/pages/1');

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.message).toBe('Page not found');
		expect(error?.description).toBe('No page with this ID exists');
	});

	it('retries once after forcing a token refresh when the gateway 404s a v2 path', async () => {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources) // cloudId lookup
			.mockRejectedValueOnce({ message: 'boom', response: { status: 404 } }) // expired token
			.mockResolvedValueOnce(accessibleResources) // forced refresh
			.mockResolvedValueOnce({ results: [] }); // retried request succeeds

		const data = await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		expect(data).toEqual({ results: [] });
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(4);
		expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
			3,
			'confluenceCloudOAuth2Api',
			expect.objectContaining({
				url: 'https://api.atlassian.com/oauth/token/accessible-resources',
			}),
		);
	});

	it('retries once after forcing a token refresh when the gateway 403s a v1 path', async () => {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockRejectedValueOnce({
				message: 'boom',
				response: {
					status: 403,
					data: { message: 'Current user not permitted to use Confluence' },
				},
			})
			.mockResolvedValueOnce(accessibleResources)
			.mockResolvedValueOnce({ results: [] });

		const data = await confluenceApiRequest.call(ctx, 'GET', '/wiki/rest/api/search');

		expect(data).toEqual({ results: [] });
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(4);
	});

	it('does not loop on a genuinely deleted page: exactly one retry, then the 404 surfaces', async () => {
		alwaysFailGatewayCalls(mockHttpRequestWithAuthentication, {
			message: 'boom',
			response: { status: 404 },
		});

		await captureRejection('/wiki/api/v2/pages/999');

		// cloudId lookup, first attempt, forced refresh, retry. No more than that.
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(4);
	});

	it('falls back to the generic wrap when the envelope carries no usable title', async () => {
		failNextRequest({
			message: 'boom',
			response: { status: 500, data: { errors: [{ title: '' }] } },
		});

		const error = await captureRejection('/wiki/api/v2/pages');

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe('500');
		expect(error?.messages).toContain('boom');
	});

	// In production the request helper rejects with an already-wrapped NodeApiError; these cases pin that path
	it('surfaces the v1 top-level message from a wrapped NodeApiError', async () => {
		const wrapped = failNextRequestWrapped({
			message: 'Request failed with status code 400',
			response: {
				status: 400,
				data: {
					statusCode: 400,
					data: { authorized: true, valid: false, errors: [], successful: false },
					message: 'Could not parse cql : expecting alphanumeric',
				},
			},
		} as JsonObject);

		const error = await captureRejection('/wiki/rest/api/search');

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).not.toBe(wrapped);
		expect(error?.message).toBe('Could not parse cql : expecting alphanumeric');
		expect(error?.httpCode).toBe('400');
		expect(error?.context.data).toEqual({
			statusCode: 400,
			data: { authorized: true, valid: false, errors: [], successful: false },
			message: 'Could not parse cql : expecting alphanumeric',
		});
	});

	it("surfaces Atlassian's v2 envelope from a wrapped NodeApiError", async () => {
		// Same not-actually-expired case as above, but pinning the pre-wrapped-NodeApiError path
		alwaysFailGatewayCalls(
			mockHttpRequestWithAuthentication,
			new NodeApiError(mockNode, pageNotFoundResponse as JsonObject),
		);

		const error = await captureRejection('/wiki/api/v2/pages/1');

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.message).toBe('Page not found');
		expect(error?.description).toBe('No page with this ID exists');
		expect(error?.httpCode).toBe('404');
	});

	it('rethrows a wrapped NodeApiError unchanged when there is no response body', async () => {
		const wrapped = failNextRequestWrapped({ message: 'socket hang up' } as JsonObject);

		const error = await captureRejection('/wiki/api/v2/pages');

		expect(error).toBe(wrapped);
	});

	it('surfaces the cloudId lookup error when no site matches the By URL value', async () => {
		ctx.getNodeParameter.mockReturnValue(siteByUrl('https://missing.atlassian.net') as never);

		await expect(confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages')).rejects.toThrow(
			'No Confluence site matched "https://missing.atlassian.net"',
		);
	});

	it('uses a From List selection as the cloudId directly, without the resources lookup', async () => {
		ctx.getNodeParameter.mockReturnValue({ __rl: true, mode: 'list', value: 'cloud-2' } as never);
		mockHttpRequestWithAuthentication.mockResolvedValueOnce({ results: [] });

		await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'confluenceCloudOAuth2Api',
			expect.objectContaining({
				url: 'https://api.atlassian.com/ex/confluence/cloud-2/wiki/api/v2/pages',
			}),
		);
	});

	it('auto-resolves an empty Site parameter when the connection reaches one site', async () => {
		ctx.getNodeParameter.mockReturnValue({ __rl: true, mode: 'list', value: '' } as never);
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce([accessibleResources[0]])
			.mockResolvedValueOnce({ results: [] });

		await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'confluenceCloudOAuth2Api',
			expect.objectContaining({
				url: 'https://api.atlassian.com/ex/confluence/cloud-1/wiki/api/v2/pages',
			}),
		);
	});

	it('asks to pick a site when the Site parameter is empty and several sites are reachable', async () => {
		ctx.getNodeParameter.mockReturnValue({ __rl: true, mode: 'list', value: '' } as never);

		const promise = confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow(
			"This connection can access: https://example.atlassian.net, https://Other.Atlassian.NET — pick a site in the 'Site' parameter.",
		);
	});

	it('reads the Site parameter through getCurrentNodeParameter in a load-options context', async () => {
		const loadOptionsCtx = mockDeep<ILoadOptionsFunctions>({
			getNode: vi.fn(() => mockNode),
			getCurrentNodeParameter: vi.fn(() => siteByUrl('https://other.atlassian.net')),
			helpers: { httpRequestWithAuthentication: mockHttpRequestWithAuthentication },
		});

		await confluenceApiRequest.call(loadOptionsCtx, 'GET', '/wiki/api/v2/spaces');

		expect(loadOptionsCtx.getCurrentNodeParameter).toHaveBeenCalledWith('site');
		expect(loadOptionsCtx.getNodeParameter).not.toHaveBeenCalled();
		expect(mockHttpRequestWithAuthentication).toHaveBeenLastCalledWith(
			'confluenceCloudOAuth2Api',
			expect.objectContaining({
				url: 'https://api.atlassian.com/ex/confluence/cloud-2/wiki/api/v2/spaces',
			}),
		);
	});
});

describe('confluenceApiRequestBinary', () => {
	let ctx: Mocked<IExecuteFunctions>;
	let mockHttpRequestWithAuthentication: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAtlassianAccessibleResourcesCache();
		ctx = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = vi.fn().mockResolvedValue(accessibleResources);
		ctx.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;
		ctx.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Confluence Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { confluenceCloudOAuth2Api: { id: 'cred-1', name: 'account' } },
		});
		ctx.getNodeParameter.mockReturnValue(siteByUrl('https://example.atlassian.net/wiki') as never);
	});

	it('fetches the endpoint through the gateway as a Buffer', async () => {
		const bytes = Buffer.from('file-bytes');
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockResolvedValueOnce(bytes);

		const data = await confluenceApiRequestBinary.call(ctx, '/wiki/download/attachments/9/a.txt');

		expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'confluenceCloudOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				url: 'https://api.atlassian.com/ex/confluence/cloud-1/wiki/download/attachments/9/a.txt',
				encoding: 'arraybuffer',
				sendCredentialsOnCrossOriginRedirect: false,
			}),
		);
		expect(data).toBe(bytes);
	});

	it('coerces non-Buffer binary responses to a Buffer', async () => {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockResolvedValueOnce('plain-text-body');

		const data = await confluenceApiRequestBinary.call(ctx, '/wiki/download/attachments/9/a.txt');

		expect(Buffer.isBuffer(data)).toBe(true);
		expect(data.toString()).toBe('plain-text-body');
	});

	it('coerces an ArrayBuffer response to a Buffer', async () => {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockResolvedValueOnce(new TextEncoder().encode('ab-bytes').buffer);

		const data = await confluenceApiRequestBinary.call(ctx, '/wiki/download/attachments/9/a.txt');

		expect(Buffer.isBuffer(data)).toBe(true);
		expect(data.toString()).toBe('ab-bytes');
	});

	it('rejects an unusable binary response with a NodeOperationError', async () => {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockResolvedValueOnce({ unexpected: true });

		await expect(
			confluenceApiRequestBinary.call(ctx, '/wiki/download/attachments/9/a.txt'),
		).rejects.toThrow('Confluence returned an unexpected binary response');
	});

	it('wraps request failures in NodeApiError, keeping the status', async () => {
		// 500 (not 404/403) so this test exercises plain wrapping, not the expired-token retry
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockRejectedValueOnce({ message: 'boom', response: { status: 500 } });

		const error = await confluenceApiRequestBinary
			.call(ctx, '/wiki/download/attachments/9/a.txt')
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe('500');
	});

	it("surfaces Atlassian's v2 error envelope on download failures", async () => {
		// A genuinely missing attachment still 404s after the forced-refresh retry
		alwaysFailGatewayCalls(mockHttpRequestWithAuthentication, {
			message: 'Request failed with status code 404',
			response: {
				status: 404,
				data: {
					errors: [
						{
							status: 404,
							code: 'NOT_FOUND',
							title: 'Attachment not found',
							detail: 'No attachment with this ID exists',
						},
					],
				},
			},
		});

		const error = await confluenceApiRequestBinary
			.call(ctx, '/wiki/download/attachments/9/a.txt')
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.message).toBe('Attachment not found');
		expect(error?.description).toBe('No attachment with this ID exists');
		expect(error?.httpCode).toBe('404');
	});

	it('retries once after forcing a token refresh when a download 404s', async () => {
		const bytes = Buffer.from('file-bytes');
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources) // cloudId lookup
			.mockRejectedValueOnce({ message: 'boom', response: { status: 404 } }) // expired token
			.mockResolvedValueOnce(accessibleResources) // forced refresh
			.mockResolvedValueOnce(bytes); // retried request succeeds

		const data = await confluenceApiRequestBinary.call(ctx, '/wiki/download/attachments/9/a.txt');

		expect(data).toBe(bytes);
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(4);
	});
});

describe('confluenceApiRequestUpload', () => {
	let ctx: Mocked<IExecuteFunctions>;
	let mockHttpRequestWithAuthentication: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAtlassianAccessibleResourcesCache();
		ctx = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = vi.fn().mockResolvedValue(accessibleResources);
		ctx.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;
		ctx.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Confluence Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { confluenceCloudOAuth2Api: { id: 'cred-1', name: 'account' } },
		});
		ctx.getNodeParameter.mockReturnValue(siteByUrl('https://example.atlassian.net/wiki') as never);
	});

	it('PUTs the multipart body with the XSRF-bypass header, no json flag', async () => {
		const formData = new FormData();
		formData.append('file', Buffer.from('bytes'), { filename: 'a.txt' });
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockResolvedValueOnce({ results: [{ id: 'att1' }] });

		const data = await confluenceApiRequestUpload.call(
			ctx,
			'/wiki/rest/api/content/9/child/attachment',
			formData,
		);

		expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'confluenceCloudOAuth2Api',
			expect.objectContaining({
				// PUT, not POST: the same endpoint's POST is create-only and 400s on
				// a filename that already exists on the page, PUT upserts
				method: 'PUT',
				url: 'https://api.atlassian.com/ex/confluence/cloud-1/wiki/rest/api/content/9/child/attachment',
				body: formData,
				headers: { 'X-Atlassian-Token': 'nocheck' },
			}),
		);
		expect(mockHttpRequestWithAuthentication.mock.calls[1][1]).not.toHaveProperty('json');
		expect(data).toEqual({ results: [{ id: 'att1' }] });
	});

	it('wraps request failures in NodeApiError, keeping the status', async () => {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockRejectedValueOnce({ message: 'boom', response: { status: 403 } });

		const error = await confluenceApiRequestUpload
			.call(ctx, '/wiki/rest/api/content/9/child/attachment', new FormData())
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe('403');
	});

	it('does not retry a 404/403 (the multipart body is a consumed stream, unsafe to replay)', async () => {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockRejectedValueOnce({ message: 'boom', response: { status: 404 } });

		const error = await confluenceApiRequestUpload
			.call(ctx, '/wiki/rest/api/content/9/child/attachment', new FormData())
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe('404');
		// cloudId lookup, then the single failed attempt. No forced refresh, no retry.
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});

	it('surfaces the v1 scope-trap message instead of the generic status text', async () => {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockRejectedValueOnce({
				message: 'Request failed with status code 401',
				response: { status: 401, data: { message: 'scope does not match' } },
			});

		const error = await confluenceApiRequestUpload
			.call(ctx, '/wiki/rest/api/content/9/child/attachment', new FormData())
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.message).toBe('scope does not match');
		expect(error?.httpCode).toBe('401');
	});

	it('asks to pick a site when the Site parameter is empty and several sites are reachable', async () => {
		ctx.getNodeParameter.mockReturnValue({ __rl: true, mode: 'list', value: '' } as never);

		const promise = confluenceApiRequestUpload.call(
			ctx,
			'/wiki/rest/api/content/9/child/attachment',
			new FormData(),
		);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow("pick a site in the 'Site' parameter");
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('credential routing (authentication selector)', () => {
	let ctx: Mocked<IExecuteFunctions>;
	let mockHttpRequestWithAuthentication: Mock;

	const setup = (authentication: unknown) => {
		ctx = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = vi.fn().mockResolvedValue(accessibleResources);
		ctx.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;
		ctx.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Confluence Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: {},
		});
		ctx.getNodeParameter.mockImplementation(((
			name: string,
			_itemIndex?: number,
			fallback?: unknown,
		) => {
			if (name === 'authentication') return authentication ?? fallback;
			if (name === 'site') return siteByUrl('https://example.atlassian.net');
			return fallback;
		}) as never);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		clearAtlassianAccessibleResourcesCache();
	});

	it('routes the cloudId lookup and the API call through the Service Account credential', async () => {
		setup('serviceAccount');

		await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		expect(mockHttpRequestWithAuthentication.mock.calls.length).toBeGreaterThanOrEqual(2);
		for (const call of mockHttpRequestWithAuthentication.mock.calls) {
			expect(call[0]).toBe('atlassianServiceAccountApi');
		}
	});

	it('uploads through the Service Account credential when selected', async () => {
		setup('serviceAccount');

		await confluenceApiRequestUpload.call(
			ctx,
			'/wiki/rest/api/content/9/child/attachment',
			new FormData(),
		);

		expect(mockHttpRequestWithAuthentication.mock.calls.length).toBeGreaterThanOrEqual(2);
		for (const call of mockHttpRequestWithAuthentication.mock.calls) {
			expect(call[0]).toBe('atlassianServiceAccountApi');
		}
	});

	it('downloads binary content through the Service Account credential when selected', async () => {
		setup('serviceAccount');
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockResolvedValueOnce(Buffer.from('bytes'));

		await confluenceApiRequestBinary.call(ctx, '/wiki/download/attachments/9/file.txt');

		expect(mockHttpRequestWithAuthentication.mock.calls.length).toBeGreaterThanOrEqual(2);
		for (const call of mockHttpRequestWithAuthentication.mock.calls) {
			expect(call[0]).toBe('atlassianServiceAccountApi');
		}
	});

	it('defaults to Cloud OAuth2 when the authentication parameter is absent', async () => {
		// Workflows saved before the selector existed have no `authentication` key;
		// the read falls back to 'cloudOAuth2' and behavior is unchanged.
		setup(undefined);

		await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		expect(mockHttpRequestWithAuthentication.mock.calls.length).toBeGreaterThanOrEqual(2);
		for (const call of mockHttpRequestWithAuthentication.mock.calls) {
			expect(call[0]).toBe('confluenceCloudOAuth2Api');
		}
	});

	it('resolves the Service Account credential through getCurrentNodeParameter in a load-options context', async () => {
		// The NDV dropdowns (sites, spaces, pages, labels) run in a load-options
		// context, where only getCurrentNodeParameter sees the unsaved selector value.
		const loadCtx: Mocked<ILoadOptionsFunctions> = mockDeep<ILoadOptionsFunctions>();
		const loadMock = vi.fn().mockResolvedValue(accessibleResources);
		loadCtx.helpers.httpRequestWithAuthentication = loadMock;
		loadCtx.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Confluence Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: {},
		});
		loadCtx.getCurrentNodeParameter.mockImplementation(((name: string) => {
			if (name === 'authentication') return 'serviceAccount';
			return siteByUrl('https://example.atlassian.net');
		}) as never);

		await confluenceApiRequest.call(loadCtx, 'GET', '/wiki/api/v2/pages');

		expect(loadMock.mock.calls.length).toBeGreaterThanOrEqual(2);
		for (const call of loadMock.mock.calls) {
			expect(call[0]).toBe('atlassianServiceAccountApi');
		}
	});
});
