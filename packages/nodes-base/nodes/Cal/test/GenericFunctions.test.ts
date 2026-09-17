import type { IExecuteFunctions, IHookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	CAL_API_VERSION,
	calApiRequestV2,
	calApiRequestV2AllItems,
	calApiRequestV2Versioned,
} from '../GenericFunctions';

describe('calApiRequestV2', () => {
	const httpRequestWithAuthentication = vi.fn();
	const hookFunctions = {
		getCredentials: vi.fn().mockResolvedValue({ host: 'https://api.cal.com' }),
		getNode: vi.fn().mockReturnValue({}),
		helpers: {
			httpRequestWithAuthentication,
		},
	} as unknown as IHookFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sends requests to the v2 API using authenticated requests', async () => {
		const response = { status: 'success', data: [] };
		httpRequestWithAuthentication.mockResolvedValue(response);

		const result = await calApiRequestV2.call(hookFunctions, 'GET', '/webhooks');

		expect(result).toEqual(response);
		expect(httpRequestWithAuthentication).toHaveBeenCalledWith('calApi', {
			baseURL: 'https://api.cal.com',
			method: 'GET',
			body: {},
			url: '/v2/webhooks',
		});
	});

	it('forwards body, query parameters, and request options', async () => {
		httpRequestWithAuthentication.mockResolvedValue({ status: 'success' });
		const body = { triggers: ['BOOKING_CREATED'] };
		const query = { take: 250, skip: 0 };
		const requestOptions = { headers: { 'cal-api-version': '2024-06-14' } };

		await calApiRequestV2.call(hookFunctions, 'POST', '/event-types', body, query, requestOptions);

		expect(httpRequestWithAuthentication).toHaveBeenCalledWith('calApi', {
			baseURL: 'https://api.cal.com',
			method: 'POST',
			body,
			qs: query,
			url: '/v2/event-types',
			headers: { 'cal-api-version': '2024-06-14' },
		});
	});

	it('wraps request errors in NodeApiError', async () => {
		httpRequestWithAuthentication.mockRejectedValue(new Error('Request failed'));

		await expect(calApiRequestV2.call(hookFunctions, 'GET', '/webhooks')).rejects.toThrow(
			NodeApiError,
		);
	});
});

describe('calApiRequestV2Versioned', () => {
	const httpRequestWithAuthentication = vi.fn();
	const executeFunctions = {
		getCredentials: vi.fn().mockResolvedValue({ host: 'https://api.cal.com' }),
		getNode: vi.fn().mockReturnValue({}),
		helpers: {
			httpRequestWithAuthentication,
		},
	} as unknown as IExecuteFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('adds the cal-api-version header of the endpoint group', async () => {
		httpRequestWithAuthentication.mockResolvedValue({ data: {} });

		await calApiRequestV2Versioned.call(
			executeFunctions,
			'POST',
			'/bookings',
			CAL_API_VERSION.BOOKINGS_WRITE,
			{ start: '2033-09-05T10:00:00Z' },
		);

		expect(httpRequestWithAuthentication).toHaveBeenCalledWith('calApi', {
			baseURL: 'https://api.cal.com',
			method: 'POST',
			body: { start: '2033-09-05T10:00:00Z' },
			url: '/v2/bookings',
			headers: { 'cal-api-version': '2026-02-25' },
		});
	});

	it('keeps the header next to a query', async () => {
		httpRequestWithAuthentication.mockResolvedValue({ data: {} });

		await calApiRequestV2Versioned.call(
			executeFunctions,
			'GET',
			'/slots',
			CAL_API_VERSION.SLOTS,
			{},
			{ eventTypeId: 1 },
		);

		expect(httpRequestWithAuthentication).toHaveBeenCalledWith('calApi', {
			baseURL: 'https://api.cal.com',
			method: 'GET',
			body: {},
			qs: { eventTypeId: 1 },
			url: '/v2/slots',
			headers: { 'cal-api-version': '2024-09-04' },
		});
	});
});

describe('calApiRequestV2AllItems', () => {
	const httpRequestWithAuthentication = vi.fn();
	const executeFunctions = {
		getCredentials: vi.fn().mockResolvedValue({ host: 'https://api.cal.com' }),
		getNode: vi.fn().mockReturnValue({}),
		helpers: {
			httpRequestWithAuthentication,
		},
	} as unknown as IExecuteFunctions;

	function bookings(from: number, count: number) {
		return Array.from({ length: count }, (_, i) => ({ uid: `bkg_${from + i}` }));
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('follows the cursor until the API reports no more records', async () => {
		httpRequestWithAuthentication
			.mockResolvedValueOnce({
				data: bookings(1, 2),
				pagination: { nextCursor: 'c1', hasMore: true },
			})
			.mockResolvedValueOnce({
				data: bookings(3, 1),
				pagination: { nextCursor: null, hasMore: false },
			});

		const result = await calApiRequestV2AllItems.call(
			executeFunctions,
			'/bookings',
			CAL_API_VERSION.BOOKINGS_LIST,
			{ status: 'upcoming' },
			Infinity,
		);

		expect(result).toHaveLength(3);
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(httpRequestWithAuthentication.mock.calls[1][1]).toMatchObject({
			qs: { status: 'upcoming', limit: 100, cursor: 'c1' },
		});
	});

	it('asks for at most the number of records that are still missing', async () => {
		httpRequestWithAuthentication.mockResolvedValue({
			data: bookings(1, 2),
			pagination: { hasMore: false },
		});

		await calApiRequestV2AllItems.call(
			executeFunctions,
			'/bookings',
			CAL_API_VERSION.BOOKINGS_LIST,
			{},
			2,
		);

		expect(httpRequestWithAuthentication.mock.calls[0][1]).toMatchObject({ qs: { limit: 2 } });
	});

	it('cuts a page that overshoots the limit', async () => {
		httpRequestWithAuthentication.mockResolvedValue({
			data: bookings(1, 5),
			pagination: { hasMore: false },
		});

		const result = await calApiRequestV2AllItems.call(
			executeFunctions,
			'/bookings',
			CAL_API_VERSION.BOOKINGS_LIST,
			{},
			3,
		);

		expect(result).toHaveLength(3);
	});

	it('stops when the API repeats a cursor', async () => {
		httpRequestWithAuthentication.mockResolvedValue({
			data: bookings(1, 1),
			pagination: { nextCursor: 'same', hasMore: true },
		});

		const result = await calApiRequestV2AllItems.call(
			executeFunctions,
			'/bookings',
			CAL_API_VERSION.BOOKINGS_LIST,
			{},
			Infinity,
		);

		expect(result).toHaveLength(2);
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});
});
