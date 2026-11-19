import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { clockifyApiRequest } from '../GenericFunctions';

describe('Clockify GenericFunctions', () => {
	const requestWithAuthentication = vi.fn();

	const executeFunctions = {
		getCredentials: vi.fn(),
		getNodeParameter: vi.fn(),
		getNode: vi.fn(),
		helpers: { requestWithAuthentication },
	} as unknown as Mocked<IExecuteFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();
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
