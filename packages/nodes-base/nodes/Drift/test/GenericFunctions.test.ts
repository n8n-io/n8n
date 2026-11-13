import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { driftApiRequest } from '../GenericFunctions';

describe('driftApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.helpers.request.mockResolvedValue({});

		const contactId = '123/attributes?x=1';
		await driftApiRequest.call(context, 'GET', requestPath`/contacts/${contactId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://driftapi.com/contacts/123%2Fattributes%3Fx=1',
				}),
			}),
		);
	});
});
