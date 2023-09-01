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
		inputs: ['document', 'embedding'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['vectorRetriever'],
		outputNames: ['Vector Retriever'],
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const documentsNodes = (await this.getInputConnectionData('document', 0)) || [];
		const documents = documentsNodes.flatMap((node) => node.response as Document);
		const embeddingNodes = await this.getInputConnectionData('embedding', 0);
		const embeddings = (embeddingNodes || [])[0]?.response as Embeddings;

		const documentsStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

		return {
			response: logWrapper(documentsStore, this),
		};
	}
}
