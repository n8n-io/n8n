import { mockDeep } from 'vitest-mock-extended';
import type { IDataObject, IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { contentfulApiRequest, contentfulApiRequestAllItems } from '../GenericFunctions';

describe('contentfulApiRequest', () => {
	it('should encode path values as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('deliveryApi');
		context.getCredentials.mockResolvedValue({
			spaceId: 'cfexampleapi',
			ContentDeliveryaccessToken: 'fake-delivery-token',
			ContentPreviewaccessToken: 'fake-preview-token',
		});
		context.helpers.request.mockResolvedValue({});

		const entryId = 'nyancat/happycat';
		await contentfulApiRequest.call(
			context,
			'GET',
			requestPath`/spaces/cfexampleapi/environments/master/entries/${entryId}`,
		);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value:
						'https://cdn.contentful.com/spaces/cfexampleapi/environments/master/entries/nyancat%2Fhappycat',
				}),
			}),
		);
	});
});

describe('contentfulApiRequestAllItems', () => {
	const TOTAL_RECORDS = 250;
	/** Guards against a non-advancing skip spinning forever. */
	const MAX_REQUESTS = 1000;

	let context: ReturnType<typeof mockDeep<IExecuteFunctions>>;
	/** The function mutates its `qs` argument across calls, so capture a copy per request. */
	let sentQueryStrings: IDataObject[];

	const buildPage = (skip: number, limit: number) => ({
		items: Array.from(
			{ length: Math.max(0, Math.min(limit, TOTAL_RECORDS - skip)) },
			(_, index) => ({ id: `item-${skip + index}` }),
		),
		total: TOTAL_RECORDS,
	});

	const getAllEntries = async () =>
		await contentfulApiRequestAllItems.call(
			context,
			'items',
			'GET',
			requestPath`/spaces/space/entries`,
			{},
			{},
		);

	beforeEach(() => {
		sentQueryStrings = [];
		context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('deliveryApi');
		context.getCredentials.mockResolvedValue({
			ContentDeliveryaccessToken: 'test-token',
			ContentPreviewaccessToken: 'preview-token',
		});
		context.helpers.request.mockImplementation(async (options) => {
			const qs = (options as IRequestOptions).qs as { limit: number; skip: number };
			sentQueryStrings.push({ ...qs });
			if (sentQueryStrings.length > MAX_REQUESTS) {
				throw new Error(`Pagination did not terminate within ${MAX_REQUESTS} requests`);
			}
			return buildPage(qs.skip, qs.limit);
		});
	});

	it('should advance skip by the page size on every request', async () => {
		await getAllEntries();

		expect(sentQueryStrings).toEqual([
			expect.objectContaining({ limit: 100, skip: 0 }),
			expect.objectContaining({ limit: 100, skip: 100 }),
			expect.objectContaining({ limit: 100, skip: 200 }),
		]);
	});

	it('should return every record exactly once', async () => {
		const result = (await getAllEntries()) as IDataObject[];

		expect(result).toHaveLength(TOTAL_RECORDS);
		expect(new Set(result.map((item) => item.id)).size).toBe(TOTAL_RECORDS);
		expect(result[0]).toEqual({ id: 'item-0' });
		expect(result[TOTAL_RECORDS - 1]).toEqual({ id: 'item-249' });
	});

	it('should stop requesting once all records have been collected', async () => {
		await getAllEntries();

		expect(context.helpers.request).toHaveBeenCalledTimes(3);
	});
});
