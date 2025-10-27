import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { BaseRetriever } from '@langchain/core/retrievers';
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression';
import { LLMChainExtractor } from 'langchain/retrievers/document_compressors/chain_extract';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

export class RetrieverContextualCompression implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Contextual Compression Retriever',
		name: 'retrieverContextualCompression',
		icon: 'fa:box-open',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Enhances document similarity search by contextual compression.',
		defaults: {
			name: 'Contextual Compression Retriever',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Retrievers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.retrievercontextualcompression/',
					},
				],
			},
		},

		inputs: [
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
			{
				displayName: 'Retriever',
				maxConnections: 1,
				type: NodeConnectionTypes.AiRetriever,
				required: true,
			},
		],
		outputs: [
			{
				displayName: 'Retriever',
				maxConnections: 1,
				type: NodeConnectionTypes.AiRetriever,
			},
		],
		properties: [],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supplying data for Contextual Compression Retriever');

		const model = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			itemIndex,
		)) as BaseLanguageModel;

		const baseRetriever = (await this.getInputConnectionData(
			NodeConnectionTypes.AiRetriever,
			itemIndex,
		)) as BaseRetriever;

		const baseCompressor = LLMChainExtractor.fromLLM(model);

		const retriever = new ContextualCompressionRetriever({
			baseCompressor,
			baseRetriever,
		});

		return {
			response: logWrapper(retriever, this),
		};
	}
}
