import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { activeCampaignApiRequest } from '../GenericFunctions';

describe('ActiveCampaign GenericFunctions', () => {
	const requestWithAuthentication = jest.fn();

	const executeFunctions = {
		getCredentials: jest.fn(),
		getNode: jest.fn(),
		helpers: { requestWithAuthentication },
	} as unknown as jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		requestWithAuthentication.mockResolvedValue({});
		executeFunctions.getCredentials.mockResolvedValue({
			apiUrl: 'https://n8n-test.api-us1.com',
		});
	});

	it('should encode path values as a single segment', async () => {
		const contactId = '101/notes?x=1';

		await activeCampaignApiRequest.call(
			executeFunctions,
			'GET',
			requestPath`/api/3/contacts/${contactId}`,
			{},
		);

		const [, options] = requestWithAuthentication.mock.calls[0];
		expect(String(options.uri)).toBe(
			'https://n8n-test.api-us1.com/api/3/contacts/101%2Fnotes%3Fx=1',
		);
	});
});
