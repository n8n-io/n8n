import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { disqusApiRequest } from '../GenericFunctions';

describe('disqusApiRequest', () => {
	it('should send query values in qs', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		const forum = 'n8n/community&limit=1';
		await disqusApiRequest.call(context, 'GET', { forum }, requestPath`forums/details.json`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://disqus.com/api/3.0/forums/details.json',
				}),
				qs: { forum, api_key: 'fake-api-key' },
				qsStringifyOptions: { arrayFormat: 'repeat' },
			}),
		);
	});
});
