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

	describe('APIM configuration', () => {
		it('should not include apimConfig when useApim is false', async () => {
			// Arrange
			mockCredential.useApim = false;
			ctx.getCredentials = jest.fn().mockResolvedValue(mockCredential);

			// Act
			const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

			// Assert
			expect(result.apimConfig).toBeUndefined();
		});

		it('should not include apimConfig when useApim is undefined', async () => {
			// Arrange - useApim not set (backward compatibility)
			ctx.getCredentials = jest.fn().mockResolvedValue(mockCredential);

			// Act
			const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

			// Assert
			expect(result.apimConfig).toBeUndefined();
		});

		it('should include apimConfig with basePath when useApim is true', async () => {
			// Arrange
			mockCredential.useApim = true;
			mockCredential.apimBasePath = 'https://my-apim.azure-api.net/openai/deployments';
			ctx.getCredentials = jest.fn().mockResolvedValue(mockCredential);

			// Act
			const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

			// Assert
			expect(result.apimConfig).toBeDefined();
			expect(result.apimConfig?.basePath).toBe('https://my-apim.azure-api.net/openai/deployments');
		});

		it('should include apimConfig with query params when useApim is true', async () => {
			// Arrange
			mockCredential.useApim = true;
			mockCredential.apimQueryParams = {
				params: [
					{ name: 'subscription-key', value: 'test-sub-key' },
					{ name: 'custom-param', value: 'custom-value' },
				],
			};
			ctx.getCredentials = jest.fn().mockResolvedValue(mockCredential);

			// Act
			const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

			// Assert
			expect(result.apimConfig).toBeDefined();
			expect(result.apimConfig?.queryParams).toEqual({
				'subscription-key': 'test-sub-key',
				'custom-param': 'custom-value',
			});
		});

		it('should include apimConfig with headers when useApim is true', async () => {
			// Arrange
			mockCredential.useApim = true;
			mockCredential.apimHeaders = {
				headers: [
					{ name: 'Ocp-Apim-Subscription-Key', value: 'test-header-key' },
					{ name: 'X-Custom-Header', value: 'custom-header-value' },
				],
			};
			ctx.getCredentials = jest.fn().mockResolvedValue(mockCredential);

			// Act
			const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

			// Assert
			expect(result.apimConfig).toBeDefined();
			expect(result.apimConfig?.headers).toEqual({
				'Ocp-Apim-Subscription-Key': 'test-header-key',
				'X-Custom-Header': 'custom-header-value',
			});
		});

		it('should include full apimConfig with basePath, query params, and headers', async () => {
			// Arrange
			mockCredential.useApim = true;
			mockCredential.apimBasePath = 'https://my-apim.azure-api.net/openai/deployments';
			mockCredential.apimQueryParams = {
				params: [{ name: 'subscription-key', value: 'test-sub-key' }],
			};
			mockCredential.apimHeaders = {
				headers: [{ name: 'X-Custom-Header', value: 'custom-value' }],
			};
			ctx.getCredentials = jest.fn().mockResolvedValue(mockCredential);

			// Act
			const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

			// Assert
			expect(result.apimConfig).toBeDefined();
			expect(result.apimConfig).toEqual({
				basePath: 'https://my-apim.azure-api.net/openai/deployments',
				queryParams: { 'subscription-key': 'test-sub-key' },
				headers: { 'X-Custom-Header': 'custom-value' },
			});
		});

		it('should not include apimConfig when useApim is true but no settings configured', async () => {
			// Arrange
			mockCredential.useApim = true;
			// No basePath, queryParams, or headers set
			ctx.getCredentials = jest.fn().mockResolvedValue(mockCredential);

			// Act
			const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

			// Assert
			expect(result.apimConfig).toBeUndefined();
		});

		it('should skip empty query param entries', async () => {
			// Arrange
			mockCredential.useApim = true;
			mockCredential.apimQueryParams = {
				params: [
					{ name: 'valid-key', value: 'valid-value' },
					{ name: '', value: 'no-name' }, // Should be skipped
					{ name: 'no-value', value: '' }, // Should be skipped
				],
			};
			ctx.getCredentials = jest.fn().mockResolvedValue(mockCredential);

			// Act
			const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

			// Assert
			expect(result.apimConfig?.queryParams).toEqual({
				'valid-key': 'valid-value',
			});
		});
	});
});
