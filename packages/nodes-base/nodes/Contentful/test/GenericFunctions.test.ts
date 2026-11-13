import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { contentfulApiRequest } from '../GenericFunctions';

describe('contentfulApiRequest', () => {
	it('should encode path values as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('deliveryApi');
		context.getCredentials.mockResolvedValue({
			spaceId: 'cfexampleapi',
			ContentDeliveryaccessToken: 'fake-delivery-token',
			ContentPreviewaccessToken: 'fake-preview-token',
		});
		context.helpers.request.mockResolvedValue({});

		const entryId = 'nyancat/happycat';
		await contentfulApiRequest.call(
			context,
			'GET',
			requestPath`/spaces/cfexampleapi/environments/master/entries/${entryId}`,
		);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value:
						'https://cdn.contentful.com/spaces/cfexampleapi/environments/master/entries/nyancat%2Fhappycat',
				}),
			}),
		);
	});
});
