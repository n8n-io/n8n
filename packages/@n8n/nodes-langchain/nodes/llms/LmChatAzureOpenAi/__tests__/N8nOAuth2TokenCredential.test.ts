import { getBearerTokenProvider } from '@azure/identity';
import { type ClientOAuth2Options } from '@n8n/client-oauth2';
import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { N8nOAuth2TokenCredential } from '../credentials/N8nOAuth2TokenCredential';
import { AZURE_AI_FOUNDRY_AUDIENCE, AZURE_OPENAI_INFERENCE_AUDIENCE } from '../types';
import type { AzureEntraCognitiveServicesOAuth2ApiCredential } from '../types';

const { MockClientOAuth2, mockGetToken } = vi.hoisted(() => {
	const mockGetToken = vi.fn();

	class MockCredentialsFlow {
		getToken = mockGetToken;
	}

	class MockClientOAuth2 {
		credentials: MockCredentialsFlow;

		constructor(readonly options: ClientOAuth2Options) {
			this.credentials = new MockCredentialsFlow();
			MockClientOAuth2.init(options);
		}

		static init = vi.fn();
	}

	return { MockClientOAuth2, MockCredentialsFlow, mockGetToken };
});

vi.mock('@n8n/client-oauth2', () => ({
	ClientOAuth2: MockClientOAuth2,
}));

const mockNode: INode = {
	id: '1',
	name: 'Mock node',
	typeVersion: 2,
	type: 'n8n-nodes-base.mock',
	position: [0, 0],
	parameters: {},
};

describe('N8nOAuth2TokenCredential', () => {
	let mockCredential: AzureEntraCognitiveServicesOAuth2ApiCredential;
	let credential: N8nOAuth2TokenCredential;

	beforeEach(() => {
		mockGetToken.mockResolvedValue({
			data: { access_token: 'fresh-test-token', expires_in: '3599' },
		});

		// Create a mock credential with all required properties
		mockCredential = {
			authQueryParameters: '',
			authentication: 'body',
			authUrl: '',
			accessTokenUrl: '',
			grantType: 'clientCredentials',
			clientId: '',
			clientSecret: 'secret',
			customScopes: false,
			apiVersion: '2023-05-15',
			endpoint: 'https://test.openai.azure.com',
			resourceName: 'test-resource',
			oauthTokenData: {
				access_token: 'test-token',
				expires_on: 1234567890,
				ext_expires_on: 0,
			},
			scope: '',
			tenantId: '',
		};

		credential = new N8nOAuth2TokenCredential(mockNode, mockCredential);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getToken', () => {
		it('should return a token when credentials are valid', async () => {
			// Act
			const result = await credential.getToken();

			// Assert
			expect(result?.token).toBe('fresh-test-token');
			expect(MockClientOAuth2.init).toHaveBeenCalledWith(
				expect.objectContaining({
					clientId: mockCredential.clientId,
					clientSecret: mockCredential.clientSecret,
				}),
			);
		});

		it('requests the cognitiveservices audience by default', async () => {
			await credential.getToken();

			expect(MockClientOAuth2.init).toHaveBeenCalledWith(
				expect.objectContaining({
					additionalBodyProperties: { resource: `${AZURE_OPENAI_INFERENCE_AUDIENCE}/` },
				}),
			);
		});

		it('requests the audience passed to the constructor, when one is given', async () => {
			credential = new N8nOAuth2TokenCredential(
				mockNode,
				mockCredential,
				AZURE_AI_FOUNDRY_AUDIENCE,
			);

			await credential.getToken();

			expect(MockClientOAuth2.init).toHaveBeenCalledWith(
				expect.objectContaining({
					additionalBodyProperties: { resource: `${AZURE_AI_FOUNDRY_AUDIENCE}/` },
				}),
			);
		});

		// The caller's token cycler compares this against `Date.now()`, so seconds would put every
		// token in 1970 and re-authenticate on every model call.
		it('should report the expiry in epoch milliseconds, from expires_in', async () => {
			const before = Date.now();

			const result = await credential.getToken();

			// 3599 seconds from now, allowing for the clock moving during the call
			expect(result?.expiresOnTimestamp).toBeGreaterThanOrEqual(before + 3599 * 1000);
			expect(result?.expiresOnTimestamp).toBeLessThanOrEqual(Date.now() + 3599 * 1000);
		});

		it('should fall back to expires_on, which the v1 endpoint sends as an epoch second', async () => {
			mockGetToken.mockResolvedValueOnce({
				data: { access_token: 'fresh-test-token', expires_on: '1790000000' },
			});

			const result = await credential.getToken();

			expect(result?.expiresOnTimestamp).toBe(1790000000 * 1000);
		});

		// A real Entra v1 response carries both fields. Without this case the two branches can be
		// swapped and the suite still passes.
		it('should prefer expires_in when the response carries both', async () => {
			mockGetToken.mockResolvedValueOnce({
				data: { access_token: 'fresh-test-token', expires_in: '3599', expires_on: '1790000000' },
			});
			const before = Date.now();

			const result = await credential.getToken();

			expect(result?.expiresOnTimestamp).toBeGreaterThanOrEqual(before + 3599 * 1000);
			expect(result?.expiresOnTimestamp).toBeLessThanOrEqual(Date.now() + 3599 * 1000);
		});

		it('should report an unreadable expiry as already expired, rather than caching forever', async () => {
			mockGetToken.mockResolvedValueOnce({ data: { access_token: 'fresh-test-token' } });
			const before = Date.now();

			const result = await credential.getToken();

			expect(result?.expiresOnTimestamp).toBeGreaterThanOrEqual(before);
			expect(result?.expiresOnTimestamp).toBeLessThanOrEqual(Date.now());
		});

		// The credential signs in as the app, so it must not need a stored browser token.
		it('should not require oauthTokenData', async () => {
			const withoutBrowserToken = { ...mockCredential };
			// @ts-expect-error: a client-credentials credential never holds this
			delete withoutBrowserToken.oauthTokenData;
			credential = new N8nOAuth2TokenCredential(
				mockNode,
				withoutBrowserToken as AzureEntraCognitiveServicesOAuth2ApiCredential,
			);

			await expect(credential.getToken()).resolves.toEqual(
				expect.objectContaining({ token: 'fresh-test-token' }),
			);
		});

		it('should wrap a token-endpoint failure in a NodeOperationError', async () => {
			mockGetToken.mockRejectedValueOnce(new Error('invalid_client'));

			await expect(credential.getToken()).rejects.toThrow(NodeOperationError);
		});
	});

	// The node hands this credential to `getBearerTokenProvider`, whose pipeline caches on the
	// expiry we report. This is the acceptance criterion "one token serves many model calls", and
	// it is the reason the expiry has to be in milliseconds.
	describe('through getBearerTokenProvider', () => {
		it('should mint one token for many calls', async () => {
			const provider = getBearerTokenProvider(
				credential,
				`${AZURE_OPENAI_INFERENCE_AUDIENCE}/.default`,
			);

			await expect(provider()).resolves.toBe('fresh-test-token');
			await expect(provider()).resolves.toBe('fresh-test-token');
			await expect(provider()).resolves.toBe('fresh-test-token');

			expect(mockGetToken).toHaveBeenCalledTimes(1);
		});

		it('should mint a new token once the old one is near expiry', async () => {
			// Inside the cycler's two-minute refresh window, so it must not be reused
			mockGetToken.mockResolvedValue({
				data: { access_token: 'fresh-test-token', expires_in: '30' },
			});
			const provider = getBearerTokenProvider(
				credential,
				`${AZURE_OPENAI_INFERENCE_AUDIENCE}/.default`,
			);

			await provider();
			await provider();

			expect(mockGetToken).toHaveBeenCalledTimes(2);
		});
	});

	describe('getDeploymentDetails', () => {
		it('should return deployment details from credentials', async () => {
			// Act
			const result = await credential.getDeploymentDetails();

			// Assert
			expect(result).toEqual({
				apiVersion: '2023-05-15',
				endpoint: 'https://test.openai.azure.com',
				resourceName: 'test-resource',
			});
		});

		it('should return the Foundry endpoint when endpointType is foundry', async () => {
			mockCredential.endpointType = 'foundry';
			mockCredential.foundryEndpoint = 'https://test.services.ai.azure.com/openai/v1';
			credential = new N8nOAuth2TokenCredential(mockNode, mockCredential);

			const result = await credential.getDeploymentDetails();

			expect(result).toEqual({
				apiVersion: '2023-05-15',
				endpoint: 'https://test.services.ai.azure.com/openai/v1',
				resourceName: 'test-resource',
				endpointType: 'foundry',
				foundryEndpoint: 'https://test.services.ai.azure.com/openai/v1',
			});
		});
	});
});
