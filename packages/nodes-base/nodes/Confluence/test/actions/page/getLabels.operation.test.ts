import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { execute } from '../../../actions/page/getLabels.operation';
import { confluenceApiRequest } from '../../../transport';
import { mockExecuteCtx } from '../../shared';

vi.mock('../../../transport', () => ({
	CONFLUENCE_CREDENTIAL_NAME: 'confluenceCloudOAuth2Api',
	confluenceApiRequest: vi.fn(),
}));

const apiRequest = vi.mocked(confluenceApiRequest);

const ENDPOINT = '/wiki/api/v2/pages/123/labels';

const baseParams = {
	page: { mode: 'id', value: '123' },
	returnAll: false,
	limit: 50,
	options: {},
};

function labelsOf(result: IDataObject | IDataObject[]): IDataObject[] {
	return result as IDataObject[];
}

describe('Confluence page:getLabels operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('requests the page labels and returns them unchanged', async () => {
		const labels = [
			{ id: '1', name: 'release', prefix: 'global' },
			{ id: '2', name: 'draft', prefix: 'my' },
		];
		apiRequest.mockResolvedValueOnce({ results: labels });
		const ctx = mockExecuteCtx(baseParams);

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 50 });
		expect(result).toEqual(labels);
	});

	it('throws and makes no request when the page reference is empty', async () => {
		const ctx = mockExecuteCtx({ ...baseParams, page: { mode: 'id', value: ' ' } });

		await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Page' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('omits prefix and sort when Options is empty', async () => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '1' }] });
		const ctx = mockExecuteCtx(baseParams);

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 50 });
	});

	it('omits prefix when the option was added but nothing is selected', async () => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '1' }] });
		const ctx = mockExecuteCtx({ ...baseParams, options: { prefix: [], sortBy: 'name' } });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 50, sort: 'name' });
	});

	// `prefix: ''` would be a hard 400 against the enum-typed param
	it.each([[''], [['']]])('omits prefix when it resolves to %j', async (prefix) => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '1' }] });
		const ctx = mockExecuteCtx({ ...baseParams, options: { prefix } });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 50 });
	});

	it.each([
		[['my', 'team'], 'my,team'],
		[['my'], 'my'],
		// An expression can deliver a bare string where multiOptions gives an array
		['my', 'my'],
	])('sends prefix %j as %s', async (prefix, expected) => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '1' }] });
		const ctx = mockExecuteCtx({ ...baseParams, options: { prefix } });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 50, prefix: expected });
	});

	it.each([
		['created-date', 'desc', '-created-date'],
		['created-date', 'asc', 'created-date'],
		// Direction defaults to ascending, so Sort By alone must not carry a `-`
		['name', undefined, 'name'],
	])('combines sortBy %s and direction %s into sort=%s', async (sortBy, sortDirection, sort) => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '1' }] });
		const options = sortDirection === undefined ? { sortBy } : { sortBy, sortDirection };
		const ctx = mockExecuteCtx({ ...baseParams, options });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 50, sort });
	});

	it('omits sort when only a direction is set', async () => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '1' }] });
		const ctx = mockExecuteCtx({ ...baseParams, options: { sortDirection: 'desc' } });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 50 });
	});

	it('follows the next cursor under Return All and forwards the extracted cursor', async () => {
		apiRequest.mockImplementation(async (_method, _endpoint, _body, qs) => {
			if (qs?.cursor === undefined) {
				return {
					results: [{ id: '1' }, { id: '2' }, { id: '3' }],
					_links: { next: '/wiki/api/v2/pages/123/labels?cursor=abc%3D%3D' },
				};
			}
			expect(qs.cursor).toBe('abc==');
			return { results: [{ id: '4' }, { id: '5' }, { id: '6' }] };
		});
		// A stale Limit left in the UI must not shrink the per-request limit
		const ctx = mockExecuteCtx({ ...baseParams, returnAll: true, limit: 5 });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(1, 'GET', ENDPOINT, {}, { limit: 250 });
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			ENDPOINT,
			{},
			{ limit: 250, cursor: 'abc==' },
		);
		expect(labelsOf(result).map((label) => label.id)).toEqual(['1', '2', '3', '4', '5', '6']);
	});

	it('shrinks the last request to the remaining limit and stops there', async () => {
		apiRequest
			.mockResolvedValueOnce({
				results: Array.from({ length: 250 }, (_, i) => ({ id: String(i) })),
				_links: { next: '/wiki/api/v2/pages/123/labels?cursor=page2' },
			})
			.mockResolvedValueOnce({
				results: Array.from({ length: 50 }, (_, i) => ({ id: String(250 + i) })),
				_links: { next: '/wiki/api/v2/pages/123/labels?cursor=page3' },
			});
		const ctx = mockExecuteCtx({ ...baseParams, limit: 300 });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(1, 'GET', ENDPOINT, {}, { limit: 250 });
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			ENDPOINT,
			{},
			{ limit: 50, cursor: 'page2' },
		);
		expect(labelsOf(result)).toHaveLength(300);
	});

	it('stops after one request when there is no next link, even below the limit', async () => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '1' }], _links: {} });
		const ctx = mockExecuteCtx(baseParams);

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(labelsOf(result)).toHaveLength(1);
	});

	it('returns an empty array when the response has no results', async () => {
		apiRequest.mockResolvedValueOnce({});
		const ctx = mockExecuteCtx(baseParams);

		expect(await execute.call(ctx, 0)).toEqual([]);
	});

	// An expression can deliver a numeric string, e.g. from HTTP or form data
	it('accepts a numeric-string Limit', async () => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '1' }] });
		const ctx = mockExecuteCtx({ ...baseParams, limit: '50' });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 50 });
	});

	it('floors a fractional Limit', async () => {
		apiRequest.mockResolvedValueOnce({ results: [{ id: '1' }, { id: '2' }] });
		const ctx = mockExecuteCtx({ ...baseParams, limit: 2.9 });

		await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith('GET', ENDPOINT, {}, { limit: 2 });
	});

	it.each([['abc'], [0], [-1], [undefined]])(
		'throws and makes no request when Limit resolves to %j',
		async (limit) => {
			const ctx = mockExecuteCtx({ ...baseParams, limit });

			await expect(execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			await expect(execute.call(ctx, 0)).rejects.toThrow(
				'Limit must be a finite number of at least 1',
			);
			expect(apiRequest).not.toHaveBeenCalled();
		},
	);

	it('breaks out when the server repeats the same cursor', async () => {
		apiRequest.mockResolvedValue({
			results: [{ id: '1' }],
			_links: { next: '/wiki/api/v2/pages/123/labels?cursor=same' },
		});
		const ctx = mockExecuteCtx({ ...baseParams, returnAll: true });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(labelsOf(result)).toHaveLength(2);
	});

	it('breaks out when the server cycles between two cursors', async () => {
		const pageWithNext = (cursor: string) => ({
			results: [{ id: cursor }],
			_links: { next: `${ENDPOINT}?cursor=${cursor}` },
		});
		apiRequest
			.mockResolvedValueOnce(pageWithNext('a'))
			.mockResolvedValueOnce(pageWithNext('b'))
			.mockResolvedValueOnce(pageWithNext('a'))
			// Only reached if the cycle isn't caught; ends the loop so the test can't hang
			.mockResolvedValue({ results: [{ id: 'extra' }] });
		const ctx = mockExecuteCtx({ ...baseParams, returnAll: true });

		const result = await execute.call(ctx, 0);

		expect(apiRequest.mock.calls.map(([, , , qs]) => qs?.cursor)).toEqual([undefined, 'a', 'b']);
		expect(labelsOf(result)).toHaveLength(3);
	});

	it('keeps paging past an empty page that still carries a next link', async () => {
		apiRequest
			.mockResolvedValueOnce({ results: [], _links: { next: `${ENDPOINT}?cursor=page2` } })
			.mockResolvedValueOnce({ results: [{ id: '1' }, { id: '2' }] });
		const ctx = mockExecuteCtx({ ...baseParams, returnAll: true });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			ENDPOINT,
			{},
			{ limit: 250, cursor: 'page2' },
		);
		expect(labelsOf(result).map((label) => label.id)).toEqual(['1', '2']);
	});

	it('clamps the output to Limit when the server over-delivers', async () => {
		apiRequest.mockResolvedValueOnce({
			results: Array.from({ length: 5 }, (_, i) => ({ id: String(i) })),
		});
		const ctx = mockExecuteCtx({ ...baseParams, limit: 3 });

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(labelsOf(result).map((label) => label.id)).toEqual(['0', '1', '2']);
	});
});
