import type { IHookFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { acuitySchedulingApiRequest } from '../GenericFunctions';

describe('AcuityScheduling GenericFunctions', () => {
	const request = jest.fn();
	const context = {
		getNodeParameter: jest.fn().mockReturnValue('apiKey'),
		getCredentials: jest.fn().mockResolvedValue({ userId: '12345', apiKey: 'test-api-key' }),
		getNode: jest.fn(),
		helpers: { request },
	} as unknown as IHookFunctions;

	it('should encode path values as a single segment', async () => {
		request.mockResolvedValue({});
		const webhookId = '731/appointments?x=1';

		await acuitySchedulingApiRequest.call(context, 'DELETE', requestPath`/webhooks/${webhookId}`);

		expect(String(request.mock.calls[0][0].uri)).toBe(
			'https://acuityscheduling.com/api/v1/webhooks/731%2Fappointments%3Fx=1',
		);
	});
});
