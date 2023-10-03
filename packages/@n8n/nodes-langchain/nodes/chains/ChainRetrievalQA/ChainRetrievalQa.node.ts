import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { RetrievalQAChain } from 'langchain/chains';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import type { BaseRetriever } from 'langchain/schema/retriever';

export class ChainRetrievalQa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Retrieval Q&A Chain',
		name: 'chainRetrievalQa',
		icon: 'fa:link',
		group: ['transform'],
		version: 1,
		description: 'Retrieves answers to queries based on retrieved documents',
		defaults: {
			name: 'Retrieval Q&A Chain',
			color: '#909298',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Chains'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainretrievalqa/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			NodeConnectionType.Main,
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
		outputs: [NodeConnectionType.Main],
		credentials: [],
		properties: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				required: true,
				default: '={{ $json.input }}',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Retrieval QA Chain');

		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const retriever = (await this.getInputConnectionData(
			NodeConnectionType.AiRetriever,
			0,
		)) as BaseRetriever;

		const items = this.getInputData();
		const chain = RetrievalQAChain.fromLLM(model, retriever);

		const returnData: INodeExecutionData[] = [];

		// Run for each item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const query = this.getNodeParameter('query', itemIndex) as string;

			if (query === undefined) {
				throw new NodeOperationError(
					this.getNode(),
					'No value for the required parameter "Query" was returned.',
				);
			}

			const response = await chain.call({ query });
			returnData.push({ json: { response } });
		}
		return this.prepareOutputData(returnData);
	}
}
