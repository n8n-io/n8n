/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { Document } from 'langchain/document';
import { MemoryVectorStore  } from 'langchain/vectorstores/memory';
import { Embeddings  } from 'langchain/embeddings/base';
// import { getSingleInputConnectionData } from '../../utils/helpers';

export class LangChainInMemoryVectorStore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - In Memory Vector Store Retriever',
		name: 'langChainInMemoryVectorStore',
		icon: 'fa:database',
		group: ['transform'],
		version: 1,
		description: 'In Memory Vector Store',
		defaults: {
			name: 'LangChain - In Memory Vector Store',
			color: '#400080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['document', 'embedding'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['vectorRetriever'],
		outputNames: ['Vector Retriever'],
		properties: [
			{
					displayName: 'Top K',
					name: 'topK',
					type: 'number',
					default: 6,
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		console.log('Supply In Memory Vector Store 12')
		const itemIndex = 0;
		const topK = this.getNodeParameter('topK', itemIndex) as number;
		const embeddingNodes = await this.getInputConnectionData(0, 0, 'embedding');
		const embeddings = (embeddingNodes || [])[0]?.response as Embeddings;
		const documentsNodes = await this.getInputConnectionData(0, 0, 'document') || [];
		const documents = documentsNodes.map((node) => node.response as Document);

		const documentsStore = await MemoryVectorStore.fromDocuments(documents, embeddings);
		const retriever = documentsStore.asRetriever(topK);

		return {
			response: retriever
		};
	}
}
