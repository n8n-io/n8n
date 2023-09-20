import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { ZepVectorStore } from 'langchain/vectorstores/zep';
import type { Embeddings } from 'langchain/embeddings/base';
import { logWrapper } from '../../../utils/logWrapper';

export class VectorStoreZepLoad implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zep Vector Store: Load',
		name: 'vectorStoreZepLoad',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:zep.png',
		group: ['transform'],
		version: 1,
		description: 'Load data from Zep Vector Store index',
		defaults: {
			name: 'Zep: Load',
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
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: 'embedding',
				required: true,
			},
		],
		outputs: ['vectorStore'],
		outputNames: ['Vector Store'],
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
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		this.logger.verbose('Supplying data for Zep Load Vector Store');
		const collectionName = this.getNodeParameter('collectionName', 0) as string;

		const options =
			(this.getNodeParameter('options', 0) as {
				embeddingDimensions?: number;
			}) || {};

		const credentials = (await this.getCredentials('zepApi')) as {
			apiKey?: string;
			apiUrl: string;
		};
		const embeddings = (await this.getInputConnectionData('embedding', 0)) as Embeddings;

		const zepConfig = {
			apiUrl: credentials.apiUrl,
			collectionName,
			embeddingDimensions: options.embeddingDimensions ?? 1536,
		};

		const vectorStore = new ZepVectorStore(embeddings, zepConfig);

		return {
			response: logWrapper(vectorStore, this),
		};
	}
}
