import type { IHookFunctions } from 'n8n-workflow';

import { customerIoApiRequest } from '../GenericFunctions';

describe('CustomerIo -> GenericFunctions', () => {
	const mockRequestWithAuthentication = jest.fn();

	describe('customerIoApiRequest', () => {
		let mockHookFunctions: IHookFunctions;

		const setupMockFunctions = (region: string) => {
			mockHookFunctions = {
				getCredentials: jest.fn().mockResolvedValue({ region }),
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
			} as unknown as IHookFunctions;
			jest.clearAllMocks();
		};

		describe('beta API endpoint', () => {
			it('should use global beta API for global region', async () => {
				setupMockFunctions('track.customer.io');

				const response = { id: 'webhook-123' };
				mockRequestWithAuthentication.mockResolvedValue(response);

				const result = await customerIoApiRequest.call(
					mockHookFunctions,
					'POST',
					'/reporting_webhooks',
					{ endpoint: 'https://test.com/webhook', events: {} },
					'beta',
				);

				expect(result).toEqual(response);
				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'customerIoApi',
					expect.objectContaining({
						method: 'POST',
						url: 'https://beta-api.customer.io/v1/api/reporting_webhooks',
						json: true,
					}),
				);
			});

			it('should use EU beta API for EU region', async () => {
				setupMockFunctions('track-eu.customer.io');

				const response = { id: 'webhook-456' };
				mockRequestWithAuthentication.mockResolvedValue(response);

				const result = await customerIoApiRequest.call(
					mockHookFunctions,
					'POST',
					'/reporting_webhooks',
					{ endpoint: 'https://test.com/webhook', events: {} },
					'beta',
				);

				expect(result).toEqual(response);
				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'customerIoApi',
					expect.objectContaining({
						method: 'POST',
						url: 'https://beta-api-eu.customer.io/v1/api/reporting_webhooks',
						json: true,
					}),
				);
			});
		});

		describe('api endpoint', () => {
			it('should use global api for global region', async () => {
				setupMockFunctions('track.customer.io');

				const response = { success: true };
				mockRequestWithAuthentication.mockResolvedValue(response);

				const result = await customerIoApiRequest.call(
					mockHookFunctions,
					'GET',
					'/campaigns',
					{},
					'api',
				);

				expect(result).toEqual(response);
				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'customerIoApi',
					expect.objectContaining({
						method: 'GET',
						url: 'https://api.customer.io/v1/api/campaigns',
						json: true,
					}),
				);
			});

			it('should use EU api for EU region', async () => {
				setupMockFunctions('track-eu.customer.io');

				const response = { success: true };
				mockRequestWithAuthentication.mockResolvedValue(response);

				const result = await customerIoApiRequest.call(
					mockHookFunctions,
					'GET',
					'/campaigns',
					{},
					'api',
				);

				expect(result).toEqual(response);
				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'customerIoApi',
					expect.objectContaining({
						method: 'GET',
						url: 'https://api-eu.customer.io/v1/api/campaigns',
						json: true,
					}),
				);
			});
		});

		describe('tracking endpoint', () => {
			it('should use the region from credentials for tracking API', async () => {
				setupMockFunctions('track.customer.io');

				const response = { success: true };
				mockRequestWithAuthentication.mockResolvedValue(response);

				const result = await customerIoApiRequest.call(
					mockHookFunctions,
					'POST',
					'/customers/123',
					{ email: 'test@example.com' },
					'tracking',
				);

				expect(result).toEqual(response);
				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					'customerIoApi',
					expect.objectContaining({
						method: 'POST',
						url: 'https://track.customer.io/api/v1/customers/123',
						json: true,
					}),
				);
			});
		});
	});
});
