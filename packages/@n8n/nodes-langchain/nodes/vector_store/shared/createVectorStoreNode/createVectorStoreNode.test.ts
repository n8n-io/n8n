/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { DocumentInterface } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import { mock } from 'jest-mock-extended';
import type { DynamicTool } from 'langchain/tools';
import type { ISupplyDataFunctions, NodeParameterValueType } from 'n8n-workflow';

import { createVectorStoreNode } from './createVectorStoreNode';
import type { VectorStoreNodeConstructorArgs } from './types';

jest.mock('@utils/logWrapper', () => ({
	logWrapper: jest.fn().mockImplementation((val: DynamicTool) => ({ logWrapped: val })),
}));

const DEFAULT_PARAMETERS = {
	options: {},
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
		similaritySearchVectorWithScore: jest.fn().mockResolvedValue(MOCK_DOCUMENTS),
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
		getVectorStoreClient: jest.fn().mockReturnValue(vectorStore),
	});

	const embeddings = mock<Embeddings>({
		embedQuery: jest.fn().mockResolvedValue(MOCK_EMBEDDED_SEARCH_VALUE),
	});

	const context = mock<ISupplyDataFunctions>({
		getNodeParameter: jest.fn(),
		getInputConnectionData: jest.fn().mockReturnValue(embeddings),
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
});
