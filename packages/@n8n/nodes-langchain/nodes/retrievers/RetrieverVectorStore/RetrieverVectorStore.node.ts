import type { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import { VectorStore } from '@langchain/core/vectorstores';
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

export class RetrieverVectorStore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vector Store Retriever',
		name: 'retrieverVectorStore',
		icon: 'fa:box-open',
		iconColor: 'black',
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

		inputs: [
			{
				displayName: 'Vector Store',
				maxConnections: 1,
				type: NodeConnectionTypes.AiVectorStore,
				required: true,
			},
		],

		outputs: [NodeConnectionTypes.AiRetriever],
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
			NodeConnectionTypes.AiVectorStore,
			itemIndex,
		)) as
			| VectorStore
			| {
					reranker: BaseDocumentCompressor;
					vectorStore: VectorStore;
			  };

		let retriever = null;

		if (vectorStore instanceof VectorStore) {
			retriever = vectorStore.asRetriever(topK);
		} else {
			retriever = new ContextualCompressionRetriever({
				baseCompressor: vectorStore.reranker,
				baseRetriever: vectorStore.vectorStore.asRetriever(topK),
			});
		}

		return {
			response: logWrapper(retriever, this),
		};
	}
}
