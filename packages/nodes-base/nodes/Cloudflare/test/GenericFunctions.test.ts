import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { cloudflareApiRequest } from '../GenericFunctions';

describe('cloudflareApiRequest', () => {
	it('should encode path values as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const certificateId = 'abc/def?x=1';
		await cloudflareApiRequest.call(
			context,
			'GET',
			requestPath`/zones/023e105f4ecef8ad9ca31a8372d0c353/origin_tls_client_auth/${certificateId}`,
		);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'cloudflareApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value:
						'https://api.cloudflare.com/client/v4/zones/023e105f4ecef8ad9ca31a8372d0c353/origin_tls_client_auth/abc%2Fdef%3Fx=1',
				}),
			}),
		);
	});
});
