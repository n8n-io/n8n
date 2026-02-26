import type { Embeddings } from '@langchain/core/embeddings';
import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	ApplicationError,
} from 'n8n-workflow';

import { createQdrantClient, type QdrantCredential } from '../VectorStoreQdrant/Qdrant.utils';
import {
	supplyVectorStore,
	N8nJsonLoader,
	N8nBinaryLoader,
	fromLcDocument,
} from '@n8n/ai-utilities';

import { qdrantCollectionsSearch } from '../shared/methods/listSearch';
import { qdrantCollectionRLC } from '../shared/descriptions';
import { QdrantVectorStoreCustom } from './QdrantVectorStoreCustom';

async function handleInsert(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const embeddings = (await this.getInputConnectionData(
		NodeConnectionTypes.AiEmbedding,
		0,
	)) as Embeddings;

	// Get documents from Document connection
	const documentInput = await this.getInputConnectionData(NodeConnectionTypes.AiDocument, 0);

	for (let i = 0; i < items.length; i++) {
		const collection = this.getNodeParameter('qdrantCollection', i, '', {
			extractValue: true,
		}) as string;

		const options = this.getNodeParameter('options', i, {}) as {
			contentPayloadKey?: string;
			metadataPayloadKey?: string;
		};

		const credentials = await this.getCredentials('qdrantApi');
		const client = createQdrantClient(credentials as QdrantCredential);

		const vectorStore = new QdrantVectorStoreCustom(
			client,
			embeddings,
			collection,
			options.contentPayloadKey || 'content',
			options.metadataPayloadKey || 'metadata',
		);

		// Process documents from the Document connection
		let processedDocuments: unknown[];

		if (documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader) {
			processedDocuments = await documentInput.processItem(items[i], i);
		} else if (Array.isArray(documentInput)) {
			processedDocuments = documentInput;
		} else {
			throw new ApplicationError('Invalid document input type');
		}

		// Convert documents to our VectorStoreDocument format using fromLcDocument
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const vectorDocs = processedDocuments.map((doc) => fromLcDocument(doc as any));

		const ids = await vectorStore.addDocuments(vectorDocs);

		returnData.push({
			json: { ids, count: ids.length },
			pairedItem: { item: i },
		});
	}

	return [returnData];
}

async function handleRetrieveAsTool(
	this: ISupplyDataFunctions,
	itemIndex: number,
): Promise<SupplyData> {
	const collection = this.getNodeParameter('qdrantCollection', itemIndex, '', {
		extractValue: true,
	}) as string;

	const options = this.getNodeParameter('options', itemIndex, {}) as {
		contentPayloadKey?: string;
		metadataPayloadKey?: string;
		topK?: number;
	};

	const embeddings = (await this.getInputConnectionData(
		NodeConnectionTypes.AiEmbedding,
		0,
	)) as Embeddings;

	const credentials = await this.getCredentials('qdrantApi');
	const client = createQdrantClient(credentials as QdrantCredential);

	const vectorStore = new QdrantVectorStoreCustom(
		client,
		embeddings,
		collection,
		options.contentPayloadKey || 'content',
		options.metadataPayloadKey || 'metadata',
	);

	if (options.topK) {
		vectorStore.defaultConfig = { topK: options.topK };
	}

	return supplyVectorStore(this, embeddings, vectorStore);
}

export class VectorStoreQdrantAdaptersTest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Qdrant Vector Store (Adapters Test)',
		name: 'vectorStoreQdrantAdaptersTest',
		icon: 'file:qdrant.svg',
		group: ['transform'],
		version: 1,
		description: 'Manual implementation using adapters (no factory)',
		usableAsTool: true,
		defaults: {
			name: 'Qdrant Vector Store (Adapters Test)',
		},
		credentials: [
			{
				name: 'qdrantApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Vector Stores', 'Tools', 'Root Nodes'],
				'Vector Stores': ['Other Vector Stores'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreqdrant/',
					},
				],
			},
		},
		inputs: `={{
			((parameters) => {
				const mode = parameters?.mode;
				const inputs = [
					{ displayName: "Embedding", type: "${NodeConnectionTypes.AiEmbedding}", required: true, maxConnections: 1 }
				];

				if (mode === 'retrieve-as-tool') {
					return inputs;
				}

				if (mode === 'insert') {
					inputs.push({ displayName: "", type: "${NodeConnectionTypes.Main}" });
					inputs.push({ displayName: "Document", type: "${NodeConnectionTypes.AiDocument}", required: true, maxConnections: 1 });
				}

				return inputs;
			})($parameter)
		}}`,
		outputs: `={{
			((parameters) => {
				const mode = parameters?.mode ?? 'insert';

				if (mode === 'retrieve-as-tool') {
					return [{ displayName: "Tool", type: "${NodeConnectionTypes.AiTool}" }];
				}

				return [{ displayName: "", type: "${NodeConnectionTypes.Main}" }];
			})($parameter)
		}}`,
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Insert',
						value: 'insert',
						description: 'Insert documents into the vector store',
						action: 'Insert documents',
					},
					{
						name: 'Retrieve as Tool',
						value: 'retrieve-as-tool',
						description: 'Retrieve documents as a tool for AI agents',
						action: 'Retrieve as tool',
					},
				],
				default: 'insert',
			},
			qdrantCollectionRLC,
			{
				displayName: 'Tool Description',
				name: 'toolDescription',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['retrieve-as-tool'],
					},
				},
				default: 'Retrieve data from a semantic database to answer questions',
				description: 'Description of what the tool does, used by the AI agent',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Content Payload Key',
						name: 'contentPayloadKey',
						type: 'string',
						default: 'content',
						description: 'The key to use for the content payload in Qdrant',
					},
					{
						displayName: 'Metadata Payload Key',
						name: 'metadataPayloadKey',
						type: 'string',
						default: 'metadata',
						description: 'The key to use for the metadata payload in Qdrant',
					},
					{
						displayName: 'Top K',
						name: 'topK',
						type: 'number',
						displayOptions: {
							show: {
								'/mode': ['retrieve-as-tool'],
							},
						},
						default: 4,
						description: 'Number of results to return',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			qdrantCollectionsSearch,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const mode = this.getNodeParameter('mode', 0) as string;

		if (mode !== 'insert') {
			throw new ApplicationError(`Mode '${mode}' should use supplyData, not execute`);
		}

		return await handleInsert.call(this);
	}

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const mode = this.getNodeParameter('mode', itemIndex) as string;

		if (mode !== 'retrieve-as-tool') {
			throw new ApplicationError(`Mode '${mode}' should use execute, not supplyData`);
		}

		return await handleRetrieveAsTool.call(this, itemIndex);
	}
}
