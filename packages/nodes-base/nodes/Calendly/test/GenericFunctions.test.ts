import type { IHookFunctions } from 'n8n-workflow';

import { calendlyApiRequest } from '../GenericFunctions';

describe('Calendly GenericFunctions', () => {
	const requestWithAuthentication = jest.fn();

	const mockHookFunctions = {
		getNodeParameter: jest.fn(),
		helpers: {
			requestWithAuthentication,
		},
	} as unknown as jest.Mocked<IHookFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		requestWithAuthentication.mockResolvedValue({});
		mockHookFunctions.getNodeParameter.mockReturnValue('apiKey');
	});

	it('should use personal access token credentials for PAT authentication', async () => {
		await calendlyApiRequest.call(mockHookFunctions, 'GET', '/users/me');

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'calendlyApi',
			expect.objectContaining({
				method: 'GET',
				uri: 'https://api.calendly.com/users/me',
			}),
		);
	});

	it('should use OAuth2 credentials for OAuth2 authentication', async () => {
		mockHookFunctions.getNodeParameter.mockReturnValue('oAuth2');

		await calendlyApiRequest.call(mockHookFunctions, 'GET', '/users/me');

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'calendlyOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				uri: 'https://api.calendly.com/users/me',
			}),
		);
	});

	it('should send requests to Calendly API v2', async () => {
		await calendlyApiRequest.call(mockHookFunctions, 'POST', '/webhook_subscriptions', {
			events: ['invitee.created'],
		});

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				uri: 'https://api.calendly.com/webhook_subscriptions',
			}),
		);
	});

	it('should omit empty body and query string parameters', async () => {
		await calendlyApiRequest.call(mockHookFunctions, 'GET', '/users/me');

		const requestOptions = requestWithAuthentication.mock.calls[0][1];
		expect(requestOptions).not.toHaveProperty('body');
		expect(requestOptions).not.toHaveProperty('qs');
	});
});
