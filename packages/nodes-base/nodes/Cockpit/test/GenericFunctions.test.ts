import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { cockpitApiRequest } from '../GenericFunctions';

describe('cockpitApiRequest', () => {
	it('should encode path values and join them with the credentials URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			url: 'https://cms.example.com',
			accessToken: 'fake-access-token',
		});
		context.helpers.request.mockResolvedValue({});

		const singleton = 'settings/private';
		await cockpitApiRequest.call(context, 'GET', requestPath`/singletons/get/${singleton}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://cms.example.com/api/singletons/get/settings%2Fprivate',
				}),
			}),
		);
	});
});
