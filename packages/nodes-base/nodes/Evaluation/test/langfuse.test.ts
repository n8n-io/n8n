import { mock } from 'vitest-mock-extended';
import type {
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INode,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { langfuseDatasetSearch } from '../methods/listSearch';
import {
	buildLangfuseRow,
	getAllLangfuseDatasetItems,
	getLangfuseDataset,
	getLangfuseDatasetItemsPage,
	langfuseApiRequest,
	parseLangfuseDatasetVersion,
} from '../utils/langfuse';
import type { LangfuseDatasetItem } from '../utils/langfuse';
import type { Mock } from 'vitest';

type Context = IExecuteFunctions & ILoadOptionsFunctions;
type HttpRequest = (credential: string, options: IHttpRequestOptions) => Promise<unknown>;

const item = (id: string, status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE'): LangfuseDatasetItem => ({
	id,
	status,
	input: { q: id },
	expectedOutput: `expected-${id}`,
});

const meta = (page: number, totalPages: number, totalItems = totalPages * 50) => ({
	page,
	limit: 50,
	totalItems,
	totalPages,
});

describe('Langfuse transport', () => {
	let context: Context;
	let request: Mock<HttpRequest>;

	beforeEach(() => {
		request = vi.fn<HttpRequest>();
		context = mock<IExecuteFunctions>({
			getCredentials: vi.fn().mockResolvedValue({ host: 'https://langfuse.example.com/' }),
			getNode: vi.fn().mockReturnValue({ name: 'Evaluation Trigger' } as INode),
			helpers: { httpRequestWithAuthentication: request },
		}) as unknown as Context;
	});

	describe('langfuseApiRequest', () => {
		it('authenticates with langfuseApi and targets /api/public of the host without a trailing slash', async () => {
			request.mockResolvedValue({ ok: true });

			const result = await langfuseApiRequest.call(context, 'GET', '/v2/datasets', { page: 1 });

			expect(result).toEqual({ ok: true });
			expect(request).toHaveBeenCalledWith('langfuseApi', {
				method: 'GET',
				url: 'https://langfuse.example.com/api/public/v2/datasets',
				qs: { page: 1 },
				json: true,
				disableFollowRedirect: true,
			});
		});

		describe('credential domain policy', () => {
			const credentials = (extra: Record<string, unknown>) =>
				(context.getCredentials as Mock).mockResolvedValue({
					host: 'https://langfuse.example.com/',
					...extra,
				});

			it('works when the restriction is unset', async () => {
				request.mockResolvedValue({ ok: true });

				await expect(langfuseApiRequest.call(context, 'GET', '/projects')).resolves.toEqual({
					ok: true,
				});
			});

			it('works when the host matches the allowed domains', async () => {
				credentials({
					allowedHttpRequestDomains: 'domains',
					allowedDomains: 'langfuse.example.com',
				});
				request.mockResolvedValue({ ok: true });

				await expect(langfuseApiRequest.call(context, 'GET', '/projects')).resolves.toEqual({
					ok: true,
				});
				expect(request).toHaveBeenCalledTimes(1);
			});

			it('throws and sends no request when the host is not an allowed domain', async () => {
				credentials({ allowedHttpRequestDomains: 'domains', allowedDomains: 'other.example.com' });

				await expect(langfuseApiRequest.call(context, 'GET', '/projects')).rejects.toThrow(
					NodeOperationError,
				);
				expect(request).not.toHaveBeenCalled();
			});

			it('throws and sends no request when the credential allows no domains', async () => {
				credentials({ allowedHttpRequestDomains: 'none' });

				await expect(langfuseApiRequest.call(context, 'GET', '/projects')).rejects.toThrow(
					NodeOperationError,
				);
				expect(request).not.toHaveBeenCalled();
			});
		});

		it('sends the body only when one is given', async () => {
			request.mockResolvedValue({});

			await langfuseApiRequest.call(context, 'POST', '/scores', {}, { name: 'x' });

			expect(request).toHaveBeenCalledWith(
				'langfuseApi',
				expect.objectContaining({ method: 'POST', body: { name: 'x' } }),
			);
		});
	});

	describe('getLangfuseDataset', () => {
		it('URL-encodes dataset names that contain a slash', async () => {
			request.mockResolvedValue({ id: 'd1', name: 'folder/my dataset' });

			const dataset = await getLangfuseDataset.call(context, 'folder/my dataset');

			expect(dataset).toEqual({ id: 'd1', name: 'folder/my dataset' });
			expect(request.mock.calls[0][1].url).toBe(
				'https://langfuse.example.com/api/public/v2/datasets/folder%2Fmy%20dataset',
			);
		});
	});

	describe('getLangfuseDatasetItemsPage', () => {
		it('passes the dataset name, page, limit and version', async () => {
			request.mockResolvedValue({ data: [], meta: meta(1, 1) });

			await getLangfuseDatasetItemsPage.call(context, {
				datasetName: 'folder/ds',
				version: '2026-01-21T14:35:42.000Z',
				page: 3,
				limit: 1,
			});

			expect(request).toHaveBeenCalledWith(
				'langfuseApi',
				expect.objectContaining({
					url: 'https://langfuse.example.com/api/public/dataset-items',
					qs: {
						datasetName: 'folder/ds',
						page: 3,
						limit: 1,
						version: '2026-01-21T14:35:42.000Z',
					},
				}),
			);
		});

		it('omits version when not pinned', async () => {
			request.mockResolvedValue({ data: [], meta: meta(1, 1) });

			await getLangfuseDatasetItemsPage.call(context, { datasetName: 'ds', page: 1, limit: 50 });

			expect(request.mock.calls[0][1].qs).toEqual({ datasetName: 'ds', page: 1, limit: 50 });
		});
	});

	describe('getAllLangfuseDatasetItems', () => {
		it('pages from 1 with limit 50 until totalPages', async () => {
			request
				.mockResolvedValueOnce({ data: [item('a'), item('b')], meta: meta(1, 3) })
				.mockResolvedValueOnce({ data: [item('c')], meta: meta(2, 3) })
				.mockResolvedValueOnce({ data: [item('d')], meta: meta(3, 3) });

			const items = await getAllLangfuseDatasetItems.call(context, {
				datasetName: 'ds',
				maxItems: 1000,
			});

			expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
			expect(request).toHaveBeenCalledTimes(3);
			expect(request.mock.calls.map((call) => call[1].qs?.page)).toEqual([1, 2, 3]);
			expect(request.mock.calls.every((call) => call[1].qs?.limit === 50)).toBe(true);
		});

		it('stops on an empty page even if totalPages claims more', async () => {
			request
				.mockResolvedValueOnce({ data: [item('a')], meta: meta(1, 5) })
				.mockResolvedValueOnce({ data: [], meta: meta(2, 5) });

			const items = await getAllLangfuseDatasetItems.call(context, {
				datasetName: 'ds',
				maxItems: 1000,
			});

			expect(items.map((i) => i.id)).toEqual(['a']);
			expect(request).toHaveBeenCalledTimes(2);
		});

		it('drops archived items', async () => {
			request.mockResolvedValueOnce({
				data: [item('a'), item('b', 'ARCHIVED'), item('c')],
				meta: meta(1, 1),
			});

			const items = await getAllLangfuseDatasetItems.call(context, {
				datasetName: 'ds',
				maxItems: 1000,
			});

			expect(items.map((i) => i.id)).toEqual(['a', 'c']);
		});

		it('caps at maxItems and does not fetch further pages', async () => {
			request
				.mockResolvedValueOnce({ data: [item('a'), item('b'), item('c')], meta: meta(1, 4) })
				.mockResolvedValueOnce({ data: [item('d'), item('e')], meta: meta(2, 4) });

			const items = await getAllLangfuseDatasetItems.call(context, {
				datasetName: 'ds',
				maxItems: 4,
			});

			expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
			expect(request).toHaveBeenCalledTimes(2);
		});

		it('counts only non-archived items towards maxItems', async () => {
			request.mockResolvedValueOnce({
				data: [item('a', 'ARCHIVED'), item('b'), item('c')],
				meta: meta(1, 1),
			});

			const items = await getAllLangfuseDatasetItems.call(context, {
				datasetName: 'ds',
				maxItems: 2,
			});

			expect(items.map((i) => i.id)).toEqual(['b', 'c']);
		});

		it('sends the dataset name unencoded in the query string and forwards version', async () => {
			request.mockResolvedValueOnce({ data: [], meta: meta(1, 1) });

			await getAllLangfuseDatasetItems.call(context, {
				datasetName: 'folder/ds',
				version: '2026-01-21T14:35:42.000Z',
				maxItems: 10,
			});

			expect(request.mock.calls[0][1].qs).toMatchObject({
				datasetName: 'folder/ds',
				version: '2026-01-21T14:35:42.000Z',
			});
		});
	});

	describe('langfuseDatasetSearch', () => {
		const datasets = (...names: string[]) => names.map((name) => ({ id: `id-${name}`, name }));

		it('lists datasets by name and exposes the next page as pagination token', async () => {
			request.mockResolvedValueOnce({ data: datasets('alpha', 'beta'), meta: meta(1, 2) });

			const result = await langfuseDatasetSearch.call(context);

			expect(request.mock.calls[0][1]).toMatchObject({
				url: 'https://langfuse.example.com/api/public/v2/datasets',
				qs: { page: 1, limit: 50 },
			});
			expect(result.results.map((entry) => [entry.name, entry.value])).toEqual([
				['alpha', 'alpha'],
				['beta', 'beta'],
			]);
			expect(result.paginationToken).toBe('2');
		});

		it('resumes from the pagination token and ends on the last page', async () => {
			request.mockResolvedValueOnce({ data: datasets('gamma'), meta: meta(2, 2) });

			const result = await langfuseDatasetSearch.call(context, undefined, '2');

			expect(request.mock.calls[0][1].qs?.page).toBe(2);
			expect(result.paginationToken).toBeUndefined();
		});

		it('filters by case-insensitive name substring and keeps paging while nothing matches', async () => {
			request
				.mockResolvedValueOnce({ data: datasets('alpha', 'beta'), meta: meta(1, 2) })
				.mockResolvedValueOnce({ data: datasets('Support-QA', 'other'), meta: meta(2, 2) });

			const result = await langfuseDatasetSearch.call(context, 'support');

			expect(request).toHaveBeenCalledTimes(2);
			expect(result.results.map((entry) => entry.value)).toEqual(['Support-QA']);
			expect(result.paginationToken).toBeUndefined();
		});
	});
});

describe('parseLangfuseDatasetVersion', () => {
	const node = { name: 'Evaluation Trigger' } as INode;

	it.each([undefined, null, '', '   ', 42])('returns null for %p', (value) => {
		expect(parseLangfuseDatasetVersion(node, value)).toBeNull();
	});

	it('normalizes a UTC timestamp to ISO', () => {
		expect(parseLangfuseDatasetVersion(node, '2026-01-21T14:35:42Z')).toBe(
			'2026-01-21T14:35:42.000Z',
		);
	});

	it.each([
		['2024-02-29', '2024-02-29T00:00:00.000Z'],
		['2026-02-28T23:59:59Z', '2026-02-28T23:59:59.000Z'],
	])('accepts the valid calendar date %p', (value, expected) => {
		expect(parseLangfuseDatasetVersion(node, value)).toBe(expected);
	});

	it('converts offsets to UTC', () => {
		expect(parseLangfuseDatasetVersion(node, '2026-01-21T15:35:42+01:00')).toBe(
			'2026-01-21T14:35:42.000Z',
		);
	});

	it.each([
		'yesterday',
		'2026-13-45T00:00:00Z',
		'2026-01-21T14:35:42',
		'1',
		'2026',
		'2026-02-30',
		'2026-02-31T00:00:00Z',
		'2025-02-29T10:00:00Z',
		'2026-04-31',
	])('throws a NodeOperationError for %p', (value) => {
		expect(() => parseLangfuseDatasetVersion(node, value)).toThrow(NodeOperationError);
	});
});

describe('buildLangfuseRow', () => {
	const dataset = { id: 'ds-1', name: 'my-dataset' };
	const base = {
		dataset,
		rowNumber: 3,
		datasetVersion: null,
		fetchedAt: '2026-11-03T10:00:00.000Z',
	};

	it('builds the documented row shape', () => {
		const row = buildLangfuseRow({
			...base,
			item: {
				id: 'item-1',
				input: { question: 'q', _langfuse: 'evil', row_number: 99 },
				expectedOutput: { answer: 'a' },
				metadata: { tag: 1 },
			},
			options: {},
		});

		expect(row).toEqual({
			question: 'q',
			input: { question: 'q', _langfuse: 'evil', row_number: 99 },
			expectedOutput: { answer: 'a' },
			metadata: { tag: 1 },
			row_number: 3,
			_langfuse: {
				datasetId: 'ds-1',
				datasetName: 'my-dataset',
				itemId: 'item-1',
				datasetVersion: null,
				fetchedAt: '2026-11-03T10:00:00.000Z',
				expectedOutput: { answer: 'a' },
			},
		});
	});

	it('does not flatten a non-object input', () => {
		const row = buildLangfuseRow({
			...base,
			item: { id: 'i', input: ['a', 'b'], expectedOutput: 'x' },
			options: {},
		});

		expect(Object.keys(row)).toEqual([
			'input',
			'expectedOutput',
			'metadata',
			'row_number',
			'_langfuse',
		]);
	});
});
