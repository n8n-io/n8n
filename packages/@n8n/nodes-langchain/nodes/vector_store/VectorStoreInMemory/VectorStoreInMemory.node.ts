/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import type { Document } from 'langchain/document';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import type { Embeddings } from 'langchain/embeddings/base';
import { logWrapper } from '../../../utils/logWrapper';

export class VectorStoreInMemory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'In Memory Vector Store',
		name: 'vectorStoreInMemory',
		icon: 'fa:database',
		group: ['transform'],
		version: 1,
		description: 'Stores vectors in memory',
		defaults: {
			name: 'In Memory Vector Store',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Vector Stores'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.vectorstoreinmemory/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Document',
				type: NodeConnectionType.AiDocument,
				required: false,
			},
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: NodeConnectionType.AiEmbedding,
				required: false,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiVectorRetriever],
		outputNames: ['Vector Retriever'],
		properties: [
			{
				displayName: 'Specify the document to load in the document loader sub-node',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const documents = (await this.getInputConnectionData(
			NodeConnectionType.AiDocument,
			itemIndex,
		)) as Document[];
		const embeddings = (await this.getInputConnectionData(
			NodeConnectionType.AiEmbedding,
			itemIndex,
		)) as Embeddings;

		const documentsStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

		return {
			response: logWrapper(documentsStore, this),
		};
	}
}
