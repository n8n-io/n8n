import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { execute } from '../../../actions/search/query.operation';
import { confluenceApiRequest } from '../../../transport';
import { mockExecuteCtx } from '../../shared';

vi.mock('../../../transport', async (importOriginal) => ({
	...(await importOriginal<object>()),
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = confluenceApiRequest as unknown as Mock;

const baseParams: Record<string, unknown> = {
	cql: 'type = page',
	returnAll: false,
	limit: 100,
	options: {},
};

describe('search:query', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue({ results: [] });
	});

	it('queries the v1 search endpoint with the CQL and page size', async () => {
		apiRequest.mockResolvedValue({ results: [{ title: 'Hit' }] });

		const result = await execute.call(mockExecuteCtx(baseParams), 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			{ cql: 'type = page', limit: 50 },
		);
		expect(result).toEqual([{ title: 'Hit' }]);
	});

	it('returns an empty array when nothing matches', async () => {
		const result = await execute.call(mockExecuteCtx(baseParams), 0);

		expect(result).toEqual([]);
	});

	it('coerces a non-string query from an expression', async () => {
		await execute.call(mockExecuteCtx({ ...baseParams, cql: 32 }), 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			expect.objectContaining({ cql: '32' }),
		);
	});

	it('rejects an empty query after trimming', async () => {
		const promise = execute.call(mockExecuteCtx({ ...baseParams, cql: '   ' }), 0);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('The CQL query must not be empty');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects a non-positive limit from an expression', async () => {
		const promise = execute.call(mockExecuteCtx({ ...baseParams, limit: 0 }), 0);

		await expect(promise).rejects.toThrow('Limit must be a number of at least 1');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('returns all pages by following the next cursor with the same query', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: [{ id: '1' }, { id: '2' }],
				_links: { next: '/rest/api/search?cql=type%3Dpage&cursor=abc&limit=50' },
			})
			.mockResolvedValueOnce({ results: [{ id: '3' }] });

		const result = await execute.call(mockExecuteCtx({ ...baseParams, returnAll: true }), 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/wiki/rest/api/search',
			{},
			{ cql: 'type = page', limit: 50, cursor: 'abc' },
		);
		expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
	});

	it('falls back to the start offset when the next link carries no cursor', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: [{ id: '1' }],
				_links: { next: '/rest/api/search?cql=type%3Dpage&start=25&limit=25' },
			})
			.mockResolvedValueOnce({ results: [] });

		await execute.call(mockExecuteCtx({ ...baseParams, returnAll: true }), 0);

		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/wiki/rest/api/search',
			{},
			expect.objectContaining({ start: '25' }),
		);
	});

	it('requests only the limit when it is below the page size', async () => {
		apiRequest.mockResolvedValue({
			results: [{ id: '1' }, { id: '2' }],
			_links: { next: '/rest/api/search?cursor=abc' },
		});

		const result = await execute.call(mockExecuteCtx({ ...baseParams, limit: 1 }), 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			{ cql: 'type = page', limit: 1 },
		);
		expect(result).toEqual([{ id: '1' }]);
	});

	it('stops fetching and truncates once the limit is met', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: [{ id: '1' }, { id: '2' }],
				_links: { next: '/rest/api/search?cursor=abc' },
			})
			.mockResolvedValueOnce({
				results: [{ id: '3' }, { id: '4' }],
				_links: { next: '/rest/api/search?cursor=def' },
			});

		const result = await execute.call(mockExecuteCtx({ ...baseParams, limit: 3 }), 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/wiki/rest/api/search',
			{},
			{ cql: 'type = page', limit: 1, cursor: 'abc' },
		);
		expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
	});

	it('coerces a numeric-string limit from an expression', async () => {
		apiRequest.mockResolvedValue({ results: [{ id: '1' }, { id: '2' }, { id: '3' }] });

		const result = await execute.call(mockExecuteCtx({ ...baseParams, limit: '2' }), 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			expect.objectContaining({ limit: 2 }),
		);
		expect(result).toEqual([{ id: '1' }, { id: '2' }]);
	});

	it('stops when the next link repeats the same cursor', async () => {
		apiRequest.mockResolvedValue({
			results: [],
			_links: { next: '/rest/api/search?cursor=same' },
		});

		const result = await execute.call(mockExecuteCtx({ ...baseParams, returnAll: true }), 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(result).toEqual([]);
	});

	it('stops after a run of consecutive empty pages even when cursors keep changing', async () => {
		let page = 0;
		apiRequest.mockImplementation(async () => ({
			results: [],
			_links: { next: `/rest/api/search?cursor=c${++page}` },
		}));

		const result = await execute.call(mockExecuteCtx({ ...baseParams, returnAll: true }), 0);

		expect(apiRequest).toHaveBeenCalledTimes(5);
		expect(result).toEqual([]);
	});

	it('stops when the next link has no usable parameter', async () => {
		apiRequest.mockResolvedValueOnce({
			results: [{ id: '1' }],
			_links: { next: '/rest/api/search?next=true' },
		});

		const result = await execute.call(mockExecuteCtx({ ...baseParams, returnAll: true }), 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(result).toEqual([{ id: '1' }]);
	});

	it.each([
		['the full-content toggle', { fetchFullPageContent: true }, 'content.body.storage'],
		[
			'additional expand fields, trimmed',
			{ additionalExpandFields: ' content.version , space ,' },
			'content.version,space',
		],
		[
			'both merged without duplicates',
			{
				fetchFullPageContent: true,
				additionalExpandFields: 'content.body.storage,content.version',
			},
			'content.body.storage,content.version',
		],
	])('sends expand for %s', async (_name, options, expand) => {
		await execute.call(mockExecuteCtx({ ...baseParams, options }), 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			expect.objectContaining({ expand }),
		);
	});

	it('sends cqlcontext when content statuses are selected', async () => {
		await execute.call(
			mockExecuteCtx({ ...baseParams, options: { contentStatuses: ['draft', 'archived'] } }),
			0,
		);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			expect.objectContaining({ cqlcontext: '{"contentStatuses":["draft","archived"]}' }),
		);
	});

	it('omits expand and cqlcontext when no options are set', async () => {
		await execute.call(mockExecuteCtx(baseParams), 0);

		const qs = apiRequest.mock.calls[0][3] as Record<string, unknown>;
		expect(qs).not.toHaveProperty('expand');
		expect(qs).not.toHaveProperty('cqlcontext');
	});
});
