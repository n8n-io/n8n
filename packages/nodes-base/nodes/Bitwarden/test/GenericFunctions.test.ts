import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { bitwardenApiRequest } from '../GenericFunctions';

describe('bitwardenApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ environment: 'cloudHosted' });
		context.helpers.request.mockResolvedValue({});

		await bitwardenApiRequest.call(
			context,
			'GET',
			requestPath`/public/members/${'5e6f7a8b/group-ids'}`,
			{},
			{},
			'fake-access-token',
		);

		expect(String((context.helpers.request.mock.calls[0][0] as IRequestOptions).uri)).toBe(
			'https://api.bitwarden.com/public/members/5e6f7a8b%2Fgroup-ids',
		);
	});
});
