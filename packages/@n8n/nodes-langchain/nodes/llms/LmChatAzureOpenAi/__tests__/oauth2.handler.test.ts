/* eslint-disable @typescript-eslint/unbound-method */
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { setupOAuth2Authentication } from '../credentials/oauth2';
import type { AzureEntraCognitiveServicesOAuth2ApiCredential } from '../types';

// Mock the N8nOAuth2TokenCredential
jest.mock('../credentials/N8nOAuth2TokenCredential', () => ({
	N8nOAuth2TokenCredential: jest.fn().mockImplementation(() => ({
		getToken: jest.fn().mockResolvedValue({
			token: 'test-token',
			expiresOnTimestamp: 1234567890,
		}),
		getDeploymentDetails: jest.fn().mockResolvedValue({
			apiVersion: '2023-05-15',
			endpoint: 'https://test.openai.azure.com',
			resourceName: 'test-resource',
		}),
	})),
}));

const mockNode: INode = {
	id: '1',
	name: 'Mock node',
	typeVersion: 2,
	type: 'n8n-nodes-base.mock',
	position: [0, 0],
	parameters: {},
};

describe('setupOAuth2Authentication', () => {
	let mockCredential: AzureEntraCognitiveServicesOAuth2ApiCredential;
	let ctx: ISupplyDataFunctions;
	beforeEach(() => {
		// Set up a mock credential
		mockCredential = {
			authQueryParameters: '',
			authentication: 'body', // Set valid authentication type
			authUrl: '',
			accessTokenUrl: '', // Added missing property
			grantType: 'clientCredentials', // Corrected grant type value
			clientId: '',
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
		ctx = createMockExecuteFunction<ISupplyDataFunctions>({}, mockNode);
		ctx.getCredentials = jest.fn().mockResolvedValue(mockCredential);
		ctx.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return token provider and deployment details when successful', async () => {
		// Act
		const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

		// Assert
		expect(result).toHaveProperty('azureADTokenProvider');
		expect(typeof result.azureADTokenProvider).toBe('function');
		expect(result).toEqual(
			expect.objectContaining({
				azureOpenAIApiInstanceName: 'test-resource',
				azureOpenAIApiVersion: '2023-05-15',
				azureOpenAIEndpoint: 'https://test.openai.azure.com',
			}),
		);
		expect(ctx.getCredentials).toHaveBeenCalledWith('testCredential');
	});

	it('should throw NodeOperationError when credential retrieval fails', async () => {
		// Arrange
		const testError = new Error('Credential fetch failed');
		ctx.getCredentials = jest.fn().mockRejectedValue(testError);

		// Act & Assert
		await expect(setupOAuth2Authentication.call(ctx, 'testCredential')).rejects.toThrow(
			NodeOperationError,
		);
	});
});
