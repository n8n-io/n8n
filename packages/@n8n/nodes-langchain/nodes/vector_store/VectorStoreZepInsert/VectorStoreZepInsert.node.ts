import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
} from 'n8n-workflow';
import { ZepVectorStore } from 'langchain/vectorstores/zep';
import type { Embeddings } from 'langchain/embeddings/base';
import type { Document } from 'langchain/document';
import { N8nJsonLoader } from '../../../utils/N8nJsonLoader';
import { N8nBinaryLoader } from '../../../utils/N8nBinaryLoader';

export class VectorStoreZepInsert implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zep Vector Store: Insert',
		name: 'vectorStoreZepInsert',
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
		},
		credentials: [
			{
				name: 'zepApi',
				required: true,
			},
		],
		inputs: [
			'main',
			{
				displayName: 'Document',
				maxConnections: 1,
				type: 'document',
				required: true,
			},
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: 'embedding',
				required: true,
			},
		],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Collection Name',
				name: 'collectionName',
				type: 'string',
				default: '',
				required: true,
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
		const items = this.getInputData(0);
		this.logger.verbose('Executing data for Zep Insert Vector Store');

		const collectionName = this.getNodeParameter('collectionName', 0) as string;

		const options =
			(this.getNodeParameter('options', 0) as {
				isAutoEmbedded?: boolean;
				embeddingDimensions?: number;
			}) || {};

		const credentials = (await this.getCredentials('zepApi')) as {
			apiKey?: string;
			apiUrl: string;
		};

		const documentInput = (await this.getInputConnectionData('document', 0)) as
			| N8nJsonLoader
			| Array<Document<Record<string, unknown>>>;

		const embeddings = (await this.getInputConnectionData('embedding', 0)) as Embeddings;

		let processedDocuments: Document[];

		if (documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader) {
			processedDocuments = await documentInput.process(items);
		} else {
			processedDocuments = documentInput;
		}

		const zepConfig = {
			apiUrl: credentials.apiUrl,
			collectionName,
			embeddingDimensions: options.embeddingDimensions ?? 1536,
			isAutoEmbedded: options.isAutoEmbedded ?? true,
		};

		await ZepVectorStore.fromDocuments(processedDocuments, embeddings, zepConfig);

		const serializedDocuments = processedDocuments.map(({ metadata, pageContent }) => ({
			json: { metadata, pageContent },
		}));

		return this.prepareOutputData(serializedDocuments);
	}
}
