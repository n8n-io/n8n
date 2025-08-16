import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { VectorStoreMoorcheh } from '../VectorStoreMoorcheh.node';
import { createMoorchehClient } from '../Moorcheh.utils';

// Mock the createMoorchehClient function
jest.mock('../Moorcheh.utils', () => ({
	createMoorchehClient: jest.fn(),
}));

describe('VectorStoreMoorcheh', () => {
	const vectorStore = new VectorStoreMoorcheh();
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const executeFunctions = mock<ISupplyDataFunctions>({ helpers });

	const mockClient = {
		listNamespaces: jest.fn(),
		createNamespace: jest.fn(),
		uploadVectors: jest.fn(),
		search: jest.fn(),
		deleteVectors: jest.fn(),
	};

	beforeEach(() => {
		jest.resetAllMocks();

		executeFunctions.addInputData.mockReturnValue({ index: 0 });
		(createMoorchehClient as jest.Mock).mockReturnValue(mockClient);
	});

	it('should get vector store client for retrieve mode', async () => {
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'mode':
					return 'retrieve';
				case 'moorchehNamespace':
					return 'test-namespace';
				case 'options':
					return {};
				default:
					return undefined;
			}
		});

		executeFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key',
			baseUrl: 'https://api.moorcheh.ai/v1',
		});

		mockClient.listNamespaces.mockResolvedValue([
			{
				name: 'test-namespace',
				type: 'vector',
				vector_dimension: 1536,
			},
		]);

		const { response } = await vectorStore.supplyData.call(executeFunctions, 0);

		expect(response).toBeDefined();
		expect(createMoorchehClient).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			baseUrl: 'https://api.moorcheh.ai/v1',
		});
		expect(mockClient.listNamespaces).toHaveBeenCalled();
	});

	it('should handle insert mode correctly', async () => {
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'mode':
					return 'insert';
				case 'moorchehNamespace':
					return 'new-namespace';
				case 'options':
					return { vectorDimension: 1536 };
				default:
					return undefined;
			}
		});

		executeFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key',
			baseUrl: 'https://api.moorcheh.ai/v1',
		});

		mockClient.createNamespace.mockResolvedValue(undefined);

		// Insert mode should throw error for supplyData since it's not supported
		await expect(vectorStore.supplyData.call(executeFunctions, 0)).rejects.toThrow(
			'Only the "retrieve" and "retrieve-as-tool" operation mode is supported to supply data',
		);
	});

	it('should handle namespace validation error', async () => {
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'mode':
					return 'retrieve';
				case 'moorchehNamespace':
					return 'non-existent-namespace';
				case 'options':
					return {};
				default:
					return undefined;
			}
		});

		executeFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key',
			baseUrl: 'https://api.moorcheh.ai/v1',
		});

		mockClient.listNamespaces.mockResolvedValue([
			{
				name: 'other-namespace',
				type: 'vector',
				vector_dimension: 1536,
			},
		]);

		await expect(vectorStore.supplyData.call(executeFunctions, 0)).rejects.toThrow(
			'Namespace "non-existent-namespace" not found',
		);
	});

	it('should handle non-vector namespace error', async () => {
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'mode':
					return 'retrieve';
				case 'moorchehNamespace':
					return 'text-namespace';
				case 'options':
					return {};
				default:
					return undefined;
			}
		});

		executeFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key',
			baseUrl: 'https://api.moorcheh.ai/v1',
		});

		mockClient.listNamespaces.mockResolvedValue([
			{
				name: 'text-namespace',
				type: 'text',
			},
		]);

		await expect(vectorStore.supplyData.call(executeFunctions, 0)).rejects.toThrow(
			'Namespace "text-namespace" is not a vector namespace',
		);
	});

	it('should use default credentials when baseUrl is not provided', async () => {
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'mode':
					return 'retrieve';
				case 'moorchehNamespace':
					return 'test-namespace';
				case 'options':
					return {};
				default:
					return undefined;
			}
		});

		executeFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key',
		});

		mockClient.listNamespaces.mockResolvedValue([
			{
				name: 'test-namespace',
				type: 'vector',
				vector_dimension: 1536,
			},
		]);

		await vectorStore.supplyData.call(executeFunctions, 0);

		expect(createMoorchehClient).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
		});
	});
});
