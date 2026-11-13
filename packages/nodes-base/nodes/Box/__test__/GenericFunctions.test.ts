import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { boxApiRequest } from '../GenericFunctions';

describe('boxApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestOAuth2.mockResolvedValue({});

		const fileId = '5000948880/copy?x=1';
		await boxApiRequest.call(context, 'GET', requestPath`/files/${fileId}`);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'boxOAuth2Api',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.box.com/2.0/files/5000948880%2Fcopy%3Fx=1',
				}),
			}),
			expect.anything(),
		);
	});
});
