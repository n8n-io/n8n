import type {
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeParameterResourceLocator,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../actions/page/delete.operation';
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

function forbidden(): NodeApiError {
	return new NodeApiError(mockNode, { message: 'Forbidden' }, { httpCode: '403' });
}

describe('Confluence page:delete operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue({});
	});

	it('moves a page to trash with a single delete request by default', async () => {
		const ctx = createContext({ page: { mode: 'id', value: '123' }, purge: false });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('DELETE', '/wiki/api/v2/pages/123');
		expect(result).toEqual({ deleted: true, pageId: '123', purged: false });
	});

	it('purges through the trash-then-purge two-step', async () => {
		const ctx = createContext({ page: { mode: 'id', value: '123' }, purge: true });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(1, 'DELETE', '/wiki/api/v2/pages/123');
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'DELETE',
			'/wiki/api/v2/pages/123',
			{},
			{ purge: true },
		);
		expect(result).toEqual({ deleted: true, pageId: '123', purged: true });
	});

	it('deletes a page by URL through the extracted ID', async () => {
		const ctx = createContext({
			page: {
				mode: 'url',
				value: 'https://example.atlassian.net/wiki/spaces/DOCS/pages/456/My+Page',
			},
			pageExtracted: '456',
		});

		await execute.call(ctx, 0);

		expect(ctx.getNodeParameter).toHaveBeenCalledWith('page', 0, '', { extractValue: true });
		expect(apiRequest).toHaveBeenCalledWith('DELETE', '/wiki/api/v2/pages/456');
	});

	it('resolves a By Title selection to its page ID before deleting', async () => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '777', title: 'Doc', spaceId: '1' }] });
		const ctx = createContext({ page: { mode: 'title', value: 'Doc' } });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'GET',
			'/wiki/api/v2/pages',
			{},
			{ title: 'Doc', limit: 250 },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(2, 'DELETE', '/wiki/api/v2/pages/777');
		expect(result).toEqual({ deleted: true, pageId: '777', purged: false });
	});

	it('still purges a page that is already in the trash', async () => {
		apiRequest
			.mockRejectedValueOnce(
				new NodeApiError(mockNode, { message: 'Not found' }, { httpCode: '404' }),
			)
			.mockResolvedValueOnce({});
		const ctx = createContext({ page: { mode: 'id', value: '123' }, purge: true });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'DELETE',
			'/wiki/api/v2/pages/123',
			{},
			{ purge: true },
		);
		expect(result).toEqual({ deleted: true, pageId: '123', purged: true });
	});

	it('surfaces the purge-step error when a purged page does not exist at all', async () => {
		const notFound = () =>
			new NodeApiError(mockNode, { message: 'Not found' }, { httpCode: '404' });
		apiRequest.mockRejectedValueOnce(notFound());
		const purgeError = notFound();
		apiRequest.mockRejectedValueOnce(purgeError);
		const ctx = createContext({ page: { mode: 'id', value: '123' }, purge: true });

		await expect(execute.call(ctx, 0)).rejects.toBe(purgeError);
		expect(apiRequest).toHaveBeenCalledTimes(2);
	});

	it('lists the masked-permission causes when a plain delete is not found', async () => {
		apiRequest.mockRejectedValueOnce(
			new NodeApiError(mockNode, { message: 'Not found' }, { httpCode: '404' }),
		);
		const ctx = createContext({ page: { mode: 'id', value: '123' }, purge: false });

		const promise = execute.call(ctx, 0);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('Confluence could not delete the page');
		await expect(promise).rejects.toMatchObject({
			description: expect.stringContaining('Confluence reports permission failures as "not found"'),
		});
	});

	it('does not attempt the purge when the trash step fails', async () => {
		apiRequest.mockRejectedValueOnce(new Error('boom'));
		const ctx = createContext({ page: { mode: 'id', value: '123' }, purge: true });

		await expect(execute.call(ctx, 0)).rejects.toThrow('boom');
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it('hints at the space "Delete pages" permission when the trash step is forbidden', async () => {
		apiRequest.mockRejectedValueOnce(forbidden());
		const ctx = createContext({ page: { mode: 'id', value: '123' }, purge: false });

		const promise = execute.call(ctx, 0);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('Confluence refused to delete the page');
		await expect(promise).rejects.toMatchObject({
			description: expect.stringContaining('"Delete pages" permission'),
		});
	});

	it('reports the page as trashed-but-restorable when the purge step is forbidden', async () => {
		apiRequest.mockResolvedValueOnce({}).mockRejectedValueOnce(forbidden());
		const ctx = createContext({ page: { mode: 'id', value: '123' }, purge: true });

		const promise = execute.call(ctx, 0);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('The page was moved to trash, but could not be purged');
		await expect(promise).rejects.toMatchObject({
			description: expect.stringContaining('admin permission'),
		});
	});

	it('rethrows non-403 API errors untouched', async () => {
		const serverError = new NodeApiError(mockNode, { message: 'oops' }, { httpCode: '500' });
		apiRequest.mockRejectedValueOnce(serverError);
		const ctx = createContext({ page: { mode: 'id', value: '123' } });

		await expect(execute.call(ctx, 0)).rejects.toBe(serverError);
	});

	it('throws when the page reference is empty', async () => {
		const ctx = createContext({ page: { mode: 'id', value: ' ' } });

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Page' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
