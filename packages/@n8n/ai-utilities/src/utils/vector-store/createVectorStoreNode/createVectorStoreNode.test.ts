/* eslint-disable n8n-local-rules/no-uncaught-json-parse */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { DynamicTool } from '@langchain/classic/tools';
import type { DocumentInterface } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import { NodeApiError, NodeOperationError, UserError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INode,
	ISupplyDataFunctions,
	NodeParameterValueType,
	INodeExecutionData,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { createVectorStoreNode } from './createVectorStoreNode';
import type { VectorStoreNodeConstructorArgs } from './types';

vi.mock('../../log-wrapper', () => ({
	logWrapper: vi.fn().mockImplementation((val: DynamicTool) => ({ logWrapped: val })),
}));

vi.mock('../../helpers', () => ({
	getMetadataFiltersValues: vi.fn().mockReturnValue(undefined),
}));

vi.mock('../../log-ai-event', () => ({
	logAiEvent: vi.fn(),
}));

const DEFAULT_PARAMETERS = {
	options: {},
	useReranker: false,
	topK: 1,
};

const MOCK_DOCUMENTS: Array<[DocumentInterface, number]> = [
	[
		{
			pageContent: 'first page',
			metadata: {
				id: 123,
			},
		},
		0,
	],
	[
		{
			pageContent: 'second page',
			metadata: {
				id: 567,
			},
		},
		0,
	],
];

const MOCK_SEARCH_VALUE = 'search value';
const MOCK_EMBEDDED_SEARCH_VALUE = [1, 2, 3];

describe('createVectorStoreNode', () => {
	const vectorStore = mock<VectorStore>({
		similaritySearchVectorWithScore: vi.fn().mockResolvedValue(MOCK_DOCUMENTS),
	});

	const vectorStoreNodeArgs = mock<VectorStoreNodeConstructorArgs>({
		sharedFields: [],
		insertFields: [],
		loadFields: [
			{
				name: 'loadField',
			},
		],
		retrieveFields: [],
		updateFields: [],
		getVectorStoreClient: vi.fn().mockReturnValue(vectorStore),
	});

	const embeddings = mock<Embeddings>({
		embedQuery: vi.fn().mockResolvedValue(MOCK_EMBEDDED_SEARCH_VALUE),
	});

	const context = mock<ISupplyDataFunctions>({
		getNodeParameter: vi.fn(),
		getInputConnectionData: vi.fn().mockReturnValue(embeddings),
	});

	describe('retrieve mode', () => {
		it('supplies vector store as data', async () => {
			// ARRANGE
			const parameters: Record<string, NodeParameterValueType | object> = {
				...DEFAULT_PARAMETERS,
				mode: 'retrieve',
			};
			context.getNodeParameter.mockImplementation(
				(parameterName: string): NodeParameterValueType | object => parameters[parameterName],
			);

			// ACT
			const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
			const nodeType = new VectorStoreNodeType();
			const data = await nodeType.supplyData.call(context, 1);
			const wrappedVectorStore = (data.response as { logWrapped: VectorStore }).logWrapped;

			// ASSERT
			expect(nodeType.description).toMatchSnapshot();
			expect(wrappedVectorStore).toEqual(vectorStore);
			expect(vectorStoreNodeArgs.getVectorStoreClient).toHaveBeenCalled();
		});
	});

	describe('retrieve-as-tool mode', () => {
		it('supplies DynamicTool that queries vector store and returns documents with metadata on version <= 1.2', async () => {
			// ARRANGE
			const parameters: Record<string, NodeParameterValueType> = {
				...DEFAULT_PARAMETERS,
				mode: 'retrieve-as-tool',
				description: 'tool description',
				toolName: 'tool name',
				includeDocumentMetadata: true,
			};
			context.getNode.mockReturnValueOnce({
				id: 'testNode',
				typeVersion: 1.2,
				name: 'Test Tool',
				type: 'testVectorStore',
				parameters,
				position: [0, 0],
			});
			context.getNodeParameter.mockImplementation(
				(parameterName: string): NodeParameterValueType | object => parameters[parameterName],
			);

			// ACT
			const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
			const nodeType = new VectorStoreNodeType();
			const data = await nodeType.supplyData.call(context, 1);
			const tool = (data.response as { logWrapped: DynamicTool }).logWrapped;
			const output = await tool?.func(MOCK_SEARCH_VALUE);

			// ASSERT
			expect(tool?.getName()).toEqual(parameters.toolName);
			expect(tool?.description).toEqual(parameters.toolDescription);
			expect(embeddings.embedQuery).toHaveBeenCalledWith(MOCK_SEARCH_VALUE);
			expect(vectorStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
				MOCK_EMBEDDED_SEARCH_VALUE,
				parameters.topK,
				parameters.filter,
			);
			expect(output).toEqual([
				{ type: 'text', text: JSON.stringify(MOCK_DOCUMENTS[0][0]) },
				{ type: 'text', text: JSON.stringify(MOCK_DOCUMENTS[1][0]) },
			]);
		});

		it('supplies DynamicTool that queries vector store and returns documents with metadata on version > 1.2', async () => {
			// ARRANGE
			const parameters: Record<string, NodeParameterValueType> = {
				...DEFAULT_PARAMETERS,
				mode: 'retrieve-as-tool',
				description: 'tool description',
				includeDocumentMetadata: true,
			};
			context.getNode.mockReturnValueOnce({
				id: 'testNode',
				typeVersion: 1.3,
				name: 'Test Tool',
				type: 'testVectorStore',
				parameters,
				position: [0, 0],
			});
			context.getNodeParameter.mockImplementation(
				(parameterName: string): NodeParameterValueType | object => parameters[parameterName],
			);

			// ACT
			const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
			const nodeType = new VectorStoreNodeType();
			const data = await nodeType.supplyData.call(context, 1);
			const tool = (data.response as { logWrapped: DynamicTool }).logWrapped;
			const output = await tool?.func(MOCK_SEARCH_VALUE);

			// ASSERT
			expect(tool?.getName()).toEqual('Test_Tool');
			expect(tool?.description).toEqual(parameters.toolDescription);
			expect(embeddings.embedQuery).toHaveBeenCalledWith(MOCK_SEARCH_VALUE);
			expect(vectorStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
				MOCK_EMBEDDED_SEARCH_VALUE,
				parameters.topK,
				parameters.filter,
			);
			expect(output).toEqual([
				{ type: 'text', text: JSON.stringify(MOCK_DOCUMENTS[0][0]) },
				{ type: 'text', text: JSON.stringify(MOCK_DOCUMENTS[1][0]) },
			]);
		});

		it('supplies DynamicTool that queries vector store and returns documents without metadata', async () => {
			// ARRANGE
			const parameters: Record<string, NodeParameterValueType> = {
				...DEFAULT_PARAMETERS,
				mode: 'retrieve-as-tool',
				description: 'tool description',
				includeDocumentMetadata: false,
			};
			context.getNode.mockReturnValueOnce({
				id: 'testNode',
				typeVersion: 1.3,
				name: 'Test Tool',
				type: 'testVectorStore',
				parameters,
				position: [0, 0],
			});
			context.getNodeParameter.mockImplementation(
				(parameterName: string): NodeParameterValueType | object => parameters[parameterName],
			);

			// ACT
			const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
			const nodeType = new VectorStoreNodeType();
			const data = await nodeType.supplyData.call(context, 1);
			const tool = (data.response as { logWrapped: DynamicTool }).logWrapped;
			const output = await tool?.func(MOCK_SEARCH_VALUE);

			// ASSERT
			expect(tool?.getName()).toEqual('Test_Tool');
			expect(tool?.description).toEqual(parameters.toolDescription);
			expect(embeddings.embedQuery).toHaveBeenCalledWith(MOCK_SEARCH_VALUE);
			expect(vectorStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
				MOCK_EMBEDDED_SEARCH_VALUE,
				parameters.topK,
				parameters.filter,
			);
			expect(output).toEqual([
				{ type: 'text', text: JSON.stringify({ pageContent: MOCK_DOCUMENTS[0][0].pageContent }) },
				{ type: 'text', text: JSON.stringify({ pageContent: MOCK_DOCUMENTS[1][0].pageContent }) },
			]);
		});
	});

	describe('execute mode', () => {
		const executeContext = mock<IExecuteFunctions>({
			getNodeParameter: vi.fn(),
			getInputConnectionData: vi.fn().mockReturnValue(embeddings),
			getInputData: vi.fn(),
		});

		beforeEach(() => {
			vi.clearAllMocks();
		});

		describe('retrieve-as-tool mode in execute context', () => {
			it('should execute retrieve-as-tool and return documents with metadata', async () => {
				// ARRANGE
				const parameters: Record<string, NodeParameterValueType> = {
					...DEFAULT_PARAMETERS,
					mode: 'retrieve-as-tool',
					includeDocumentMetadata: true,
				};

				const inputData: INodeExecutionData[] = [
					{
						json: { input: MOCK_SEARCH_VALUE },
						pairedItem: { item: 0 },
					},
				];

				executeContext.getNodeParameter.mockImplementation(
					(parameterName: string): NodeParameterValueType | object => parameters[parameterName],
				);
				executeContext.getInputData.mockReturnValue(inputData);

				// ACT
				const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
				const nodeType = new VectorStoreNodeType();
				const result = await nodeType.execute.call(executeContext);

				// ASSERT
				expect(result).toHaveLength(1); // One output array
				expect(result[0][0]?.json?.response).toHaveLength(2); // Two documents returned

				expect(result[0][0]).toEqual({
					json: {
						response: [
							{
								type: 'text',
								text: JSON.stringify({
									pageContent: 'first page',
									metadata: { id: 123 },
								}),
							},
							{
								type: 'text',
								text: JSON.stringify({
									pageContent: 'second page',
									metadata: { id: 567 },
								}),
							},
						],
					},
					pairedItem: { item: 0 },
				});

				expect(embeddings.embedQuery).toHaveBeenCalledWith(MOCK_SEARCH_VALUE);
				expect(vectorStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
					MOCK_EMBEDDED_SEARCH_VALUE,
					parameters.topK,
					undefined, // filter
				);
			});

			it('should execute retrieve-as-tool and return documents without metadata', async () => {
				// ARRANGE
				const parameters: Record<string, NodeParameterValueType> = {
					...DEFAULT_PARAMETERS,
					mode: 'retrieve-as-tool',
					includeDocumentMetadata: false,
				};

				const inputData: INodeExecutionData[] = [
					{
						json: { input: MOCK_SEARCH_VALUE },
						pairedItem: { item: 0 },
					},
				];

				executeContext.getNodeParameter.mockImplementation(
					(parameterName: string): NodeParameterValueType | object => parameters[parameterName],
				);
				executeContext.getInputData.mockReturnValue(inputData);

				// ACT
				const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
				const nodeType = new VectorStoreNodeType();
				const result = await nodeType.execute.call(executeContext);

				// ASSERT
				expect(result[0][0].json.response).toHaveLength(2);
				const response = result[0][0].json.response as Array<{ pageContent: string }>;
				const doc0 = JSON.parse(response[0].pageContent);
				const doc1 = JSON.parse(response[1].pageContent);
				expect(doc0).not.toHaveProperty('metadata');
				expect(doc0).toEqual({ pageContent: 'first page' });
				expect(doc1).toEqual({ pageContent: 'second page' });
			});

			it('should process multiple input items', async () => {
				// ARRANGE
				const parameters: Record<string, NodeParameterValueType> = {
					...DEFAULT_PARAMETERS,
					mode: 'retrieve-as-tool',
					includeDocumentMetadata: true,
				};

				const inputData: INodeExecutionData[] = [
					{
						json: { input: 'first query' },
						pairedItem: { item: 0 },
					},
					{
						json: { input: 'second query' },
						pairedItem: { item: 1 },
					},
				];

				executeContext.getNodeParameter.mockImplementation(
					(parameterName: string): NodeParameterValueType | object => parameters[parameterName],
				);
				executeContext.getInputData.mockReturnValue(inputData);

				// ACT
				const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
				const nodeType = new VectorStoreNodeType();
				const result = await nodeType.execute.call(executeContext);

				// ASSERT
				expect(result).toHaveLength(1);
				expect(result[0]).toHaveLength(2); // One result item per input query

				// Check that embedQuery was called for both input queries
				expect(embeddings.embedQuery).toHaveBeenCalledTimes(2);
				expect(embeddings.embedQuery).toHaveBeenNthCalledWith(1, 'first query');
				expect(embeddings.embedQuery).toHaveBeenNthCalledWith(2, 'second query');

				// Check pairedItem references and that each result contains both documents
				expect(result[0][0].pairedItem).toEqual({ item: 0 });
				expect(result[0][0].json.response).toHaveLength(2); // 2 documents for first query
				expect(result[0][1].pairedItem).toEqual({ item: 1 });
				expect(result[0][1].json.response).toHaveLength(2); // 2 documents for second query
			});

			it('should throw error for unsupported mode in execute', async () => {
				// ARRANGE
				const parameters: Record<string, NodeParameterValueType> = {
					...DEFAULT_PARAMETERS,
					mode: 'retrieve', // This mode is not supported in execute
				};

				executeContext.getNodeParameter.mockImplementation(
					(parameterName: string): NodeParameterValueType | object => parameters[parameterName],
				);

				// ACT & ASSERT
				const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
				const nodeType = new VectorStoreNodeType();

				await expect(nodeType.execute.call(executeContext)).rejects.toThrow(
					'Only the "load", "update", "insert", and "retrieve-as-tool" operation modes are supported with execute',
				);
			});
		});
	});

	describe('error normalization', () => {
		const node = mock<INode>({ name: 'Test Vector Store' });

		const executeContext = mock<IExecuteFunctions>({
			getNodeParameter: vi.fn(),
			getInputConnectionData: vi.fn().mockReturnValue(embeddings),
			getInputData: vi.fn(),
			getNode: vi.fn().mockReturnValue(node),
		});

		const loadParameters: Record<string, NodeParameterValueType> = {
			...DEFAULT_PARAMETERS,
			mode: 'load',
			prompt: MOCK_SEARCH_VALUE,
			includeDocumentMetadata: true,
		};

		it('wraps provider SDK errors thrown during execute in NodeApiError', async () => {
			// ARRANGE
			executeContext.getNodeParameter.mockImplementation(
				(parameterName: string): NodeParameterValueType | object => loadParameters[parameterName],
			);
			executeContext.getInputData.mockReturnValue([{ json: {} }]);

			const sdkError = new Error(
				'Vector dimension 1536 does not match the dimension of the index 1024',
			);
			sdkError.name = 'PineconeBadRequestError';
			vectorStore.similaritySearchVectorWithScore.mockRejectedValueOnce(sdkError);

			// ACT
			const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
			const nodeType = new VectorStoreNodeType();
			const thrown: unknown = await nodeType.execute
				.call(executeContext)
				.catch((error: unknown) => error);

			// ASSERT
			expect(thrown).toBeInstanceOf(NodeApiError);
			expect(thrown).toMatchObject({
				level: 'warning',
				message: 'Vector dimension 1536 does not match the dimension of the index 1024',
			});
		});

		it('keeps programmer errors at error level so they stay report-visible', async () => {
			// ARRANGE
			executeContext.getNodeParameter.mockImplementation(
				(parameterName: string): NodeParameterValueType | object => loadParameters[parameterName],
			);
			executeContext.getInputData.mockReturnValue([{ json: {} }]);

			vectorStore.similaritySearchVectorWithScore.mockRejectedValueOnce(
				new TypeError("Cannot read properties of undefined (reading 'matches')"),
			);

			// ACT
			const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
			const nodeType = new VectorStoreNodeType();
			const thrown: unknown = await nodeType.execute
				.call(executeContext)
				.catch((error: unknown) => error);

			// ASSERT
			expect(thrown).toBeInstanceOf(NodeApiError);
			expect(thrown).toMatchObject({
				level: 'error',
				message: "Cannot read properties of undefined (reading 'matches')",
			});
		});

		it('keeps the provider message as description when a status code swaps the message', async () => {
			// ARRANGE
			executeContext.getNodeParameter.mockImplementation(
				(parameterName: string): NodeParameterValueType | object => loadParameters[parameterName],
			);
			executeContext.getInputData.mockReturnValue([{ json: {} }]);

			const sdkError = Object.assign(
				new Error('Index dimension 1024 does not match query dimension 1536'),
				{ status: 400 },
			);
			vectorStore.similaritySearchVectorWithScore.mockRejectedValueOnce(sdkError);

			// ACT
			const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
			const nodeType = new VectorStoreNodeType();
			const thrown: unknown = await nodeType.execute
				.call(executeContext)
				.catch((error: unknown) => error);

			// ASSERT
			expect(thrown).toBeInstanceOf(NodeApiError);
			expect(thrown).toMatchObject({
				httpCode: '400',
				message: 'Bad request - please check your parameters',
				description: 'Index dimension 1024 does not match query dimension 1536',
			});
		});

		it('rethrows UserError and other BaseError subclasses unchanged', async () => {
			// ARRANGE
			executeContext.getNodeParameter.mockImplementation(
				(parameterName: string): NodeParameterValueType | object => loadParameters[parameterName],
			);
			executeContext.getInputData.mockReturnValue([{ json: {} }]);

			const userError = new UserError('Index does not exist');
			vectorStoreNodeArgs.getVectorStoreClient.mockImplementationOnce(() => {
				throw userError;
			});

			// ACT
			const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
			const nodeType = new VectorStoreNodeType();
			const thrown: unknown = await nodeType.execute
				.call(executeContext)
				.catch((error: unknown) => error);

			// ASSERT
			expect(thrown).toBe(userError);
		});

		it('rethrows n8n errors from execute unchanged', async () => {
			// ARRANGE
			executeContext.getNodeParameter.mockImplementation(
				(parameterName: string): NodeParameterValueType | object => loadParameters[parameterName],
			);
			executeContext.getInputData.mockReturnValue([{ json: {} }]);

			const n8nError = new NodeOperationError(node, 'Index not found');
			vectorStoreNodeArgs.getVectorStoreClient.mockImplementationOnce(() => {
				throw n8nError;
			});

			// ACT
			const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
			const nodeType = new VectorStoreNodeType();
			const thrown: unknown = await nodeType.execute
				.call(executeContext)
				.catch((error: unknown) => error);

			// ASSERT
			expect(thrown).toBe(n8nError);
		});

		it('wraps provider SDK errors thrown during supplyData in NodeApiError', async () => {
			// ARRANGE
			const supplyContext = mock<ISupplyDataFunctions>({
				getNodeParameter: vi.fn(),
				getInputConnectionData: vi.fn().mockReturnValue(embeddings),
				getNode: vi.fn().mockReturnValue(node),
			});
			const parameters: Record<string, NodeParameterValueType> = {
				...DEFAULT_PARAMETERS,
				mode: 'retrieve',
			};
			supplyContext.getNodeParameter.mockImplementation(
				(parameterName: string): NodeParameterValueType | object => parameters[parameterName],
			);

			const sdkError = new Error('401 Unauthorized');
			sdkError.name = 'PineconeAuthorizationError';
			vectorStoreNodeArgs.getVectorStoreClient.mockRejectedValueOnce(sdkError);

			// ACT
			const VectorStoreNodeType = createVectorStoreNode(vectorStoreNodeArgs);
			const nodeType = new VectorStoreNodeType();
			const thrown: unknown = await nodeType.supplyData
				.call(supplyContext, 1)
				.catch((error: unknown) => error);

			// ASSERT
			expect(thrown).toBeInstanceOf(NodeApiError);
			expect(thrown).toMatchObject({
				level: 'warning',
				message: '401 Unauthorized',
				context: { itemIndex: 1 },
			});
		});
	});
});
