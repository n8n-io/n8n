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
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return valid configuration when API key is provided', async () => {
		// Arrange
		const mockCredentials = {
			apiKey: 'test-api-key',
			resourceName: 'test-resource',
			apiVersion: '2023-05-15',
			endpoint: 'https://test.openai.azure.com',
		};

		ctx.getCredentials = jest.fn().mockResolvedValue(mockCredentials);
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

	it('should throw NodeOperationError when API key is missing', async () => {
		// Arrange
		const mockCredentials = {
			// No apiKey
			resourceName: 'test-resource',
			apiVersion: '2023-05-15',
		};

		ctx.getCredentials = jest.fn().mockResolvedValue(mockCredentials);

		// Act & Assert
		await expect(setupApiKeyAuthentication.call(ctx, 'testCredential')).rejects.toThrow(
			NodeOperationError,
		);
	});

	it('should throw NodeOperationError when credential retrieval fails', async () => {
		// Arrange
		const testError = new Error('Credential fetch failed');
		ctx.getCredentials = jest.fn().mockRejectedValue(testError);

		// Act & Assert
		await expect(setupApiKeyAuthentication.call(ctx, 'testCredential')).rejects.toThrow(
			NodeOperationError,
		);
	});
});
