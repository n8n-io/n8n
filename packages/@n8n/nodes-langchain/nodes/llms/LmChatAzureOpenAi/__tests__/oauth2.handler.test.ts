/* eslint-disable @typescript-eslint/unbound-method */
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { setupOAuth2Authentication } from '../credentials/oauth2';
import type { AzureEntraCognitiveServicesOAuth2ApiCredential } from '../types';

// Mock the N8nOAuth2TokenCredential. `deploymentDetails` is read per call, so a test can
// replace it before it acts.
const mocks = vi.hoisted(() => ({
	deploymentDetails: {} as {
		apiVersion: string;
		endpoint: string;
		resourceName: string;
		endpointType?: 'classic' | 'foundry';
		foundryEndpoint?: string;
	},
}));

vi.mock('../credentials/N8nOAuth2TokenCredential', () => ({
	N8nOAuth2TokenCredential: class N8nOAuth2TokenCredentialMock {
		getToken = vi.fn().mockResolvedValue({
			token: 'test-token',
			expiresOnTimestamp: 1234567890,
		});
		getDeploymentDetails = vi.fn(async () => mocks.deploymentDetails);
	},
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
		mocks.deploymentDetails = {
			apiVersion: '2023-05-15',
			endpoint: 'https://test.openai.azure.com',
			resourceName: 'test-resource',
		};
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
		ctx.getCredentials = vi.fn().mockResolvedValue(mockCredential);
		ctx.logger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
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

	it('should remove a trailing slash from the Entra endpoint', async () => {
		mocks.deploymentDetails.endpoint = 'https://test.openai.azure.com/';

		const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

		expect(result).toEqual(
			expect.objectContaining({ azureOpenAIEndpoint: 'https://test.openai.azure.com' }),
		);
	});

	it('should remove a trailing slash from the Foundry base URL', async () => {
		mocks.deploymentDetails = {
			apiVersion: '',
			endpoint: 'https://test.services.ai.azure.com/openai/v1/',
			resourceName: '',
			endpointType: 'foundry',
			foundryEndpoint: 'https://test.services.ai.azure.com/openai/v1/',
		};

		const result = await setupOAuth2Authentication.call(ctx, 'testCredential');

		expect(result).toEqual(
			expect.objectContaining({
				azureOpenAIEndpoint: 'https://test.services.ai.azure.com/openai/v1',
				azureFoundryBaseURL: 'https://test.services.ai.azure.com/openai/v1',
			}),
		);
	});

	it('should throw NodeOperationError when the Foundry endpoint is only spaces', async () => {
		mocks.deploymentDetails = {
			apiVersion: '',
			endpoint: '   ',
			resourceName: '',
			endpointType: 'foundry',
			foundryEndpoint: '   ',
		};

		await expect(setupOAuth2Authentication.call(ctx, 'testCredential')).rejects.toThrow(
			NodeOperationError,
		);
	});

	it('should throw NodeOperationError when credential retrieval fails', async () => {
		// Arrange
		const testError = new Error('Credential fetch failed');
		ctx.getCredentials = vi.fn().mockRejectedValue(testError);

		// Act & Assert
		await expect(setupOAuth2Authentication.call(ctx, 'testCredential')).rejects.toThrow(
			NodeOperationError,
		);
	});
});
