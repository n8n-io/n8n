import type { IExecuteFunctions } from 'n8n-workflow';

import { copperApiRequestAllItems } from '../GenericFunctions';

describe('copperApiRequestAllItems', () => {
	const mockRequestWithAuthentication = vi.fn();

	const mockContext = {
		helpers: {
			requestWithAuthentication: mockRequestWithAuthentication,
		},
		getNode: vi.fn().mockReturnValue({ name: 'Copper' }),
	} as unknown as IExecuteFunctions;

	beforeEach(() => {
		mockRequestWithAuthentication.mockClear();
	});

	it('should return all items from a single page when total is less than page size', async () => {
		// Single page with 3 items (less than page_size of 200)
		const page1Items = [{ id: 1 }, { id: 2 }, { id: 3 }];
		mockRequestWithAuthentication.mockResolvedValueOnce({
			headers: { 'x-pw-total': 3 },
			body: page1Items,
		});

		const result = await copperApiRequestAllItems.call(
			mockContext,
			'POST',
			'/companies/search',
			{},
			{},
			'',
			{ resolveWithFullResponse: true },
		);

		expect(result).toEqual(page1Items);
		// Should call the API exactly once with page_number: 1
		expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'copperApi',
			expect.objectContaining({
				body: expect.objectContaining({ page_size: 200, page_number: 1 }),
			}),
		);
	});

	it('should fetch multiple pages by incrementing page_number', async () => {
		// Simulate exactly 200 items on page 1 (full page) and 50 on page 2 (partial = last page)
		const page1Items = Array.from({ length: 200 }, (_, i) => ({ id: i + 1 }));
		const page2Items = Array.from({ length: 50 }, (_, i) => ({ id: i + 201 }));

		mockRequestWithAuthentication
			.mockResolvedValueOnce({ headers: { 'x-pw-total': 250 }, body: page1Items })
			.mockResolvedValueOnce({ headers: { 'x-pw-total': 250 }, body: page2Items });

		const result = await copperApiRequestAllItems.call(
			mockContext,
			'POST',
			'/companies/search',
			{},
			{},
			'',
			{ resolveWithFullResponse: true },
		);

		expect(result).toHaveLength(250);
		expect(result).toEqual([...page1Items, ...page2Items]);

		// Should make exactly 2 API calls
		expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(2);

		// First call must send page_number: 1
		expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'copperApi',
			expect.objectContaining({
				body: expect.objectContaining({ page_size: 200, page_number: 1 }),
			}),
		);

		// Second call must send page_number: 2
		expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'copperApi',
			expect.objectContaining({
				body: expect.objectContaining({ page_size: 200, page_number: 2 }),
			}),
		);
	});

	it('should fetch three pages when needed', async () => {
		// 200 + 200 + 1 = 401 total items over 3 pages
		const page1Items = Array.from({ length: 200 }, (_, i) => ({ id: i + 1 }));
		const page2Items = Array.from({ length: 200 }, (_, i) => ({ id: i + 201 }));
		const page3Items = [{ id: 401 }];

		mockRequestWithAuthentication
			.mockResolvedValueOnce({ headers: {}, body: page1Items })
			.mockResolvedValueOnce({ headers: {}, body: page2Items })
			.mockResolvedValueOnce({ headers: {}, body: page3Items });

		const result = await copperApiRequestAllItems.call(
			mockContext,
			'POST',
			'/companies/search',
			{ name: 'test' }, // extra body filter
			{},
			'',
			{ resolveWithFullResponse: true },
		);

		expect(result).toHaveLength(401);
		expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(3);

		// page_number should progress 1 → 2 → 3
		expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'copperApi',
			expect.objectContaining({
				body: expect.objectContaining({ name: 'test', page_size: 200, page_number: 1 }),
			}),
		);
		expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'copperApi',
			expect.objectContaining({
				body: expect.objectContaining({ name: 'test', page_size: 200, page_number: 2 }),
			}),
		);
		expect(mockRequestWithAuthentication).toHaveBeenNthCalledWith(
			3,
			'copperApi',
			expect.objectContaining({
				body: expect.objectContaining({ name: 'test', page_size: 200, page_number: 3 }),
			}),
		);
	});

	it('should return an empty array when the first page has no items', async () => {
		mockRequestWithAuthentication.mockResolvedValueOnce({
			headers: { 'x-pw-total': 0 },
			body: [],
		});

		const result = await copperApiRequestAllItems.call(
			mockContext,
			'POST',
			'/companies/search',
			{},
			{},
			'',
			{ resolveWithFullResponse: true },
		);

		expect(result).toEqual([]);
		expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should not mutate the caller-provided body object', async () => {
		const originalBody = { name: 'Acme' };
		const bodyCopy = { ...originalBody };

		mockRequestWithAuthentication.mockResolvedValueOnce({ headers: {}, body: [{ id: 1 }] });

		await copperApiRequestAllItems.call(
			mockContext,
			'POST',
			'/companies/search',
			originalBody,
			{},
			'',
			{ resolveWithFullResponse: true },
		);

		// The original body object must not have been mutated with page_size / page_number
		expect(originalBody).toEqual(bodyCopy);
	});
});
