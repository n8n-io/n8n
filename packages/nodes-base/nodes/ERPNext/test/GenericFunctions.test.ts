import { erpNextApiRequestAllItems } from '../GenericFunctions';

describe('erpNextApiRequestAllItems', () => {
	/**
	 * Fakes a server that pages through TOTAL_RECORDS in chunks of whatever
	 * limit_page_length the caller asks for, and asserts on the exact
	 * limit_start values the paginator requests — the most direct evidence
	 * of the off-by-one, since it doesn't depend on any particular record
	 * layout to expose it.
	 */
	function fakeThis(totalRecords: number) {
		const requestedStarts: number[] = [];
		return {
			ctx: {
				getCredentials: async () => ({
					apiKey: 'k',
					apiSecret: 's',
					environment: 'selfHosted',
					domain: 'https://example.com',
				}),
				helpers: {
					requestWithAuthentication: async (
						_credType: string,
						options: { qs: { limit_start: number; limit_page_length: number } },
					) => {
						const { limit_start, limit_page_length } = options.qs;
						requestedStarts.push(limit_start);
						const end = Math.min(limit_start + limit_page_length, totalRecords);
						const data =
							limit_start >= totalRecords
								? []
								: Array.from({ length: end - limit_start }, (_, i) => ({ id: limit_start + i }));
						return { data };
					},
				},
			},
			requestedStarts,
		};
	}

	it('requests non-overlapping pages and returns exactly one row per record', async () => {
		const { ctx, requestedStarts } = fakeThis(2500);

		const result = await erpNextApiRequestAllItems.call(
			ctx as any,
			'data',
			'GET',
			'/api/resource/Sales Order',
			{},
		);

		expect(result).toHaveLength(2500);
		const ids = result.map((r: { id: number }) => r.id);
		expect(new Set(ids).size).toBe(2500); // no duplicate ids

		// Each page should start exactly where the previous one ended:
		// 0, 1000, 2000 — not 0, 999, 1998 (the pre-fix increment).
		expect(requestedStarts).toEqual([0, 1000, 2000]);
	});

	it('returns exactly the total when it is a multiple of the page size', async () => {
		const { ctx } = fakeThis(2000);

		const result = await erpNextApiRequestAllItems.call(
			ctx as any,
			'data',
			'GET',
			'/api/resource/Item',
			{},
		);

		expect(result).toHaveLength(2000);
	});

	it('handles fewer records than a single page with no duplicates', async () => {
		const { ctx } = fakeThis(3);

		const result = await erpNextApiRequestAllItems.call(
			ctx as any,
			'data',
			'GET',
			'/api/resource/Customer',
			{},
		);

		expect(result).toHaveLength(3);
	});
});
