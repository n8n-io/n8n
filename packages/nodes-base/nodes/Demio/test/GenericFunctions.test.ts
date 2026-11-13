import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { demioApiRequest } from '../GenericFunctions';

describe('demioApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'key', apiSecret: 'secret' });
		context.helpers.request.mockResolvedValue({});

		const eventId = '1288/date?x=1';
		await demioApiRequest.call(context, 'GET', requestPath`/event/${eventId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://my.demio.com/api/v1/event/1288%2Fdate%3Fx=1',
				}),
			}),
		);
	});
});
