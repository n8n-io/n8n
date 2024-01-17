import {
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type INodeExecutionData,
	NodeConnectionType,
} from 'n8n-workflow';
import { ZepVectorStore } from 'langchain/vectorstores/zep';
import type { Embeddings } from 'langchain/embeddings/base';
import type { Document } from 'langchain/document';
import type { N8nJsonLoader } from '../../../utils/N8nJsonLoader';
import { processDocuments } from '../shared/processDocuments';

// This node is deprecated. Use VectorStoreZep instead.
export class VectorStoreZepInsert implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zep Vector Store: Insert',
		name: 'vectorStoreZepInsert',
		hidden: true,
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:zep.png',
		group: ['transform'],
		version: 1,
		description: 'Insert data into Zep Vector Store index',
		defaults: {
			name: 'Zep: Insert',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Vector Stores'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorezep/',
					},
				],
			},
		},
		credentials: [
			{
				name: 'zepApi',
				required: true,
			},
		],
		inputs: [
			NodeConnectionType.Main,
			{
				displayName: 'Document',
				maxConnections: 1,
				type: NodeConnectionType.AiDocument,
				required: true,
			},
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: NodeConnectionType.AiEmbedding,
				required: true,
			},
		],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Collection Name',
				name: 'collectionName',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Specify the document to load in the document loader sub-node',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Embedding Dimensions',
						name: 'embeddingDimensions',
						type: 'number',
						default: 1536,
						description: 'Whether to allow using characters from the Unicode surrogate blocks',
					},
					{
						displayName: 'Is Auto Embedded',
						name: 'isAutoEmbedded',
						type: 'boolean',
						default: true,
						description: 'Whether to automatically embed documents when they are added',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing data for Zep Insert Vector Store');
		const items = this.getInputData(0);
		const collectionName = this.getNodeParameter('collectionName', 0) as string;
		const options =
			(this.getNodeParameter('options', 0, {}) as {
				isAutoEmbedded?: boolean;
				embeddingDimensions?: number;
			}) || {};

		const credentials = (await this.getCredentials('zepApi')) as {
			apiKey?: string;
			apiUrl: string;
		};

		const documentInput = (await this.getInputConnectionData(NodeConnectionType.AiDocument, 0)) as
			| N8nJsonLoader
			| Array<Document<Record<string, unknown>>>;

		const embeddings = (await this.getInputConnectionData(
			NodeConnectionType.AiEmbedding,
			0,
		)) as Embeddings;

		const { processedDocuments, serializedDocuments } = await processDocuments(
			documentInput,
			items,
		);

		const zepConfig = {
			apiUrl: credentials.apiUrl,
			apiKey: credentials.apiKey,
			collectionName,
			embeddingDimensions: options.embeddingDimensions ?? 1536,
			isAutoEmbedded: options.isAutoEmbedded ?? true,
		};

		await ZepVectorStore.fromDocuments(processedDocuments, embeddings, zepConfig);

		return await this.prepareOutputData(serializedDocuments);
	}
}
