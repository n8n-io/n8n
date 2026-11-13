import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { actionNetworkApiRequest } from '../GenericFunctions';

describe('ActionNetwork GenericFunctions', () => {
	const requestWithAuthentication = jest.fn();
	const context = { helpers: { requestWithAuthentication } } as unknown as IExecuteFunctions;

	it('should encode path values as a single segment', async () => {
		requestWithAuthentication.mockResolvedValue({});
		const personId = 'c3d4e5f6/tags?x=1';

		await actionNetworkApiRequest.call(context, 'GET', requestPath`/people/${personId}`);

		const [, options] = requestWithAuthentication.mock.calls[0];
		expect(String(options.uri)).toBe(
			'https://actionnetwork.org/api/v2/people/c3d4e5f6%2Ftags%3Fx=1',
		);
	});
});
