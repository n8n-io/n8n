import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { dropcontactApiRequest } from '../GenericFunction';

describe('dropcontactApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const requestId = 'kd8Fj2Lq9Xz/account?x=1';
		await dropcontactApiRequest.call(context, 'GET', requestPath`/batch/${requestId}`, {}, {});

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'dropcontactApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.dropcontact.io/batch/kd8Fj2Lq9Xz%2Faccount%3Fx=1',
				}),
			}),
		);
	});
});
