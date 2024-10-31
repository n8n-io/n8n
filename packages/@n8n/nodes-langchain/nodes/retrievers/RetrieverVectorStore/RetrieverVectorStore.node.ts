/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import type { VectorStore } from '@langchain/core/vectorstores';
import { logWrapper } from '../../../utils/logWrapper';

export class RetrieverVectorStore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vector Store Retriever',
		name: 'retrieverVectorStore',
		icon: 'fa:box-open',
		group: ['transform'],
		version: 1,
		description: 'Use a Vector Store as Retriever',
		defaults: {
			name: 'Vector Store Retriever',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Retrievers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.retrievervectorstore/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Vector Store',
				maxConnections: 1,
				type: NodeConnectionType.AiVectorStore,
				required: true,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiRetriever],
		outputNames: ['Retriever'],
		properties: [
			{
				displayName: 'Limit',
				name: 'topK',
				type: 'number',
				default: 4,
				description: 'The maximum number of results to return',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supplying data for Vector Store Retriever');

		const topK = this.getNodeParameter('topK', itemIndex, 4) as number;
		const vectorStore = (await this.getInputConnectionData(
			NodeConnectionType.AiVectorStore,
			itemIndex,
		)) as VectorStore;

		const retriever = vectorStore.asRetriever(topK);

		return {
			response: logWrapper(retriever, this),
		};
	}
}
