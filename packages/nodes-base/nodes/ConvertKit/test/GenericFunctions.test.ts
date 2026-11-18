import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { convertKitApiRequest } from '../GenericFunctions';

describe('convertKitApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({});

		const id = '7/delete?x=1';
		await convertKitApiRequest.call(context, 'DELETE', requestPath`/custom_fields/${id}`);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'convertKitApi',
			expect.objectContaining({
				url: expect.objectContaining({
					value: 'https://api.convertkit.com/v3/custom_fields/7%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
