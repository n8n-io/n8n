import type { IDataObject, IExecuteFunctions, IRequestOptions } from 'n8n-workflow';

import { contentfulApiRequestAllItems } from '../GenericFunctions';

describe('Contentful -> contentfulApiRequestAllItems', () => {
	let executeFunctions: IExecuteFunctions;
	const mockRequest = vi.fn();
	/** The function mutates its `qs` argument across calls, so capture a copy per request. */
	const sentQueryStrings: IDataObject[] = [];

	const TOTAL_RECORDS = 250;
	/** Guards against a non-advancing skip spinning forever. */
	const MAX_REQUESTS = 1000;

	const buildPage = (skip: number, limit: number) => ({
		items: Array.from(
			{ length: Math.max(0, Math.min(limit, TOTAL_RECORDS - skip)) },
			(_, index) => ({ id: `item-${skip + index}` }),
		),
		total: TOTAL_RECORDS,
	});

	beforeEach(() => {
		sentQueryStrings.length = 0;
		vi.clearAllMocks();
		mockRequest.mockImplementation(async (options: IRequestOptions) => {
			const qs = options.qs as { limit: number; skip: number };
			sentQueryStrings.push({ ...qs });
			if (sentQueryStrings.length > MAX_REQUESTS) {
				throw new Error(`Pagination did not terminate within ${MAX_REQUESTS} requests`);
			}
			return buildPage(qs.skip, qs.limit);
		});
		executeFunctions = {
			getNodeParameter: vi.fn().mockReturnValue('deliveryApi'),
			getCredentials: vi.fn().mockResolvedValue({
				ContentDeliveryaccessToken: 'test-token',
				ContentPreviewaccessToken: 'preview-token',
			}),
			helpers: { request: mockRequest },
			getNode: vi.fn().mockReturnValue({}),
		} as unknown as IExecuteFunctions;
	});

	it('should advance skip by the page size on every request', async () => {
		await contentfulApiRequestAllItems.call(executeFunctions, 'items', 'GET', '/spaces/space/entries', {}, {});

		expect(sentQueryStrings).toEqual([
			expect.objectContaining({ limit: 100, skip: 0 }),
			expect.objectContaining({ limit: 100, skip: 100 }),
			expect.objectContaining({ limit: 100, skip: 200 }),
		]);
	});

	it('should return every record exactly once', async () => {
		const result = await contentfulApiRequestAllItems.call(
			executeFunctions,
			'items',
			'GET',
			'/spaces/space/entries',
			{},
			{},
		);

		expect(result).toHaveLength(TOTAL_RECORDS);
		expect(new Set(result.map((item: IDataObject) => item.id)).size).toBe(TOTAL_RECORDS);
		expect(result[0]).toEqual({ id: 'item-0' });
		expect(result[TOTAL_RECORDS - 1]).toEqual({ id: 'item-249' });
	});

	it('should stop requesting once all records have been collected', async () => {
		await contentfulApiRequestAllItems.call(executeFunctions, 'items', 'GET', '/spaces/space/entries', {}, {});

		expect(mockRequest).toHaveBeenCalledTimes(3);
	});
});
