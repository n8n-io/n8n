import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { bannerbearApiRequest } from '../GenericFunctions';

describe('bannerbearApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		await bannerbearApiRequest.call(context, 'GET', requestPath`/images/${'kG39R5/templates'}`);

		expect(String((context.helpers.request.mock.calls[0][0] as IRequestOptions).uri)).toBe(
			'https://api.bannerbear.com/v2/images/kG39R5%2Ftemplates',
		);
	});
});
