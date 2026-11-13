import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { clockifyApiRequest } from '../GenericFunctions';

describe('Clockify GenericFunctions', () => {
	const requestWithAuthentication = jest.fn();

	const executeFunctions = {
		getCredentials: jest.fn(),
		getNodeParameter: jest.fn(),
		getNode: jest.fn(),
		helpers: { requestWithAuthentication },
	} as unknown as jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		requestWithAuthentication.mockResolvedValue({});
		executeFunctions.getCredentials.mockResolvedValue({ apiKey: 'test-api-key' });
		executeFunctions.getNodeParameter.mockReturnValue('accessToken');
	});

	it('should encode path values as a single segment', async () => {
		const id = '64a1b2c3/users';

		await clockifyApiRequest.call(executeFunctions, 'GET', requestPath`workspaces/${id}/clients`);

		const [, options] = requestWithAuthentication.mock.calls[0];
		expect(String(options.uri)).toBe(
			'https://api.clockify.me/api/v1/workspaces/64a1b2c3%2Fusers/clients',
		);
	});
});
