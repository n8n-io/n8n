import { NodeApiError } from 'n8n-workflow';

import { figmaApiRequest } from '../GenericFunctions';

describe('Figma > GenericFunctions', () => {
	const mockFunctions: any = {
		helpers: {
			request: jest.fn(),
			requestWithAuthentication: jest.fn(),
		},
		getCredentials: jest.fn(),
		getNode: jest.fn(),
		getNodeParameter: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockFunctions.getNodeParameter.mockReturnValue('accessToken');
		mockFunctions.getCredentials.mockResolvedValue({ accessToken: 'test-token' });
	});

	describe('with access token authentication', () => {
		it('should send X-FIGMA-TOKEN header and use the figmaApi credential', async () => {
			mockFunctions.helpers.request.mockResolvedValue({ ok: true });

			const result = await figmaApiRequest.call(mockFunctions, 'GET', '/v2/teams/123/webhooks');

			expect(result).toEqual({ ok: true });
			expect(mockFunctions.getCredentials).toHaveBeenCalledWith('figmaApi');
			expect(mockFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.figma.com/v2/teams/123/webhooks',
					headers: { 'X-FIGMA-TOKEN': 'test-token' },
				}),
			);
			expect(mockFunctions.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should throw NodeApiError on failure', async () => {
			mockFunctions.helpers.request.mockRejectedValue({ message: 'fail' });

			await expect(
				figmaApiRequest.call(mockFunctions, 'GET', '/v2/teams/123/webhooks'),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('with OAuth2 authentication', () => {
		beforeEach(() => {
			mockFunctions.getNodeParameter.mockReturnValue('oAuth2');
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ ok: true });
		});

		it('should route through requestWithAuthentication using the figmaOAuth2Api credential', async () => {
			const result = await figmaApiRequest.call(mockFunctions, 'POST', '/v2/webhooks', {
				event_type: 'FILE_UPDATE',
			});

			expect(result).toEqual({ ok: true });
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'figmaOAuth2Api',
				expect.objectContaining({
					method: 'POST',
					uri: 'https://api.figma.com/v2/webhooks',
					body: { event_type: 'FILE_UPDATE' },
				}),
			);
			expect(mockFunctions.helpers.request).not.toHaveBeenCalled();
			expect(mockFunctions.getCredentials).not.toHaveBeenCalledWith('figmaApi');
		});

		it('should not attach the X-FIGMA-TOKEN header for OAuth2 requests', async () => {
			await figmaApiRequest.call(mockFunctions, 'GET', '/v2/teams/123/webhooks');

			const callArgs = mockFunctions.helpers.requestWithAuthentication.mock.calls[0][1];
			expect(callArgs.headers).toBeUndefined();
		});

		it('should throw NodeApiError on failure', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockRejectedValue({ message: 'fail' });

			await expect(
				figmaApiRequest.call(mockFunctions, 'GET', '/v2/teams/123/webhooks'),
			).rejects.toThrow(NodeApiError);
		});
	});
});
