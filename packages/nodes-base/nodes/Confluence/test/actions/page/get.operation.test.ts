import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeParameterResourceLocator,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../actions/page/get.operation';
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

describe('Confluence page:get operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('single page', () => {
		it('fetches a page by ID with the storage body format', async () => {
			const page = { id: '123', title: 'Doc', body: { storage: { value: '<p>hi</p>' } } };
			apiRequest.mockResolvedValueOnce(page);
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				bodyFormat: 'storage',
				includeDescendants: false,
			});

			const result = await execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledTimes(1);
			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/wiki/api/v2/pages/123',
				{},
				{ 'body-format': 'storage' },
			);
			expect(result).toEqual(page);
		});

		it('fetches a page by URL through the extracted ID', async () => {
			apiRequest.mockResolvedValueOnce({ id: '456' });
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
				'/wiki/api/v2/pages/456',
				{},
				{ 'body-format': 'storage' },
			);
		});

		it('passes atlas_doc_format through untouched', async () => {
			const page = { id: '123', body: { atlas_doc_format: { value: '{"type":"doc"}' } } };
			apiRequest.mockResolvedValueOnce(page);
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				bodyFormat: 'atlas_doc_format',
			});

			const result = await execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/wiki/api/v2/pages/123',
				{},
				{ 'body-format': 'atlas_doc_format' },
			);
			expect(result).toEqual(page);
		});

		it('throws when the page reference is empty', async () => {
			const ctx = createContext({ page: { mode: 'id', value: ' ' } });

			await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Page' parameter is empty");
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});

	describe('plain text body format', () => {
		it('requests ADF and extracts text with newlines at block boundaries', async () => {
			const adfDoc = {
				type: 'doc',
				content: [
					{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Head' }] },
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Hello ' },
							{ type: 'text', text: 'world' },
							{ type: 'hardBreak' },
							{ type: 'text', text: 'next' },
						],
					},
					{
						type: 'bulletList',
						content: [
							{
								type: 'listItem',
								content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
							},
							{
								type: 'listItem',
								content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }],
							},
						],
					},
					// Dynamic macros carry no text in ADF and contribute nothing
					{ type: 'extension', attrs: { extensionKey: 'toc' } },
				],
			};
			apiRequest.mockResolvedValueOnce({
				id: '123',
				title: 'Doc',
				body: {
					atlas_doc_format: { representation: 'atlas_doc_format', value: JSON.stringify(adfDoc) },
				},
			});
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				bodyFormat: 'plainText',
			});

			const result = (await execute.call(ctx, 0)) as IDataObject;

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/wiki/api/v2/pages/123',
				{},
				{ 'body-format': 'atlas_doc_format' },
			);
			expect(result.id).toBe('123');
			expect(result.title).toBe('Doc');
			expect(result.body).toEqual({
				plainText: {
					representation: 'plain_text',
					value: 'Head\nHello world\nnext\none\n\ntwo',
				},
			});
		});

		it('separates table cells and rows', async () => {
			const adfDoc = {
				type: 'doc',
				content: [
					{
						type: 'table',
						content: [
							{
								type: 'tableRow',
								content: [
									{
										type: 'tableCell',
										content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
									},
									{
										type: 'tableCell',
										content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
									},
								],
							},
						],
					},
				],
			};
			apiRequest.mockResolvedValueOnce({
				id: '123',
				body: { atlas_doc_format: { value: JSON.stringify(adfDoc) } },
			});
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				bodyFormat: 'plainText',
			});

			const result = (await execute.call(ctx, 0)) as IDataObject;

			const body = result.body as { plainText: { value: string } };
			expect(body.plainText.value).toBe('A\n B');
		});

		it('falls back to an empty value when valid-JSON ADF has nodes the walk cannot take', async () => {
			apiRequest.mockResolvedValueOnce({
				id: '123',
				body: {
					atlas_doc_format: { value: JSON.stringify({ type: 'doc', content: [null] }) },
				},
			});
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				bodyFormat: 'plainText',
			});

			const result = (await execute.call(ctx, 0)) as IDataObject;

			expect(result.body).toEqual({
				plainText: { representation: 'plain_text', value: '' },
			});
		});

		it('falls back to an empty value when the ADF body is malformed', async () => {
			apiRequest.mockResolvedValueOnce({
				id: '123',
				body: { atlas_doc_format: { value: 'not-json' } },
			});
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				bodyFormat: 'plainText',
			});

			const result = (await execute.call(ctx, 0)) as IDataObject;

			expect(result.body).toEqual({
				plainText: { representation: 'plain_text', value: '' },
			});
		});

		it('falls back to an empty value when the page has no body', async () => {
			apiRequest.mockResolvedValueOnce({ id: '123', title: 'Bodyless' });
			const ctx = createContext({
				page: { mode: 'id', value: '123' },
				bodyFormat: 'plainText',
			});

			const result = (await execute.call(ctx, 0)) as IDataObject;

			expect(result.body).toEqual({
				plainText: { representation: 'plain_text', value: '' },
			});
		});
	});

	describe('get by title', () => {
		it('resolves a unique site-wide match without a space', async () => {
			apiRequest.mockImplementation(async (_method, endpoint, _body, qs) => {
				if (endpoint === '/wiki/api/v2/pages') {
					expect(qs).toEqual({ title: 'Project plan', limit: 250 });
					return { results: [{ id: '77', title: 'Project plan', spaceId: '5' }] };
				}
				if (endpoint === '/wiki/api/v2/pages/77') return { id: '77', title: 'Project plan' };
				throw new Error(`unexpected endpoint ${endpoint}`);
			});
			const ctx = createContext({
				page: { mode: 'title', value: 'Project plan' },
			});

			const result = await execute.call(ctx, 0);

			expect((result as IDataObject).id).toBe('77');
		});

		it('scopes the lookup to a space picked from the list', async () => {
			apiRequest.mockImplementation(async (_method, endpoint, _body, qs) => {
				if (endpoint === '/wiki/api/v2/pages') {
					expect(qs).toEqual({ title: 'Project plan', limit: 250, 'space-id': '999' });
					return { results: [{ id: '77' }] };
				}
				if (endpoint === '/wiki/api/v2/pages/77') return { id: '77' };
				throw new Error(`unexpected endpoint ${endpoint}`);
			});
			const ctx = createContext({
				page: { mode: 'title', value: 'Project plan' },
				space: { mode: 'list', value: '999', cachedResultName: 'Docs Space' },
			});

			await execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledTimes(2);
		});

		it('scopes the lookup to a space given by ID', async () => {
			apiRequest.mockImplementation(async (_method, endpoint, _body, qs) => {
				if (endpoint === '/wiki/api/v2/pages') {
					expect(qs).toEqual({ title: 'Project plan', limit: 250, 'space-id': '42' });
					return { results: [{ id: '77' }] };
				}
				if (endpoint === '/wiki/api/v2/pages/77') return { id: '77' };
				throw new Error(`unexpected endpoint ${endpoint}`);
			});
			const ctx = createContext({
				page: { mode: 'title', value: 'Project plan' },
				space: { mode: 'id', value: '42' },
			});

			await execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledTimes(2);
		});

		it('throws when no page matches the title', async () => {
			apiRequest.mockResolvedValue({ results: [] });
			const ctx = createContext({
				page: { mode: 'title', value: 'Missing page' },
			});

			await expect(execute.call(ctx, 0)).rejects.toThrow('No page titled "Missing page" found');
		});

		it('names the space in the no-match error when one was given', async () => {
			apiRequest.mockResolvedValue({ results: [] });
			const ctx = createContext({
				page: { mode: 'title', value: 'Missing page' },
				space: { mode: 'list', value: '999', cachedResultName: 'Docs Space' },
			});

			await expect(execute.call(ctx, 0)).rejects.toThrow(
				'No page titled "Missing page" found in space "Docs Space"',
			);
		});

		it('falls back to the space ID in the no-match error without a cached name', async () => {
			apiRequest.mockResolvedValue({ results: [] });
			const ctx = createContext({
				page: { mode: 'title', value: 'Missing page' },
				space: { mode: 'id', value: '42' },
			});

			await expect(execute.call(ctx, 0)).rejects.toThrow(
				'No page titled "Missing page" found in space "42"',
			);
		});

		it('throws with up to five candidates when multiple pages match', async () => {
			const results = Array.from({ length: 7 }, (_, i) => ({
				id: String(100 + i),
				title: 'Duplicate',
				spaceId: String(i),
			}));
			apiRequest.mockResolvedValue({ results });
			const ctx = createContext({
				page: { mode: 'title', value: 'Duplicate' },
			});

			const error = await execute
				.call(ctx, 0)
				.then(() => null)
				.catch((thrown: NodeOperationError) => thrown);

			expect(error).toBeInstanceOf(NodeOperationError);
			expect(error?.message).toContain('Found 7 pages titled "Duplicate"');
			expect(error?.message).toContain('"Duplicate" (space 0, ID 100)');
			expect(error?.message).toContain('"Duplicate" (space 4, ID 104)');
			expect(error?.message).not.toContain('ID 105');
			expect(error?.message).toContain('…');
			expect(error?.message).toContain('Scope the lookup with the Space field');
		});

		it('throws when the title is empty', async () => {
			const ctx = createContext({ page: { mode: 'title', value: '  ' } });

			await expect(execute.call(ctx, 0)).rejects.toThrow('The page title must not be empty');
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});

	describe('sub-tree (includeDescendants)', () => {
		function mockTree(descendantsByNode: Record<string, IDataObject[]>) {
			apiRequest.mockImplementation(async (_method, endpoint, _body, qs) => {
				const match = /^\/wiki\/api\/v2\/pages\/(\d+)\/descendants$/.exec(endpoint);
				if (match) return { results: descendantsByNode[match[1]] ?? [] };
				if (endpoint === '/wiki/api/v2/pages') {
					const ids = String((qs as IDataObject).id).split(',');
					return { results: ids.map((id) => ({ id, title: `Page ${id}` })) };
				}
				throw new Error(`unexpected endpoint ${endpoint}`);
			});
		}

		it('discovers descendants and hydrates them in one batched request, root included', async () => {
			mockTree({
				'100': [
					{ id: '101', type: 'page', depth: 1 },
					{ id: '102', type: 'page', depth: 2 },
					{ id: '900', type: 'whiteboard', depth: 1 },
				],
			});
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
				maxPages: 100,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expect(apiRequest).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/wiki/api/v2/pages/100/descendants',
				{},
				{ depth: 10, limit: 250 },
			);
			expect(apiRequest).toHaveBeenNthCalledWith(
				2,
				'GET',
				'/wiki/api/v2/pages',
				{},
				{ id: '100,101,102', 'body-format': 'storage', limit: 250 },
			);
			expect(result.map((page) => page.id)).toEqual(['100', '101', '102']);
		});

		it('follows the discovery cursor and deduplicates repeated records', async () => {
			apiRequest.mockImplementation(async (_method, endpoint, _body, qs) => {
				if (endpoint === '/wiki/api/v2/pages/100/descendants') {
					if ((qs as IDataObject).cursor === undefined) {
						return {
							results: [{ id: '101', type: 'page', depth: 1 }],
							_links: { next: '/wiki/api/v2/pages/100/descendants?cursor=abc%3D%3D' },
						};
					}
					expect((qs as IDataObject).cursor).toBe('abc==');
					return {
						results: [
							{ id: '102', type: 'page', depth: 1 },
							{ id: '101', type: 'page', depth: 1 },
						],
					};
				}
				if (endpoint === '/wiki/api/v2/pages') {
					const ids = String((qs as IDataObject).id).split(',');
					return { results: ids.map((id) => ({ id })) };
				}
				throw new Error(`unexpected endpoint ${endpoint}`);
			});
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(result.map((page) => page.id)).toEqual(['100', '101', '102']);
		});

		it('stops discovery when the server echoes a cursor it already returned', async () => {
			apiRequest.mockImplementation(async (_method, endpoint, _body, qs) => {
				if (endpoint === '/wiki/api/v2/pages/100/descendants') {
					return {
						results:
							(qs as IDataObject).cursor === undefined
								? [{ id: '101', type: 'page', depth: 1 }]
								: [],
						_links: { next: '/wiki/api/v2/pages/100/descendants?cursor=same' },
					};
				}
				if (endpoint === '/wiki/api/v2/pages') {
					const ids = String((qs as IDataObject).id).split(',');
					return { results: ids.map((id) => ({ id })) };
				}
				throw new Error(`unexpected endpoint ${endpoint}`);
			});
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			const descendantCalls = apiRequest.mock.calls.filter(([, endpoint]) =>
				endpoint.endsWith('/descendants'),
			);
			expect(descendantCalls).toHaveLength(2);
			expect(result.map((page) => page.id)).toEqual(['100', '101']);
		});

		it('re-roots the walk from pages and folders at the maximum depth, but not whiteboards', async () => {
			mockTree({
				'100': [
					{ id: '101', type: 'page', depth: 10 },
					{ id: '555', type: 'folder', depth: 10 },
					{ id: '900', type: 'whiteboard', depth: 10 },
				],
				'101': [{ id: '201', type: 'page', depth: 1 }],
				'555': [{ id: '301', type: 'page', depth: 1 }],
			});
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			const descendantCalls = apiRequest.mock.calls
				.map(([, endpoint]) => endpoint)
				.filter((endpoint) => endpoint.endsWith('/descendants'));
			expect(descendantCalls).toEqual([
				'/wiki/api/v2/pages/100/descendants',
				'/wiki/api/v2/pages/101/descendants',
				'/wiki/api/v2/pages/555/descendants',
			]);
			// The folder and whiteboard are traversal-only records, never hydrated
			expect(result.map((page) => page.id)).toEqual(['100', '101', '201', '301']);
		});

		it('stops the walk at Max Pages, root included', async () => {
			mockTree({
				'100': [
					{ id: '101', type: 'page', depth: 1 },
					{ id: '102', type: 'page', depth: 1 },
					{ id: '103', type: 'page', depth: 1 },
				],
			});
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
				maxPages: 2,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(result.map((page) => page.id)).toEqual(['100', '101']);
		});

		it('floors a fractional Max Pages', async () => {
			mockTree({
				'100': [
					{ id: '101', type: 'page', depth: 1 },
					{ id: '102', type: 'page', depth: 1 },
				],
			});
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
				maxPages: 2.5,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(result.map((page) => page.id)).toEqual(['100', '101']);
		});

		// An expression can deliver a numeric string, e.g. from HTTP or form data
		it('accepts a numeric-string Max Pages', async () => {
			mockTree({
				'100': [
					{ id: '101', type: 'page', depth: 1 },
					{ id: '102', type: 'page', depth: 1 },
				],
			});
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
				maxPages: '2',
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(result.map((page) => page.id)).toEqual(['100', '101']);
		});

		it('rejects a Max Pages below 1', async () => {
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
				maxPages: 0,
			});

			await expect(execute.call(ctx, 0)).rejects.toThrow(
				'Max Pages must be a finite number of at least 1',
			);
		});

		it('skips discovery entirely when Max Pages is 1', async () => {
			mockTree({});
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
				maxPages: 1,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(apiRequest).toHaveBeenCalledTimes(1);
			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/wiki/api/v2/pages',
				{},
				{ id: '100', 'body-format': 'storage', limit: 250 },
			);
			expect(result.map((page) => page.id)).toEqual(['100']);
		});

		it('chunks hydration into batches of 250 IDs', async () => {
			mockTree({
				'100': Array.from({ length: 260 }, (_, i) => ({
					id: String(200 + i),
					type: 'page',
					depth: 1,
				})),
			});
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
				maxPages: 1000,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			const bulkCalls = apiRequest.mock.calls.filter(
				([, endpoint]) => endpoint === '/wiki/api/v2/pages',
			);
			expect(bulkCalls).toHaveLength(2);
			expect(String((bulkCalls[0][3] as IDataObject).id).split(',')).toHaveLength(250);
			expect(String((bulkCalls[1][3] as IDataObject).id).split(',')).toHaveLength(11);
			expect(result).toHaveLength(261);
		});

		it('honors the plain text body format on every sub-tree item', async () => {
			const adf = JSON.stringify({
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'body text' }] }],
			});
			apiRequest.mockImplementation(async (_method, endpoint, _body, qs) => {
				if (endpoint === '/wiki/api/v2/pages/100/descendants') {
					return { results: [{ id: '101', type: 'page', depth: 1 }] };
				}
				if (endpoint === '/wiki/api/v2/pages') {
					expect((qs as IDataObject)['body-format']).toBe('atlas_doc_format');
					const ids = String((qs as IDataObject).id).split(',');
					return {
						results: ids.map((id) => ({ id, body: { atlas_doc_format: { value: adf } } })),
					};
				}
				throw new Error(`unexpected endpoint ${endpoint}`);
			});
			const ctx = createContext({
				page: { mode: 'id', value: '100' },
				includeDescendants: true,
				bodyFormat: 'plainText',
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(result).toHaveLength(2);
			for (const page of result) {
				expect(page.body).toEqual({
					plainText: { representation: 'plain_text', value: 'body text' },
				});
			}
		});
	});
});
