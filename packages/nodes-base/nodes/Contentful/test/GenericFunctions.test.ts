import type { IDataObject, IExecuteFunctions, IRequestOptions } from 'n8n-workflow';

import { contentfulApiRequestAllItems } from '../GenericFunctions';

describe('Contentful -> contentfulApiRequestAllItems', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	const mockRequest = vi.fn();
	/** `contentfulApiRequest` reuses the same `qs` object across calls, so snapshot it. */
	let sentQueryStrings: IDataObject[] = [];

	const TOTAL_RECORDS = 250;
	/** Guards against a non-advancing / exploding skip spinning forever. */
	const MAX_REQUESTS = 1000;

	const setupMockFunctions = () => {
		sentQueryStrings = [];
		mockExecuteFunctions = {
			getNodeParameter: vi.fn().mockReturnValue('deliveryApi'),
			getCredentials: vi.fn().mockResolvedValue({
				ContentDeliveryaccessToken: 'test-token',
				ContentPreviewaccessToken: 'preview-token',
			}),
			helpers: {
				request: mockRequest,
			},
			getNode: vi.fn().mockReturnValue({}),
		} as unknown as IExecuteFunctions;
		vi.clearAllMocks();
		mockRequest.mockImplementation(async (options: IRequestOptions) => {
			const qs = { ...options.qs } as { limit: number; skip: number };
			sentQueryStrings.push(qs);
			if (sentQueryStrings.length > MAX_REQUESTS) {
				throw new Error(`Pagination did not terminate within ${MAX_REQUESTS} requests`);
			}
			return await Promise.resolve(buildPage(qs.skip, qs.limit));
		});
	};

	/**
	 * Serves records from `skip` onwards, mirroring Contentful's
	 * `limit`/`skip`/`total` scheme where `skip` is a record index.
	 */
	const buildPage = (skip: number, limit: number) => ({
		items: Array.from(
			{ length: Math.max(0, Math.min(limit, TOTAL_RECORDS - skip)) },
			(_, index) => ({ id: `item-${skip + index}` }),
		),
		total: TOTAL_RECORDS,
	});

	beforeEach(() => {
		setupMockFunctions();
	});

	it('should advance skip by the page size (not multiply)', async () => {
		await contentfulApiRequestAllItems.call(
			mockExecuteFunctions,
			'items',
			'GET',
			'/spaces/space/entries',
			{},
			{},
		);

		expect(sentQueryStrings).toEqual([
			expect.objectContaining({ limit: 100, skip: 0 }),
			expect.objectContaining({ limit: 100, skip: 100 }),
			expect.objectContaining({ limit: 100, skip: 200 }),
		]);
	});

	it('should return every record exactly once', async () => {
		const result = await contentfulApiRequestAllItems.call(
			mockExecuteFunctions,
			'items',
			'GET',
			'/spaces/space/entries',
			{},
			{},
		);

		expect(result).toHaveLength(250);
		expect(new Set(result.map((item: IDataObject) => item.id)).size).toBe(250);
		expect(result[0]).toEqual({ id: 'item-0' });
		expect(result[249]).toEqual({ id: 'item-249' });
	});

	it('should stop requesting once all records have been collected', async () => {
		await contentfulApiRequestAllItems.call(
			mockExecuteFunctions,
			'items',
			'GET',
			'/spaces/space/entries',
			{},
			{},
		);

		expect(mockRequest).toHaveBeenCalledTimes(3);
	});
});
