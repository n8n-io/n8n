import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { clearAtlassianCloudIdCache } from '@utils/atlassian';

import { confluenceApiRequest } from '../../transport';

const accessibleResources = [
	{ id: 'cloud-1', url: 'https://example.atlassian.net', name: 'example' },
	{ id: 'cloud-2', url: 'https://Other.Atlassian.NET' },
];

describe('confluenceApiRequest', () => {
	let ctx: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockHttpRequestWithAuthentication: Mock;

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
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockRejectedValueOnce({ message: 'boom', response: { status: 403 } });

		const error = await confluenceApiRequest
			.call(ctx, 'GET', '/wiki/api/v2/pages')
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe('403');
		expect(error?.messages).toContain('boom');
	});

	it("surfaces Atlassian's v2 error envelope instead of the generic status message", async () => {
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
								title: 'Page not found',
								detail: 'No page with this ID exists',
							},
						],
					},
				},
			});

		const error = await confluenceApiRequest
			.call(ctx, 'GET', '/wiki/api/v2/pages/1')
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.message).toBe('Page not found');
		expect(error?.description).toBe('No page with this ID exists');
	});

	it('falls back to the generic wrap when the envelope carries no usable title', async () => {
		mockHttpRequestWithAuthentication
			.mockResolvedValueOnce(accessibleResources)
			.mockRejectedValueOnce({
				message: 'boom',
				response: { status: 500, data: { errors: [{ title: '' }] } },
			});

		const error = await confluenceApiRequest
			.call(ctx, 'GET', '/wiki/api/v2/pages')
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe('500');
		expect(error?.messages).toContain('boom');
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
