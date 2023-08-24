import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { VectorDBQAChain } from 'langchain/chains';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import { VectorStore } from 'langchain/vectorstores/base';

export class ChainVectorStoreQA implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Vector Store QA Chain',
		name: 'chainVectorStoreQa',
		icon: 'fa:link',
		group: ['transform'],
		version: 1,
		description: 'LangChain',
		defaults: {
			name: 'LangChain - Vector Store QA',
			color: '#412012',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'vectorStore', 'languageModel'],
		inputNames: ['','Vector Store', 'Language Model'],
		outputs: ['main', 'chain'],
		outputNames: ['', 'Chain'],
		credentials: [],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Run Once for All Items',
						value: 'runOnceForAllItems',
						description: 'Run this chain only once, no matter how many input items there are',
					},
					{
						name: 'Run Once for Each Item',
						value: 'runOnceForEachItem',
						description: 'Run this chain as many times as there are input items',
					},
				],
				default: 'runOnceForAllItems',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Vector Store QA Chain')
		let vectorStore: VectorStore;
		const runMode = this.getNodeParameter('mode', 0) as string;
		const languageModelNodes = await this.getInputConnectionData('languageModel', 0);

		if (languageModelNodes.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one Language Model has to be connected!',
			);
		} else if (languageModelNodes.length > 1) {
			throw new NodeOperationError(
				this.getNode(),
				'Only one Language Model is allowed to be connected!',
			);
		}
		const model = languageModelNodes[0].response as BaseLanguageModel;

		const vectorStoreNodes = await this.getInputConnectionData('vectorStore', 0);
		if (vectorStoreNodes.length > 1) {
			throw new NodeOperationError(this.getNode(), 'Only one Vector Store is allowed to be connected!');
		}

		vectorStore = vectorStoreNodes[0].response as VectorStore;

		const chain = VectorDBQAChain.fromLLM(model, vectorStore, { k: 4});

		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		chain.k = this.getNodeParameter('topK', 0, 4) as number;

		if (runMode === 'runOnceForAllItems') {
			const query = this.getNodeParameter('query', 0) as string;
			const response = await chain.call({ query })
			return this.prepareOutputData([{ json: { response } }]);
		}

		// Run for each item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const query = this.getNodeParameter('query', itemIndex) as string;

			const response = await chain.call({ query,  })
			returnData.push({ json: { response } });
		}

		return this.prepareOutputData(returnData);
	}
}
