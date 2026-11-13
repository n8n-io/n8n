import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { customerIoApiRequest } from '../GenericFunctions';

describe('customerIoApiRequest', () => {
	it.each([
		['cus_8812/events?x=1', 'cus_8812%2Fevents%3Fx=1'],
		['a%2Fb', 'a%252Fb'],
		['a+b@example.com', 'a%2Bb@example.com'],
	])('should encode the path value %s', async (id, expectedSegment) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ region: 'track-eu.customer.io' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		await customerIoApiRequest.call(
			context,
			'DELETE',
			requestPath`/customers/${id}`,
			{},
			'tracking',
		);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'customerIoApi',
			expect.objectContaining({
				url: expect.objectContaining({
					value: `https://track-eu.customer.io/api/v1/customers/${expectedSegment}`,
				}),
			}),
		);
	});
});
