import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeParameterResourceLocator,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../actions/page/getComments.operation';
import { confluenceApiRequest } from '../../../transport';

vi.mock('../../../transport', () => ({
	CONFLUENCE_CREDENTIAL_NAME: 'confluenceCloudOAuth2Api',
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = vi.mocked(confluenceApiRequest);

const mockNode: INode = {
	id: 'test-node',
	name: 'Test Confluence Node',
	type: 'n8n-nodes-base.confluence',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function createContext(params: Record<string, unknown>) {
	const ctx = mockDeep<IExecuteFunctions>();
	ctx.getNode.mockReturnValue(mockNode);
	ctx.getNodeParameter.mockImplementation(
		(name: string, _itemIndex?: number, fallback?: unknown, options?: IGetNodeParameterOptions) => {
			if (name === 'page' && options?.extractValue === true) {
				const page = params.page as INodeParameterResourceLocator;
				return (params.pageExtracted ?? page.value) as never;
			}
			return (params[name] ?? fallback) as never;
		},
	);
	return ctx;
}

describe('Confluence page:getComments operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches the footer comments of a page with the storage format by default', async () => {
		const comments = [
			{ id: '1', body: { storage: { value: '<p>first</p>' } } },
			{ id: '2', body: { storage: { value: '<p>second</p>' } } },
		];
		apiRequest.mockResolvedValueOnce({ results: comments });
		const ctx = createContext({
			page: { mode: 'id', value: '123' },
			returnAll: false,
			limit: 50,
		});

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/pages/123/footer-comments',
			{},
			{ 'body-format': 'storage', limit: 50 },
		);
		expect(result).toEqual(comments);
	});

	it('resolves the page through the shared picker pair (by URL)', async () => {
		apiRequest.mockResolvedValueOnce({ results: [] });
		const ctx = createContext({
			page: {
				mode: 'url',
				value: 'https://example.atlassian.net/wiki/spaces/DOCS/pages/456/My+Page',
			},
			pageExtracted: '456',
		});

		await execute.call(ctx, 0);

		expect(ctx.getNodeParameter).toHaveBeenCalledWith('page', 0, '', { extractValue: true });
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/pages/456/footer-comments',
			{},
			{ 'body-format': 'storage', limit: 50 },
		);
	});

	it('composes the sort option from Sort By and Sort Direction', async () => {
		apiRequest.mockResolvedValueOnce({ results: [] });
		const ctx = createContext({
			page: { mode: 'id', value: '123' },
			options: { sortBy: 'created-date', sortDirection: 'desc' },
		});

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/pages/123/footer-comments',
			{},
			{ 'body-format': 'storage', limit: 50, sort: '-created-date' },
		);
	});

	describe('pagination', () => {
		it('follows the cursor across pages when Return All is on', async () => {
			apiRequest
				.mockResolvedValueOnce({
					results: [{ id: '1' }, { id: '2' }],
					_links: { next: '/wiki/api/v2/pages/123/footer-comments?cursor=abc%3D%3D' },
				})
				.mockResolvedValueOnce({ results: [{ id: '3' }] });
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				returnAll: true,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expect(apiRequest).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/wiki/api/v2/pages/123/footer-comments',
				{},
				{ 'body-format': 'storage', limit: 250 },
			);
			expect(apiRequest).toHaveBeenNthCalledWith(
				2,
				'GET',
				'/wiki/api/v2/pages/123/footer-comments',
				{},
				{ 'body-format': 'storage', limit: 250, cursor: 'abc==' },
			);
			expect(result.map((comment) => comment.id)).toEqual(['1', '2', '3']);
		});

		it('stops at the limit and never requests more than the remainder', async () => {
			apiRequest
				.mockResolvedValueOnce({
					results: [{ id: '1' }, { id: '2' }],
					_links: { next: '/wiki/api/v2/pages/123/footer-comments?cursor=abc' },
				})
				.mockResolvedValueOnce({
					results: [{ id: '3' }, { id: '4' }],
					_links: { next: '/wiki/api/v2/pages/123/footer-comments?cursor=def' },
				});
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				returnAll: false,
				limit: 3,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expect((apiRequest.mock.calls[0][3] as IDataObject).limit).toBe(3);
			expect((apiRequest.mock.calls[1][3] as IDataObject).limit).toBe(1);
			expect(result.map((comment) => comment.id)).toEqual(['1', '2', '3']);
		});

		it('caps the per-request limit at 250', async () => {
			apiRequest.mockResolvedValueOnce({ results: [] });
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				returnAll: false,
				limit: 1000,
			});

			await execute.call(ctx, 0);

			expect((apiRequest.mock.calls[0][3] as IDataObject).limit).toBe(250);
		});

		it('stops when the server echoes a cursor it already returned', async () => {
			apiRequest.mockResolvedValue({
				results: [{ id: '1' }],
				_links: { next: '/wiki/api/v2/pages/123/footer-comments?cursor=same' },
			});
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				returnAll: true,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expect(result.map((comment) => comment.id)).toEqual(['1', '1']);
		});

		it('rejects a limit below 1', async () => {
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				returnAll: false,
				limit: 0,
			});

			await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			await expect(execute.call(ctx, 0)).rejects.toThrow(
				'Limit must be a finite number of at least 1',
			);
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});

	describe('body format', () => {
		it('passes atlas_doc_format through untouched', async () => {
			const comments = [{ id: '1', body: { atlas_doc_format: { value: '{"type":"doc"}' } } }];
			apiRequest.mockResolvedValueOnce({ results: comments });
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				bodyFormat: 'atlas_doc_format',
			});

			const result = await execute.call(ctx, 0);

			expect((apiRequest.mock.calls[0][3] as IDataObject)['body-format']).toBe('atlas_doc_format');
			expect(result).toEqual(comments);
		});

		it('requests ADF and extracts plain text from every comment', async () => {
			const adf = JSON.stringify({
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'comment text' }] }],
			});
			apiRequest.mockResolvedValueOnce({
				results: [
					{ id: '1', body: { atlas_doc_format: { value: adf } } },
					{ id: '2', body: { atlas_doc_format: { value: adf } } },
				],
			});
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				bodyFormat: 'plainText',
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect((apiRequest.mock.calls[0][3] as IDataObject)['body-format']).toBe('atlas_doc_format');
			expect(result).toHaveLength(2);
			for (const comment of result) {
				expect(comment.body).toEqual({
					plainText: { representation: 'plain_text', value: 'comment text' },
				});
			}
		});

		it('keeps mention, emoji, and status text in plain-text bodies', async () => {
			const adf = JSON.stringify({
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'mention', attrs: { id: 'abc', text: '@Jane Doe' } },
							{ type: 'text', text: ' please review ' },
							{ type: 'status', attrs: { text: 'BLOCKED', color: 'red' } },
							{ type: 'text', text: ' ' },
							{ type: 'emoji', attrs: { shortName: ':tada:', text: '🎉' } },
						],
					},
				],
			});
			apiRequest.mockResolvedValueOnce({
				results: [{ id: '1', body: { atlas_doc_format: { value: adf } } }],
			});
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				bodyFormat: 'plainText',
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(result[0].body).toEqual({
				plainText: { representation: 'plain_text', value: '@Jane Doe please review BLOCKED 🎉' },
			});
		});
	});

	it('returns an empty array for a page without comments', async () => {
		apiRequest.mockResolvedValueOnce({ results: [] });
		const ctx = createContext({
			page: { mode: 'id', value: '123' },
		});

		expect(await execute.call(ctx, 0)).toEqual([]);
	});

	it('throws when the page reference is empty', async () => {
		const ctx = createContext({ page: { mode: 'id', value: ' ' } });

		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Page' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
