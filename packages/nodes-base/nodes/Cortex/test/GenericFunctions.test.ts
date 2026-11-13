import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { cortexApiRequest } from '../GenericFunctions';

describe('cortexApiRequest', () => {
	it('should encode path values and join them with the credentials host', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ host: 'https://cortex.example.com/' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const jobId = 'AXt8bW1e/report?x=1';
		await cortexApiRequest.call(context, 'GET', requestPath`/job/${jobId}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'cortexApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://cortex.example.com/api/job/AXt8bW1e%2Freport%3Fx=1',
				}),
			}),
		);
	});
});
