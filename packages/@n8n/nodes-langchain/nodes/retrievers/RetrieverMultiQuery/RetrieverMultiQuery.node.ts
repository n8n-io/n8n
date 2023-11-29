/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { MultiQueryRetriever } from 'langchain/retrievers/multi_query';
import type { BaseLanguageModel } from 'langchain/base_language';
import type { BaseRetriever } from 'langchain/schema/retriever';

import { logWrapper } from '../../../utils/logWrapper';

export class RetrieverMultiQuery implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MultiQuery Retriever',
		name: 'retrieverMultiQuery',
		icon: 'fa:box-open',
		group: ['transform'],
		version: 1,
		description:
			'Automates prompt tuning, generates diverse queries and expands document pool for enhanced retrieval.',
		defaults: {
			name: 'MultiQuery Retriever',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Retrievers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.retrievermultiquery/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionType.AiLanguageModel,
				required: true,
			},
			{
				displayName: 'Retriever',
				maxConnections: 1,
				type: NodeConnectionType.AiRetriever,
				required: true,
			},
		],
		outputs: [
			{
				displayName: 'Retriever',
				maxConnections: 1,
				type: NodeConnectionType.AiRetriever,
			},
		],
		properties: [
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Query Count',
						name: 'queryCount',
						default: 3,
						typeOptions: { minValue: 1 },
						description: 'Number of different versions of the given question to generate',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.verbose('Supplying data for MultiQuery Retriever');

		const options = this.getNodeParameter('options', itemIndex, {}) as { queryCount?: number };

		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			itemIndex,
		)) as BaseLanguageModel;

		const baseRetriever = (await this.getInputConnectionData(
			NodeConnectionType.AiRetriever,
			itemIndex,
		)) as BaseRetriever;

		// TODO: Add support for parserKey

		const retriever = MultiQueryRetriever.fromLLM({
			llm: model,
			retriever: baseRetriever,
			...options,
		});

		return {
			response: logWrapper(retriever, this),
		};
	}
}
