import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { clickupApiRequest } from '../GenericFunctions';

describe('ClickUp GenericFunctions', () => {
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
		const id = '86a1b2c3d/tag/urgent';

		await clickupApiRequest.call(executeFunctions, 'GET', requestPath`/task/${id}`);

		const [, options] = requestWithAuthentication.mock.calls[0];
		expect(String(options.uri)).toBe(
			'https://api.clickup.com/api/v2/task/86a1b2c3d%2Ftag%2Furgent',
		);
	});

	it.each([
		['%23urgent', '%2523urgent'],
		['high+urgent', 'high%2Burgent'],
	])('should encode the tag name %s', async (name, expectedSegment) => {
		await clickupApiRequest.call(
			executeFunctions,
			'POST',
			requestPath`/task/${'86a1b2c3d'}/tag/${name}`,
		);

		const [, options] = requestWithAuthentication.mock.calls[0];
		expect(String(options.uri)).toBe(
			`https://api.clickup.com/api/v2/task/86a1b2c3d/tag/${expectedSegment}`,
		);
	});
});
