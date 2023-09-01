/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import type { Document } from 'langchain/document';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import type { Embeddings } from 'langchain/embeddings/base';
import { logWrapper } from '../../../utils/logWrapper';

export class InMemoryVectorStore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'In Memory Vector Store',
		name: 'inMemoryVectorStore',
		icon: 'fa:database',
		group: ['transform'],
		version: 1,
		description: 'Stores vectors in memory',
		defaults: {
			name: 'In Memory Vector Store',
			color: '#400080',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Vector Stores'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Document',
				type: 'document',
				required: false,
			},
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: 'embedding',
				required: false,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['vectorRetriever'],
		outputNames: ['Vector Retriever'],
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const documents = (await this.getInputConnectionData('document', 0)) as Document[];
		const embeddings = (await this.getInputConnectionData('embedding', 0)) as Embeddings;

		const documentsStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

		return {
			response: logWrapper(documentsStore, this),
		};
	}
}
