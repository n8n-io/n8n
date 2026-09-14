/* eslint-disable @typescript-eslint/unbound-method */
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { setupApiKeyAuthentication } from '../credentials/api-key';

describe('setupApiKeyAuthentication', () => {
	let ctx: ISupplyDataFunctions;

	beforeEach(() => {
		const mockNode: INode = {
			id: '1',
			name: 'Mock node',
			typeVersion: 2,
			type: 'n8n-nodes-base.mock',
			position: [0, 0],
			parameters: {},
		};
		ctx = createMockExecuteFunction<ISupplyDataFunctions>({}, mockNode);
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

	it('should return valid configuration when API key is provided', async () => {
		// Arrange
		const mockCredentials = {
			apiKey: 'test-api-key',
			resourceName: 'test-resource',
			apiVersion: '2023-05-15',
			endpoint: 'https://test.openai.azure.com',
		};

		ctx.getCredentials = vi.fn().mockResolvedValue(mockCredentials);
		// Act
		const result = await setupApiKeyAuthentication.call(ctx, 'testCredential');
		// Assert
		expect(result).toEqual({
			azureOpenAIApiKey: 'test-api-key',
			azureOpenAIApiInstanceName: 'test-resource',
			azureOpenAIApiVersion: '2023-05-15',
			azureOpenAIEndpoint: 'https://test.openai.azure.com',
		});
		expect(ctx.getCredentials).toHaveBeenCalledWith('testCredential');
	});

	it('should return a Foundry base URL when endpointType is foundry', async () => {
		const mockCredentials = {
			apiKey: 'test-api-key',
			endpointType: 'foundry',
			foundryEndpoint: 'https://test.services.ai.azure.com/openai/v1',
		};

		ctx.getCredentials = vi.fn().mockResolvedValue(mockCredentials);

		const result = await setupApiKeyAuthentication.call(ctx, 'testCredential');

		expect(result).toEqual({
			azureOpenAIApiKey: 'test-api-key',
			azureOpenAIApiInstanceName: '',
			azureOpenAIApiVersion: '',
			azureOpenAIEndpoint: 'https://test.services.ai.azure.com/openai/v1',
			azureFoundryBaseURL: 'https://test.services.ai.azure.com/openai/v1',
		});
	});

	it('should throw NodeOperationError when a classic credential is missing resourceName', async () => {
		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-api-key',
			apiVersion: '2023-05-15',
		});

		await expect(setupApiKeyAuthentication.call(ctx, 'testCredential')).rejects.toThrow(
			'Resource Name and API Version are required for a classic Azure OpenAI credential.',
		);
	});

	it('should throw NodeOperationError when a classic credential is missing apiVersion', async () => {
		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-api-key',
			resourceName: 'test-resource',
		});

		await expect(setupApiKeyAuthentication.call(ctx, 'testCredential')).rejects.toThrow(
			'Resource Name and API Version are required for a classic Azure OpenAI credential.',
		);
	});

	it('should throw NodeOperationError when API key is missing', async () => {
		// Arrange
		const mockCredentials = {
			// No apiKey
			resourceName: 'test-resource',
			apiVersion: '2023-05-15',
		};

		ctx.getCredentials = vi.fn().mockResolvedValue(mockCredentials);

		// Act & Assert
		await expect(setupApiKeyAuthentication.call(ctx, 'testCredential')).rejects.toThrow(
			NodeOperationError,
		);
	});

	it('should throw NodeOperationError when credential retrieval fails', async () => {
		// Arrange
		const testError = new Error('Credential fetch failed');
		ctx.getCredentials = vi.fn().mockRejectedValue(testError);

		// Act & Assert
		await expect(setupApiKeyAuthentication.call(ctx, 'testCredential')).rejects.toThrow(
			NodeOperationError,
		);
	});
});
