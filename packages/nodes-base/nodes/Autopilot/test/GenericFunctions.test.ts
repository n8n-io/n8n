import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { autopilotApiRequest } from '../GenericFunctions';

describe('autopilotApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		const contactId = 'person_1/delete?x=1';
		await autopilotApiRequest.call(context, 'GET', requestPath`/contact/${contactId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api2.autopilothq.com/v1/contact/person_1%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
