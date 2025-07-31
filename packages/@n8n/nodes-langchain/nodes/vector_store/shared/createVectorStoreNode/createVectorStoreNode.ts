import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	SupplyData,
	ISupplyDataFunctions,
	INodeType,
	INodeProperties,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

// Import custom types
import {
	handleLoadOperation,
	handleInsertOperation,
	handleUpdateOperation,
	handleRetrieveOperation,
	handleRetrieveAsToolOperation,
} from './operations';
import type { NodeOperationMode, VectorStoreNodeConstructorArgs } from './types';
// Import utility functions
import { transformDescriptionForOperationMode, getOperationModeOptions } from './utils';

const ragStarterCallout: INodeProperties = {
	displayName: 'Tip: Get a feel for vector stores in n8n with our',
	name: 'ragStarterCallout',
	type: 'callout',
	typeOptions: {
		calloutAction: {
			label: 'RAG starter template',
			type: 'openRagStarterTemplate',
		},
	},
	default: '',
};

/**
 * Creates a vector store node with the given configuration
 * This factory function produces a complete node class that implements all vector store operations
 */
export const createVectorStoreNode = <T extends VectorStore = VectorStore>(
	args: VectorStoreNodeConstructorArgs<T>,
) =>
	class VectorStoreNodeType implements INodeType {
		description: INodeTypeDescription = {
			displayName: args.meta.displayName,
			name: args.meta.name,
			description: args.meta.description,
			icon: args.meta.icon,
			iconColor: args.meta.iconColor,
			group: ['transform'],
			// 1.2 has changes to VectorStoreInMemory node.
			// 1.3 drops `toolName` and uses node name as the tool name.
			version: [1, 1.1, 1.2, 1.3],
			defaults: {
				name: args.meta.displayName,
			},
			codex: {
				categories: args.meta.categories ?? ['AI'],
				subcategories: args.meta.subcategories ?? {
					AI: ['Vector Stores', 'Tools', 'Root Nodes'],
					'Vector Stores': ['Other Vector Stores'],
					Tools: ['Other Tools'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: args.meta.docsUrl,
						},
					],
				},
			},
			credentials: args.meta.credentials,

			inputs: `={{
			((parameters) => {
				const mode = parameters?.mode;
				const useReranker = parameters?.useReranker;
				const inputs = [{ displayName: "Embedding", type: "${NodeConnectionTypes.AiEmbedding}", required: true, maxConnections: 1}]

				if (['load', 'retrieve', 'retrieve-as-tool'].includes(mode) && useReranker) {
					inputs.push({ displayName: "Reranker", type: "${NodeConnectionTypes.AiReranker}", required: true, maxConnections: 1})
				}

				if (mode === 'retrieve-as-tool') {
					return inputs;
				}

				if (['insert', 'load', 'update'].includes(mode)) {
					inputs.push({ displayName: "", type: "${NodeConnectionTypes.Main}"})
				}

				if (['insert'].includes(mode)) {
					inputs.push({ displayName: "Document", type: "${NodeConnectionTypes.AiDocument}", required: true, maxConnections: 1})
				}
				return inputs
			})($parameter)
		}}`,
			outputs: `={{
			((parameters) => {
				const mode = parameters?.mode ?? 'retrieve';

				if (mode === 'retrieve-as-tool') {
					return [{ displayName: "Tool", type: "${NodeConnectionTypes.AiTool}"}]
				}

				if (mode === 'retrieve') {
					return [{ displayName: "Vector Store", type: "${NodeConnectionTypes.AiVectorStore}"}]
				}
				return [{ displayName: "", type: "${NodeConnectionTypes.Main}"}]
			})($parameter)
		}}`,
			properties: [
				ragStarterCallout,
				{
					displayName: 'Operation Mode',
					name: 'mode',
					type: 'options',
					noDataExpression: true,
					default: 'retrieve',
					options: getOperationModeOptions(args),
				},
				{
					...getConnectionHintNoticeField([NodeConnectionTypes.AiRetriever]),
					displayOptions: {
						show: {
							mode: ['retrieve'],
						},
					},
				},
				{
					displayName: 'Name',
					name: 'toolName',
					type: 'string',
					default: '',
					required: true,
					description: 'Name of the vector store',
					placeholder: 'e.g. company_knowledge_base',
					validateType: 'string-alphanumeric',
					displayOptions: {
						show: {
							'@version': [{ _cnd: { lte: 1.2 } }],
							mode: ['retrieve-as-tool'],
						},
					},
				},
				{
					displayName: 'Description',
					name: 'toolDescription',
					type: 'string',
					default: '',
					required: true,
					typeOptions: { rows: 2 },
					description:
						'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
					placeholder: `e.g. ${args.meta.description}`,
					displayOptions: {
						show: {
							mode: ['retrieve-as-tool'],
						},
					},
				},
				...args.sharedFields,
				{
					displayName: 'Embedding Batch Size',
					name: 'embeddingBatchSize',
					type: 'number',
					default: 200,
					description: 'Number of documents to embed in a single batch',
					displayOptions: {
						show: {
							mode: ['insert'],
							'@version': [{ _cnd: { gte: 1.1 } }],
						},
					},
				},
				...transformDescriptionForOperationMode(args.insertFields ?? [], 'insert'),
				// Prompt and topK are always used for the load operation
				{
					displayName: 'Prompt',
					name: 'prompt',
					type: 'string',
					default: '',
					required: true,
					description:
						'Search prompt to retrieve matching documents from the vector store using similarity-based ranking',
					displayOptions: {
						show: {
							mode: ['load'],
						},
					},
				},
				{
					displayName: 'Limit',
					name: 'topK',
					type: 'number',
					default: 4,
					description: 'Number of top results to fetch from vector store',
					displayOptions: {
						show: {
							mode: ['load', 'retrieve-as-tool'],
						},
					},
				},
				{
					displayName: 'Include Metadata',
					name: 'includeDocumentMetadata',
					type: 'boolean',
					default: true,
					description: 'Whether or not to include document metadata',
					displayOptions: {
						show: {
							mode: ['load', 'retrieve-as-tool'],
						},
					},
				},
				{
					displayName: 'Rerank Results',
					name: 'useReranker',
					type: 'boolean',
					default: false,
					description: 'Whether or not to rerank results',
					displayOptions: {
						show: {
							mode: ['load', 'retrieve', 'retrieve-as-tool'],
						},
					},
				},
				// ID is always used for update operation
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					default: '',
					required: true,
					description: 'ID of an embedding entry',
					displayOptions: {
						show: {
							mode: ['update'],
						},
					},
				},
				...transformDescriptionForOperationMode(args.loadFields ?? [], [
					'load',
					'retrieve-as-tool',
				]),
				...transformDescriptionForOperationMode(args.retrieveFields ?? [], 'retrieve'),
				...transformDescriptionForOperationMode(args.updateFields ?? [], 'update'),
			],
		};

		methods = args.methods;

		/**
		 * Method to execute the node in regular workflow mode
		 * Supports 'load', 'insert', and 'update' operation modes
		 */
		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			const mode = this.getNodeParameter('mode', 0) as NodeOperationMode;
			// Get the embeddings model connected to this node
			const embeddings = (await this.getInputConnectionData(
				NodeConnectionTypes.AiEmbedding,
				0,
			)) as Embeddings;

			// Handle each operation mode with dedicated modules
			if (mode === 'load') {
				const items = this.getInputData(0);
				const resultData = [];

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const docs = await handleLoadOperation(this, args, embeddings, itemIndex);
					resultData.push(...docs);
				}

				return [resultData];
			}

			if (mode === 'insert') {
				const resultData = await handleInsertOperation(this, args, embeddings);
				return [resultData];
			}

			if (mode === 'update') {
				const resultData = await handleUpdateOperation(this, args, embeddings);
				return [resultData];
			}

			throw new NodeOperationError(
				this.getNode(),
				'Only the "load", "update" and "insert" operation modes are supported with execute',
			);
		}

		/**
		 * Method to supply data to AI nodes
		 * Supports 'retrieve' and 'retrieve-as-tool' operation modes
		 */
		async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
			const mode = this.getNodeParameter('mode', 0) as NodeOperationMode;

			// Get the embeddings model connected to this node
			const embeddings = (await this.getInputConnectionData(
				NodeConnectionTypes.AiEmbedding,
				0,
			)) as Embeddings;

			// Handle each supply data operation mode with dedicated modules
			if (mode === 'retrieve') {
				return await handleRetrieveOperation(this, args, embeddings, itemIndex);
			}

			if (mode === 'retrieve-as-tool') {
				return await handleRetrieveAsToolOperation(this, args, embeddings, itemIndex);
			}

			throw new NodeOperationError(
				this.getNode(),
				'Only the "retrieve" and "retrieve-as-tool" operation mode is supported to supply data',
			);
		}
	};
