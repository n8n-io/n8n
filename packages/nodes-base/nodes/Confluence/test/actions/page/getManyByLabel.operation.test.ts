import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeParameterResourceLocator,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../actions/page/getManyByLabel.operation';
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
			const value = params[name] ?? fallback;
			if (options?.extractValue && value && typeof value === 'object' && 'value' in value) {
				return (value as INodeParameterResourceLocator).value as never;
			}
			return value as never;
		},
	);
	return ctx;
}

describe('Confluence page:getManyByLabel operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches pages for a label by ID with the storage body format', async () => {
		const pages = [
			{ id: '1', title: 'Runbook A', body: { storage: { value: '<p>a</p>' } } },
			{ id: '2', title: 'Runbook B', body: { storage: { value: '<p>b</p>' } } },
		];
		apiRequest.mockResolvedValueOnce({ results: pages });
		const ctx = createContext({
			label: { mode: 'id', value: '777' },
			bodyFormat: 'storage',
		});

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/labels/777/pages',
			{},
			{ 'body-format': 'storage', limit: 100 },
		);
		expect(result).toEqual(pages);
	});

	it('resolves a label picked from the list through extractValue', async () => {
		apiRequest.mockResolvedValueOnce({ results: [] });
		const ctx = createContext({
			label: { mode: 'list', value: '777', cachedResultName: 'runbook' },
		});

		await execute.call(ctx, 0);

		expect(ctx.getNodeParameter).toHaveBeenCalledWith('label', 0, '', { extractValue: true });
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/labels/777/pages',
			{},
			expect.objectContaining({ limit: 100 }),
		);
	});

	it('throws when the label reference is empty', async () => {
		const ctx = createContext({ label: { mode: 'id', value: ' ' } });

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Label' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('scopes the request to the selected space', async () => {
		apiRequest.mockResolvedValueOnce({ results: [] });
		const ctx = createContext({
			label: { mode: 'id', value: '777' },
			space: { mode: 'list', value: '999', cachedResultName: 'Docs Space' },
		});

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/labels/777/pages',
			{},
			expect.objectContaining({ 'space-id': '999' }),
		);
	});

	it('omits the space filter when "All Spaces" is selected', async () => {
		apiRequest.mockResolvedValueOnce({ results: [] });
		const ctx = createContext({
			label: { mode: 'id', value: '777' },
			space: { mode: 'list', value: '' },
		});

		await execute.call(ctx, 0);

		const qs = apiRequest.mock.calls[0][3] as IDataObject;
		expect(qs['space-id']).toBeUndefined();
	});

	describe('pagination', () => {
		it('follows the cursor across pages when Return All is on', async () => {
			apiRequest
				.mockResolvedValueOnce({
					results: [{ id: '1' }, { id: '2' }],
					_links: { next: '/wiki/api/v2/labels/777/pages?cursor=abc%3D%3D' },
				})
				.mockResolvedValueOnce({ results: [{ id: '3' }] });
			const ctx = createContext({
				label: { mode: 'id', value: '777' },
				returnAll: true,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expect(apiRequest).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/wiki/api/v2/labels/777/pages',
				{},
				{ 'body-format': 'storage', limit: 250 },
			);
			expect(apiRequest).toHaveBeenNthCalledWith(
				2,
				'GET',
				'/wiki/api/v2/labels/777/pages',
				{},
				{ 'body-format': 'storage', limit: 250, cursor: 'abc==' },
			);
			expect(result.map((page) => page.id)).toEqual(['1', '2', '3']);
		});

		it('stops at the limit and only requests the remainder on follow-up pages', async () => {
			apiRequest
				.mockResolvedValueOnce({
					results: [{ id: '1' }, { id: '2' }],
					_links: { next: '/wiki/api/v2/labels/777/pages?cursor=c2' },
				})
				.mockResolvedValueOnce({
					results: [{ id: '3' }, { id: '4' }],
					_links: { next: '/wiki/api/v2/labels/777/pages?cursor=c3' },
				});
			const ctx = createContext({
				label: { mode: 'id', value: '777' },
				returnAll: false,
				limit: 3,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expect((apiRequest.mock.calls[0][3] as IDataObject).limit).toBe(3);
			expect((apiRequest.mock.calls[1][3] as IDataObject).limit).toBe(1);
			expect(result.map((page) => page.id)).toEqual(['1', '2', '3']);
		});

		it('stops when the API repeats a next cursor instead of refetching forever', async () => {
			apiRequest
				.mockResolvedValueOnce({
					results: [{ id: '1' }],
					_links: { next: '/wiki/api/v2/labels/777/pages?cursor=same' },
				})
				.mockResolvedValueOnce({
					results: [{ id: '2' }],
					_links: { next: '/wiki/api/v2/labels/777/pages?cursor=same' },
				});
			const ctx = createContext({
				label: { mode: 'id', value: '777' },
				returnAll: true,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expect(result.map((page) => page.id)).toEqual(['1', '2']);
		});

		it('stops when the response has no next cursor even below the limit', async () => {
			apiRequest.mockResolvedValueOnce({ results: [{ id: '1' }] });
			const ctx = createContext({
				label: { mode: 'id', value: '777' },
				returnAll: false,
				limit: 50,
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(apiRequest).toHaveBeenCalledTimes(1);
			expect(result.map((page) => page.id)).toEqual(['1']);
		});

		it('caps the per-request page size at 250', async () => {
			apiRequest.mockResolvedValueOnce({ results: [] });
			const ctx = createContext({
				label: { mode: 'id', value: '777' },
				returnAll: false,
				limit: 1000,
			});

			await execute.call(ctx, 0);

			expect((apiRequest.mock.calls[0][3] as IDataObject).limit).toBe(250);
		});

		it('rejects a limit below 1', async () => {
			const ctx = createContext({
				label: { mode: 'id', value: '777' },
				returnAll: false,
				limit: 0,
			});

			await expect(execute.call(ctx, 0)).rejects.toThrow(
				'Limit must be a finite number of at least 1',
			);
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});

	describe('body formats', () => {
		it('passes atlas_doc_format through untouched', async () => {
			const pages = [{ id: '1', body: { atlas_doc_format: { value: '{"type":"doc"}' } } }];
			apiRequest.mockResolvedValueOnce({ results: pages });
			const ctx = createContext({
				label: { mode: 'id', value: '777' },
				bodyFormat: 'atlas_doc_format',
			});

			const result = await execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/wiki/api/v2/labels/777/pages',
				{},
				expect.objectContaining({ 'body-format': 'atlas_doc_format' }),
			);
			expect(result).toEqual(pages);
		});

		it('requests ADF and extracts plain text on every page', async () => {
			const adf = JSON.stringify({
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'body text' }] }],
			});
			apiRequest.mockResolvedValueOnce({
				results: [
					{ id: '1', body: { atlas_doc_format: { value: adf } } },
					{ id: '2', body: { atlas_doc_format: { value: adf } } },
				],
			});
			const ctx = createContext({
				label: { mode: 'id', value: '777' },
				bodyFormat: 'plainText',
			});

			const result = (await execute.call(ctx, 0)) as IDataObject[];

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/wiki/api/v2/labels/777/pages',
				{},
				expect.objectContaining({ 'body-format': 'atlas_doc_format' }),
			);
			expect(result).toHaveLength(2);
			for (const page of result) {
				expect(page.body).toEqual({
					plainText: { representation: 'plain_text', value: 'body text' },
				});
			}
		});
	});
});
