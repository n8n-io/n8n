import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../actions/space/getMany.operation';
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
		(name: string, _itemIndex?: number, fallback?: unknown) =>
			(name in params ? params[name] : fallback) as never,
	);
	return ctx;
}

function spaces(from: number, count: number) {
	return Array.from({ length: count }, (_, i) => ({ id: String(from + i), name: `S${from + i}` }));
}

describe('Confluence space:getMany operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches a single page capped at the limit', async () => {
		apiRequest.mockResolvedValueOnce({ results: spaces(1, 2) });
		const ctx = createContext({ returnAll: false, limit: 2 });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('GET', '/wiki/api/v2/spaces', {}, { limit: 2 });
		expect(result).toEqual(spaces(1, 2));
	});

	it('follows cursors until the limit is reached and trims the overshoot', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: spaces(1, 2),
				_links: { next: '/wiki/api/v2/spaces?cursor=abc' },
			})
			.mockResolvedValueOnce({
				results: spaces(3, 2),
				_links: { next: '/wiki/api/v2/spaces?cursor=def' },
			});
		const ctx = createContext({ returnAll: false, limit: 3 });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(1, 'GET', '/wiki/api/v2/spaces', {}, { limit: 3 });
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/wiki/api/v2/spaces',
			{},
			{ limit: 1, cursor: 'abc' },
		);
		expect(result).toEqual(spaces(1, 3));
	});

	it('returns all spaces across pages when Return All is on', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: spaces(1, 2),
				_links: { next: '/wiki/api/v2/spaces?cursor=abc' },
			})
			.mockResolvedValueOnce({ results: spaces(3, 1) });
		const ctx = createContext({ returnAll: true });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(1, 'GET', '/wiki/api/v2/spaces', {}, { limit: 250 });
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/wiki/api/v2/spaces',
			{},
			{ limit: 250, cursor: 'abc' },
		);
		expect(result).toEqual(spaces(1, 3));
	});

	it('requests at most the endpoint page size even for large limits', async () => {
		apiRequest.mockResolvedValueOnce({ results: spaces(1, 250) });
		const ctx = createContext({ returnAll: false, limit: 1000 });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', '/wiki/api/v2/spaces', {}, { limit: 250 });
		expect(result).toHaveLength(250);
	});

	it('stops when the API stops returning a next cursor before the limit', async () => {
		apiRequest.mockResolvedValueOnce({ results: spaces(1, 2) });
		const ctx = createContext({ returnAll: false, limit: 50 });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(result).toEqual(spaces(1, 2));
	});

	it('stops instead of looping when the API repeats a pagination cursor', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: spaces(1, 2),
				_links: { next: '/wiki/api/v2/spaces?cursor=abc' },
			})
			.mockResolvedValue({
				results: spaces(3, 1),
				_links: { next: '/wiki/api/v2/spaces?cursor=abc' },
			});
		const ctx = createContext({ returnAll: true });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(result).toEqual(spaces(1, 3));
	});

	it('stops instead of looping when cursors cycle through earlier pages', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: spaces(1, 1),
				_links: { next: '/wiki/api/v2/spaces?cursor=c1' },
			})
			.mockResolvedValueOnce({
				results: spaces(2, 1),
				_links: { next: '/wiki/api/v2/spaces?cursor=c2' },
			})
			.mockResolvedValue({
				results: spaces(3, 1),
				_links: { next: '/wiki/api/v2/spaces?cursor=c1' },
			});
		const ctx = createContext({ returnAll: true });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(3);
		expect(result).toEqual(spaces(1, 3));
	});

	it('keeps following the cursor past an empty page that still has a next link', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: [],
				_links: { next: '/wiki/api/v2/spaces?cursor=abc' },
			})
			.mockResolvedValueOnce({ results: spaces(1, 2) });
		const ctx = createContext({ returnAll: true });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/wiki/api/v2/spaces',
			{},
			{ limit: 250, cursor: 'abc' },
		);
		expect(result).toEqual(spaces(1, 2));
	});

	it('passes the description format through when the option is set', async () => {
		apiRequest.mockResolvedValueOnce({ results: spaces(1, 1) });
		const ctx = createContext({
			returnAll: false,
			limit: 50,
			options: { descriptionFormat: 'view' },
		});

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/spaces',
			{},
			{ 'description-format': 'view', limit: 50 },
		);
	});

	it('returns an empty list for a response without results', async () => {
		apiRequest.mockResolvedValueOnce({});
		const ctx = createContext({ returnAll: true });

		await expect(execute.call(ctx, 0)).resolves.toEqual([]);
	});

	it('rejects a non-positive limit', async () => {
		const ctx = createContext({ returnAll: false, limit: 0 });

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow(
			'Limit must be a finite number of at least 1',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
