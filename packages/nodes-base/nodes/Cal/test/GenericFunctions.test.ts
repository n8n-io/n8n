import type { IHookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { calApiRequestV2 } from '../GenericFunctions';

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
