import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { AccessibleResource } from '../../transport';
import {
	clearCloudIdCache,
	confluenceApiRequest,
	getConfluenceCloudId,
	matchSiteByHostname,
	normalizeSiteUrl,
} from '../../transport';

const accessibleResources: AccessibleResource[] = [
	{ id: 'cloud-1', url: 'https://example.atlassian.net', name: 'example' },
	{ id: 'cloud-2', url: 'https://Other.Atlassian.NET' },
];

describe('Confluence Transport', () => {
	let ctx: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockHttpRequestWithAuthentication: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		clearCloudIdCache();
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

	describe('normalizeSiteUrl', () => {
		it.each([
			'example.atlassian.net',
			'http://example.atlassian.net',
			'https://example.atlassian.net/wiki',
			'https://example.atlassian.net/wiki/spaces/ENG/pages/123',
			'HTTPS://Example.Atlassian.NET/wiki/',
			'  example.atlassian.net  ',
		])('reduces "%s" to the lowercased hostname', (input) => {
			expect(normalizeSiteUrl(input)).toBe('example.atlassian.net');
		});

		it('throws on an unparseable site URL', () => {
			expect(() => normalizeSiteUrl('not a url')).toThrow();
		});
	});

	describe('matchSiteByHostname', () => {
		it('matches case-insensitively on both sides', () => {
			expect(matchSiteByHostname(accessibleResources, 'OTHER.atlassian.net')).toBe(
				accessibleResources[1],
			);
		});

		it('returns undefined when nothing matches', () => {
			expect(matchSiteByHostname(accessibleResources, 'missing.atlassian.net')).toBeUndefined();
		});

		it('skips entries with malformed URLs instead of throwing', () => {
			const withMalformed: AccessibleResource[] = [
				{ id: 'bad', url: 'not a url' },
				...accessibleResources,
			];
			expect(matchSiteByHostname(withMalformed, 'example.atlassian.net')).toBe(
				accessibleResources[0],
			);
		});
	});

	describe('getConfluenceCloudId', () => {
		it('resolves the cloudId by case-insensitive hostname match', async () => {
			const cloudId = await getConfluenceCloudId.call(ctx, 'OTHER.atlassian.net/wiki');

			expect(cloudId).toBe('cloud-2');
			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
				'confluenceCloudOAuth2Api',
				expect.objectContaining({
					url: 'https://api.atlassian.com/oauth/token/accessible-resources',
				}),
			);
		});

		it('serves the second lookup from the cache without refetching', async () => {
			const first = await getConfluenceCloudId.call(ctx, 'https://example.atlassian.net/wiki');
			const second = await getConfluenceCloudId.call(ctx, 'example.atlassian.net');

			expect(first).toBe('cloud-1');
			expect(second).toBe('cloud-1');
			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		it('does not share the cache across credentials', async () => {
			ctx.getNode.mockReturnValue({
				...mockNode,
				credentials: { confluenceCloudOAuth2Api: { id: 'cred-a', name: 'A' } },
			});
			await getConfluenceCloudId.call(ctx, 'example.atlassian.net');

			ctx.getNode.mockReturnValue({
				...mockNode,
				credentials: { confluenceCloudOAuth2Api: { id: 'cred-b', name: 'B' } },
			});
			await getConfluenceCloudId.call(ctx, 'example.atlassian.net');

			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		it('names the input and lists reachable site URLs when nothing matches', async () => {
			const promise = getConfluenceCloudId.call(ctx, 'foo.atlassian.net');

			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow(
				'No Confluence site matched "foo.atlassian.net". This connection can access: https://example.atlassian.net, https://Other.Atlassian.NET',
			);
		});

		it('says "no sites" when the connection reaches no Confluence sites', async () => {
			mockHttpRequestWithAuthentication.mockResolvedValueOnce([]);

			await expect(getConfluenceCloudId.call(ctx, 'foo.atlassian.net')).rejects.toThrow(
				'can access: no sites',
			);
		});

		it('treats a non-array accessible-resources body as no sites', async () => {
			mockHttpRequestWithAuthentication.mockResolvedValueOnce({ error: 'unexpected' });

			await expect(getConfluenceCloudId.call(ctx, 'foo.atlassian.net')).rejects.toThrow(
				'can access: no sites',
			);
		});

		it('caps the reachable-sites list at 5 entries', async () => {
			mockHttpRequestWithAuthentication.mockResolvedValueOnce(
				Array.from({ length: 7 }, (_, i) => ({
					id: `cloud-${i}`,
					url: `https://site-${i}.atlassian.net`,
				})),
			);

			await expect(getConfluenceCloudId.call(ctx, 'foo.atlassian.net')).rejects.toThrow(
				'This connection can access: https://site-0.atlassian.net, https://site-1.atlassian.net, https://site-2.atlassian.net, https://site-3.atlassian.net, https://site-4.atlassian.net, and 2 more',
			);
		});

		it('omits malformed entries from the reachable-sites list', async () => {
			mockHttpRequestWithAuthentication.mockResolvedValueOnce([
				null,
				{ id: 'no-url' },
				{ id: 'cloud-1', url: 'https://example.atlassian.net' },
			]);

			await expect(getConfluenceCloudId.call(ctx, 'foo.atlassian.net')).rejects.toThrow(
				'This connection can access: https://example.atlassian.net',
			);
		});

		it('throws a NodeOperationError for an unparseable site URL', async () => {
			await expect(getConfluenceCloudId.call(ctx, 'not a url')).rejects.toThrow(NodeOperationError);
			expect(mockHttpRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('wraps an accessible-resources failure in NodeApiError, keeping status and message', async () => {
			mockHttpRequestWithAuthentication.mockRejectedValueOnce({
				message: 'boom',
				response: { status: 500 },
			});

			const error = await getConfluenceCloudId
				.call(ctx, 'example.atlassian.net')
				.then(() => null)
				.catch((thrown: NodeApiError) => thrown);

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error?.httpCode).toBe('500');
			expect(error?.messages).toContain('boom');
		});

		it('passes an already-wrapped NodeApiError through unchanged', async () => {
			// The realistic path: httpRequestWithAuthentication rejects with a NodeApiError already
			const wrapped = new NodeApiError(mockNode, { message: 'boom' }, { httpCode: '429' });
			mockHttpRequestWithAuthentication.mockRejectedValueOnce(wrapped);

			await expect(getConfluenceCloudId.call(ctx, 'example.atlassian.net')).rejects.toBe(wrapped);
		});
	});

	describe('confluenceApiRequest', () => {
		it('routes requests to https://api.atlassian.com/ex/confluence/{cloudId}', async () => {
			await confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

			expect(ctx.getCredentials).toHaveBeenCalledWith('confluenceCloudOAuth2Api');
			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(2);
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

		it('throws a NodeOperationError naming the Site URL field when the credential lacks it', async () => {
			ctx.getCredentials.mockResolvedValue({});

			const promise = confluenceApiRequest.call(ctx, 'GET', '/wiki/api/v2/pages');

			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow('Site URL');
			expect(mockHttpRequestWithAuthentication).not.toHaveBeenCalled();
		});
	});
});
