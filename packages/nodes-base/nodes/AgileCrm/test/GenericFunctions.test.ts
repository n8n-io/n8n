import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { agileCrmApiRequest } from '../GenericFunctions';

describe('agileCrmApiRequest', () => {
	it('should encode path values and join them with the subdomain URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			email: 'nathan@example.com',
			apiKey: 'fake-api-key',
			subdomain: 'acme',
		});
		context.helpers.request.mockResolvedValue({});

		const contactId = '5629499534213120/delete?x=1';
		await agileCrmApiRequest.call(context, 'GET', requestPath`api/contacts/${contactId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://acme.agilecrm.com/dev/api/contacts/5629499534213120%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
