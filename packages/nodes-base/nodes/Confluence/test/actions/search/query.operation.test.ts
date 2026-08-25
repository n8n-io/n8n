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

const SEARCH_ENDPOINT = '/wiki/rest/api/search';

const runSearch = async (overrides: Record<string, unknown> = {}) =>
	await execute.call(mockExecuteCtx({ ...baseParams, ...overrides }), 0);

const expectSearchRequest = (qs: unknown) =>
	expect(apiRequest).toHaveBeenCalledWith('GET', SEARCH_ENDPOINT, {}, qs);

const expectNthSearchRequest = (nth: number, qs: unknown) =>
	expect(apiRequest).toHaveBeenNthCalledWith(nth, 'GET', SEARCH_ENDPOINT, {}, qs);

function searchPage(ids: string[], next?: string) {
	return {
		results: ids.map((id) => ({ id })),
		...(next === undefined ? {} : { _links: { next } }),
	};
}

describe('search:query', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue(searchPage([]));
	});

	it('queries the v1 search endpoint with the CQL and page size', async () => {
		apiRequest.mockResolvedValue({ results: [{ title: 'Hit' }] });

		const result = await runSearch();

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expectSearchRequest({ cql: 'type = page', limit: 50 });
		expect(result).toEqual([{ title: 'Hit' }]);
	});

	it('returns an empty array when nothing matches', async () => {
		expect(await runSearch()).toEqual([]);
	});

	it('coerces a non-string query from an expression', async () => {
		await runSearch({ cql: 32 });

		expectSearchRequest(expect.objectContaining({ cql: '32' }));
	});

	it('rejects an empty query after trimming', async () => {
		const promise = runSearch({ cql: '   ' });

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('The CQL query must not be empty');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects a non-positive limit from an expression', async () => {
		const promise = runSearch({ limit: 0 });

		await expect(promise).rejects.toThrow('Limit must be a finite number of at least 1');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('rejects a non-finite limit from an expression', async () => {
		const promise = runSearch({ limit: Infinity });

		await expect(promise).rejects.toThrow('Limit must be a finite number of at least 1');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('returns all pages by following the next cursor with the same query', async () => {
		apiRequest
			.mockResolvedValueOnce(
				searchPage(['1', '2'], '/rest/api/search?cql=type%3Dpage&cursor=abc&limit=50'),
			)
			.mockResolvedValueOnce(searchPage(['3']));

		const result = await runSearch({ returnAll: true });

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expectNthSearchRequest(2, { cql: 'type = page', limit: 50, cursor: 'abc' });
		expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
	});

	it('falls back to the start offset when the next link carries no cursor', async () => {
		apiRequest
			.mockResolvedValueOnce(
				searchPage(['1'], '/rest/api/search?cql=type%3Dpage&start=25&limit=25'),
			)
			.mockResolvedValueOnce(searchPage([]));

		await runSearch({ returnAll: true });

		expectNthSearchRequest(2, expect.objectContaining({ start: '25' }));
	});

	it('requests only the limit when it is below the page size', async () => {
		apiRequest.mockResolvedValue(searchPage(['1', '2'], '/rest/api/search?cursor=abc'));

		const result = await runSearch({ limit: 1 });

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expectSearchRequest({ cql: 'type = page', limit: 1 });
		expect(result).toEqual([{ id: '1' }]);
	});

	it('stops fetching and truncates once the limit is met', async () => {
		apiRequest
			.mockResolvedValueOnce(searchPage(['1', '2'], '/rest/api/search?cursor=abc'))
			.mockResolvedValueOnce(searchPage(['3', '4'], '/rest/api/search?cursor=def'));

		const result = await runSearch({ limit: 3 });

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expectNthSearchRequest(2, { cql: 'type = page', limit: 1, cursor: 'abc' });
		expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
	});

	it('coerces a numeric-string limit from an expression', async () => {
		apiRequest.mockResolvedValue(searchPage(['1', '2', '3']));

		const result = await runSearch({ limit: '2' });

		expectSearchRequest(expect.objectContaining({ limit: 2 }));
		expect(result).toEqual([{ id: '1' }, { id: '2' }]);
	});

	it('stops when the next link repeats the same cursor', async () => {
		apiRequest.mockResolvedValue(searchPage([], '/rest/api/search?cursor=same'));

		const result = await runSearch({ returnAll: true });

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(result).toEqual([]);
	});

	it('stops when the next links cycle between earlier cursors', async () => {
		apiRequest
			.mockResolvedValueOnce(searchPage(['1'], '/rest/api/search?cursor=a'))
			.mockResolvedValueOnce(searchPage(['2'], '/rest/api/search?cursor=b'))
			.mockResolvedValue(searchPage(['3'], '/rest/api/search?cursor=a'));

		const result = await runSearch({ returnAll: true });

		expect(apiRequest).toHaveBeenCalledTimes(3);
		expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
	});

	it('stops after a run of consecutive empty pages even when cursors keep changing', async () => {
		let page = 0;
		apiRequest.mockImplementation(async () => searchPage([], `/rest/api/search?cursor=c${++page}`));

		const result = await runSearch({ returnAll: true });

		expect(apiRequest).toHaveBeenCalledTimes(5);
		expect(result).toEqual([]);
	});

	it('stops when the next link has no usable parameter', async () => {
		apiRequest.mockResolvedValueOnce(searchPage(['1'], '/rest/api/search?next=true'));

		const result = await runSearch({ returnAll: true });

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
		await runSearch({ options });

		expectSearchRequest(expect.objectContaining({ expand }));
	});

	it('sends cqlcontext when content statuses are selected', async () => {
		await runSearch({ options: { contentStatuses: ['draft', 'archived'] } });

		expectSearchRequest(
			expect.objectContaining({ cqlcontext: '{"contentStatuses":["draft","archived"]}' }),
		);
	});

	it('omits expand and cqlcontext when no options are set', async () => {
		await runSearch();

		const qs = apiRequest.mock.calls[0][3] as Record<string, unknown>;
		expect(qs).not.toHaveProperty('expand');
		expect(qs).not.toHaveProperty('cqlcontext');
	});
});
