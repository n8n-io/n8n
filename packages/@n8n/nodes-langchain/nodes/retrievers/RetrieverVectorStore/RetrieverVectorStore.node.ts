/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { NodeOperationError, type IExecuteFunctions, type INodeType, type INodeTypeDescription, type SupplyData } from 'n8n-workflow';
import { logWrapper } from '../../../utils/logWrapper';
import { PineconeStore } from 'langchain/vectorstores/pinecone';

export class RetrieverVectorStore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Vector Store Retriever',
		name: 'retrieverVectorStore',
		icon: 'fa:box-open',
		group: ['transform'],
		version: 1,
		description: 'Outputs Vector Store as Retriever',
		defaults: {
			name: 'LangChain - Outputs Vector Store as Retriever',
			color: '#400080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['vectorStore'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['vectorRetriever'],
		outputNames: ['Vector Retriever'],
		properties: [
			{
					displayName: 'Retriever Name',
					name: 'name',
					type: 'string',
					default: '',
			},
			{
					displayName: 'Retriever Description',
					name: 'description',
					type: 'string',
					default: '',
					typeOptions: { rows: 5 },
			},
			{
				displayName: 'Top K',
				name: 'topK',
				type: 'number',
				default: 4,
				description: 'Number of top results to fetch from vector store.',
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		this.logger.verbose('Supplying data for Vector Store Retriever');
		const topK = this.getNodeParameter('topK', 0, 4) as number;
		const vectorStoreNodes = await this.getInputConnectionData('vectorStore', 0);

		if (vectorStoreNodes.length > 1) {
			throw new NodeOperationError(this.getNode(), 'Only one Vector Retriever is allowed to be connected!');
		}

		const vectorStore = (vectorStoreNodes || [])[0]?.response as PineconeStore;
		const retriever = vectorStore.asRetriever(topK);

		return {
			response: logWrapper(retriever, this)
		};
	}
}
