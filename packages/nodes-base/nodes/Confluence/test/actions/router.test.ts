import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { router } from '../../actions/router';
import { confluenceApiRequest, confluenceApiRequestUpload } from '../../transport';
import { mockExecuteCtx } from '../shared';

vi.mock('../../transport', async (importOriginal) => ({
	...(await importOriginal<object>()),
	confluenceApiRequest: vi.fn(),
	confluenceApiRequestUpload: vi.fn(),
}));

const apiRequest = confluenceApiRequest as unknown as Mock;
const apiRequestUpload = confluenceApiRequestUpload as unknown as Mock;

const createParams: Record<string, unknown> = {
	resource: 'page',
	operation: 'create',
	space: { mode: 'list', value: '111' },
	title: 'My Page',
	bodyFormat: 'plainText',
	bodyPlainText: 'Hello',
	parentPage: '',
	options: {},
};

const getParams: Record<string, unknown> = {
	resource: 'page',
	operation: 'get',
	page: { mode: 'list', value: '1' },
	bodyFormat: 'storage',
	includeDescendants: false,
};

const searchParams: Record<string, unknown> = {
	resource: 'search',
	operation: 'query',
	cql: 'type = page',
	returnAll: false,
	limit: 100,
	options: {},
};

describe('Confluence router', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiRequest.mockResolvedValue({ id: '222', title: 'My Page' });
	});

	it('dispatches page:create per item and pairs outputs to their inputs', async () => {
		const result = await router.call(mockExecuteCtx(createParams, 2));

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			[
				{ json: { id: '222', title: 'My Page' }, pairedItem: { item: 0 } },
				{ json: { id: '222', title: 'My Page' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it('dispatches attachment:delete and returns the deletion report', async () => {
		apiRequest.mockResolvedValue('');

		const result = await router.call(
			mockExecuteCtx({
				resource: 'attachment',
				operation: 'delete',
				attachmentId: 'att123',
			}),
		);

		expect(apiRequest).toHaveBeenCalledWith('DELETE', '/wiki/api/v2/attachments/att123');
		expect(result).toEqual([
			[{ json: { deleted: true, attachmentId: 'att123', purged: false }, pairedItem: { item: 0 } }],
		]);
	});

	it('dispatches attachment:getMany and pairs the emitted items', async () => {
		apiRequest.mockResolvedValue({ results: [{ id: 'a1', title: 'notes.txt' }] });

		const result = await router.call(
			mockExecuteCtx({
				resource: 'attachment',
				operation: 'getMany',
				page: { mode: 'id', value: '9' },
				returnAll: true,
				download: false,
			}),
		);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/pages/9/attachments',
			{},
			{ limit: 250 },
		);
		expect(result).toEqual([[{ json: { id: 'a1', title: 'notes.txt' }, pairedItem: { item: 0 } }]]);
	});

	it('dispatches attachment:upload and returns the created attachment', async () => {
		apiRequestUpload.mockResolvedValue({ results: [{ id: 'att1', title: 'notes.txt' }] });
		const ctx = mockExecuteCtx({
			resource: 'attachment',
			operation: 'upload',
			page: { mode: 'id', value: '9' },
			binaryPropertyName: 'data',
			minorEdit: false,
			comment: '',
		});
		ctx.helpers.assertBinaryData.mockReturnValue({
			data: '',
			mimeType: 'text/plain',
			fileName: 'notes.txt',
		});
		ctx.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('file-bytes'));

		const result = await router.call(ctx);

		expect(apiRequestUpload).toHaveBeenCalledWith(
			'/wiki/rest/api/content/9/child/attachment',
			expect.anything(),
		);
		expect(result).toEqual([
			[{ json: { id: 'att1', title: 'notes.txt' }, pairedItem: { item: 0 } }],
		]);
	});

	it('dispatches page:delete and returns the deletion report', async () => {
		const result = await router.call(
			mockExecuteCtx({
				resource: 'page',
				operation: 'delete',
				page: { mode: 'id', value: '1' },
				purge: false,
			}),
		);

		expect(apiRequest).toHaveBeenCalledWith('DELETE', '/wiki/api/v2/pages/1');
		expect(result).toEqual([
			[{ json: { deleted: true, pageId: '1', purged: false }, pairedItem: { item: 0 } }],
		]);
	});

	it('dispatches page:get and returns the fetched page', async () => {
		const result = await router.call(mockExecuteCtx(getParams));

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/pages/1',
			{},
			{ 'body-format': 'storage' },
		);
		expect(result).toEqual([[{ json: { id: '222', title: 'My Page' }, pairedItem: { item: 0 } }]]);
	});

	it('dispatches page:getManyByLabel and fans pages out into one item each', async () => {
		apiRequest.mockResolvedValue({ results: [{ id: '1' }, { id: '2' }] });

		const result = await router.call(
			mockExecuteCtx({
				resource: 'page',
				operation: 'getManyByLabel',
				label: { mode: 'id', value: '777' },
				returnAll: false,
				limit: 50,
				bodyFormat: 'storage',
			}),
		);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/api/v2/labels/777/pages',
			{},
			{ 'body-format': 'storage', limit: 50 },
		);
		expect(result).toEqual([
			[
				{ json: { id: '1' }, pairedItem: { item: 0 } },
				{ json: { id: '2' }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('fans an array response out into one item per page', async () => {
		apiRequest.mockImplementation(async (_method: string, url: string) =>
			url.endsWith('/descendants')
				? { results: [{ id: '2', type: 'page', depth: 1 }] }
				: { results: [{ id: '1' }, { id: '2' }] },
		);

		const result = await router.call(
			mockExecuteCtx({ ...getParams, includeDescendants: true, maxPages: 100 }),
		);

		expect(result).toEqual([
			[
				{ json: { id: '1' }, pairedItem: { item: 0 } },
				{ json: { id: '2' }, pairedItem: { item: 0 } },
			],
		]);
	});

	describe('page:getLabels', () => {
		const getLabelsParams: Record<string, unknown> = {
			resource: 'page',
			operation: 'getLabels',
			page: { mode: 'id', value: '1' },
			returnAll: false,
			limit: 50,
			options: {},
		};
		const label1 = { id: '10', name: 'release', prefix: 'global' };
		const label2 = { id: '11', name: 'draft', prefix: 'my' };

		it('dispatches page:getLabels and fans the labels out into one item per label', async () => {
			apiRequest.mockResolvedValue({ results: [label1, label2] });

			const result = await router.call(mockExecuteCtx(getLabelsParams));

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/wiki/api/v2/pages/1/labels',
				{},
				{ limit: 50 },
			);
			expect(result).toEqual([
				[
					{ json: label1, pairedItem: { item: 0 } },
					{ json: label2, pairedItem: { item: 0 } },
				],
			]);
		});

		it('emits no item for a page with no labels', async () => {
			apiRequest
				.mockResolvedValueOnce({ results: [] })
				.mockResolvedValueOnce({ results: [label1, label2] });

			const result = await router.call(mockExecuteCtx(getLabelsParams, 2));

			expect(result).toEqual([
				[
					{ json: label1, pairedItem: { item: 1 } },
					{ json: label2, pairedItem: { item: 1 } },
				],
			]);
		});

		it('discards partial labels for a failed item when continue-on-fail is on', async () => {
			const ctx = mockExecuteCtx({ ...getLabelsParams, limit: 300 });
			ctx.continueOnFail.mockReturnValue(true);
			apiRequest
				.mockResolvedValueOnce({
					results: [label1, label2],
					_links: { next: '/wiki/api/v2/pages/1/labels?cursor=next' },
				})
				.mockRejectedValueOnce(new Error('boom'));

			const result = await router.call(ctx);

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expect(result).toEqual([[{ json: { error: 'boom' }, pairedItem: { item: 0 } }]]);
		});
	});

	it('dispatches space:get and returns the fetched space', async () => {
		apiRequest.mockResolvedValue({ id: '98432', key: 'NQK', name: 'Docs' });

		const result = await router.call(
			mockExecuteCtx({
				resource: 'space',
				operation: 'get',
				space: { mode: 'id', value: '98432' },
			}),
		);

		expect(apiRequest).toHaveBeenCalledWith('GET', '/wiki/api/v2/spaces/98432', {}, {});
		expect(result).toEqual([
			[{ json: { id: '98432', key: 'NQK', name: 'Docs' }, pairedItem: { item: 0 } }],
		]);
	});

	it('dispatches space:getMany and fans the spaces out into one item each', async () => {
		apiRequest.mockResolvedValue({ results: [{ id: '1' }, { id: '2' }] });

		const result = await router.call(
			mockExecuteCtx({ resource: 'space', operation: 'getMany', returnAll: false, limit: 50 }),
		);

		expect(apiRequest).toHaveBeenCalledWith('GET', '/wiki/api/v2/spaces', {}, { limit: 50 });
		expect(result).toEqual([
			[
				{ json: { id: '1' }, pairedItem: { item: 0 } },
				{ json: { id: '2' }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('emits an error item for a failing space operation when continue-on-fail is on', async () => {
		const ctx = mockExecuteCtx(
			{ resource: 'space', operation: 'get', space: { mode: 'id', value: '1' } },
			2,
		);
		ctx.continueOnFail.mockReturnValue(true);
		apiRequest.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ id: '1' });

		expect(await router.call(ctx)).toEqual([
			[
				{ json: { error: 'boom' }, pairedItem: { item: 0 } },
				{ json: { id: '1' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it.each(['update', 'append'])('dispatches page:%s', async (operation) => {
		apiRequest
			.mockResolvedValueOnce({
				id: '222',
				status: 'current',
				title: 'My Page',
				version: { number: 1 },
				body: { storage: { value: '<p>Old</p>' } },
			})
			.mockResolvedValueOnce({ id: '222' });

		const result = await router.call(
			mockExecuteCtx({ ...createParams, operation, page: { mode: 'id', value: '222' }, title: '' }),
		);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest.mock.calls[1][0]).toBe('PUT');
		expect(result).toEqual([[{ json: { id: '222' }, pairedItem: { item: 0 } }]]);
	});

	it('dispatches search:query and fans the results out into items', async () => {
		apiRequest.mockResolvedValue({ results: [{ title: 'A' }, { title: 'B' }] });

		const result = await router.call(mockExecuteCtx(searchParams));

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/wiki/rest/api/search',
			{},
			{ cql: 'type = page', limit: 50 },
		);
		expect(result).toEqual([
			[
				{ json: { title: 'A' }, pairedItem: { item: 0 } },
				{ json: { title: 'B' }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('emits an error item and continues with later items when continue-on-fail is on', async () => {
		const ctx = mockExecuteCtx(createParams, 2);
		ctx.continueOnFail.mockReturnValue(true);
		apiRequest.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ id: '333' });

		expect(await router.call(ctx)).toEqual([
			[
				{ json: { error: 'boom' }, pairedItem: { item: 0 } },
				{ json: { id: '333' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it('rethrows when continue-on-fail is off', async () => {
		const ctx = mockExecuteCtx(createParams);
		ctx.continueOnFail.mockReturnValue(false);
		apiRequest.mockRejectedValue(new Error('boom'));

		await expect(router.call(ctx)).rejects.toThrow('boom');
	});

	it.each([
		['constructor', 'create'],
		['__proto__', 'create'],
		['page', 'constructor'],
		['page', 'hasOwnProperty'],
	])('rejects inherited-property lookups (%s:%s) as unsupported', async (resource, operation) => {
		const ctx = mockExecuteCtx({ ...createParams, resource, operation });

		await expect(router.call(ctx)).rejects.toThrow(NodeOperationError);
		await expect(router.call(ctx)).rejects.toThrow(
			`The operation "${resource}:${operation}" is not supported`,
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
