import FormData from 'form-data';
import type { IExecuteFunctions, INode, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { clearAtlassianCloudIdCache } from '@utils/atlassian';

import {
	confluenceApiRequest,
	confluenceApiRequestBinary,
	confluenceApiRequestUpload,
} from '../../transport';

const accessibleResources = [
	{ id: 'cloud-1', url: 'https://example.atlassian.net', name: 'example' },
	{ id: 'cloud-2', url: 'https://Other.Atlassian.NET' },
];

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
		clearAtlassianCloudIdCache();
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
		};
		ctx.getNode.mockReturnValue(mockNode);
		ctx.getCredentials.mockResolvedValue({ domain: 'https://example.atlassian.net/wiki' });
	});

	it('routes requests to https://api.atlassian.com/ex/confluence/{cloudId}', async () => {
		await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		expect(ctx.getCredentials).toHaveBeenCalledWith('confluenceCloudOAuth2Api');
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

	it('defaults body and qs to empty objects', async () => {
		await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'confluenceCloudOAuth2Api',
			expect.objectContaining({ body: {}, qs: {}, json: true }),
		);
	});

	it('wraps request failures in NodeApiError, keeping status and message', async () => {
		failNextRequest({ message: 'boom', response: { status: 403 } });

		const error = await captureRejection('/wiki/api/v2/pages');

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe('403');
		expect(error?.messages).toContain('boom');
	});

	it("surfaces Atlassian's v2 error envelope instead of the generic status message", async () => {
		failNextRequest(pageNotFoundResponse);

		const error = await captureRejection('/wiki/api/v2/pages/1');

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.message).toBe('Page not found');
		expect(error?.description).toBe('No page with this ID exists');
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
		const wrapped = failNextRequestWrapped(pageNotFoundResponse as JsonObject);

		const error = await captureRejection('/wiki/api/v2/pages/1');

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).not.toBe(wrapped);
		expect(error?.message).toBe('Page not found');
		expect(error?.description).toBe('No page with this ID exists');
		expect(error?.httpCode).toBe('404');
	});

	it('rethrows a wrapped NodeApiError unchanged when there is no response body', async () => {
		const wrapped = failNextRequestWrapped({ message: 'socket hang up' } as JsonObject);

		const error = await captureRejection('/wiki/api/v2/pages');

		expect(error).toBe(wrapped);
	});

	it('surfaces the cloudId lookup error when no site matches', async () => {
		ctx.getCredentials.mockResolvedValue({ domain: 'https://missing.atlassian.net' });

		await expect(confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages')).rejects.toThrow(
			'No Confluence site matched "https://missing.atlassian.net"',
		);
	});

	it('throws a NodeOperationError naming the Site URL field when the credential lacks it', async () => {
		ctx.getCredentials.mockResolvedValue({});

		const promise = confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('Site URL');
		expect(mockHttpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});

describe('confluenceApiRequestBinary', () => {
	let ctx: Mocked<IExecuteFunctions>;
	let mockHttpRequestWithAuthentication: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAtlassianCloudIdCache();
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
		});
		ctx.getCredentials.mockResolvedValue({ domain: 'https://example.atlassian.net/wiki' });
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
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockRejectedValueOnce({ message: 'boom', response: { status: 404 } });

		const error = await confluenceApiRequestBinary
			.call(ctx, '/wiki/download/attachments/9/a.txt')
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe('404');
	});

	it("surfaces Atlassian's v2 error envelope on download failures", async () => {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockRejectedValueOnce({
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
});

describe('confluenceApiRequestUpload', () => {
	let ctx: Mocked<IExecuteFunctions>;
	let mockHttpRequestWithAuthentication: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAtlassianCloudIdCache();
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
		});
		ctx.getCredentials.mockResolvedValue({ domain: 'https://example.atlassian.net/wiki' });
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

	it('throws a NodeOperationError naming the Site URL field when the credential lacks it', async () => {
		ctx.getCredentials.mockResolvedValue({});

		const promise = confluenceApiRequestUpload.call(
			ctx,
			'/wiki/rest/api/content/9/child/attachment',
			new FormData(),
		);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('Site URL');
		expect(mockHttpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});
