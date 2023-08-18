import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { RetrievalQAChain } from 'langchain/chains';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import { BaseRetriever } from 'langchain/schema/retriever';

export class ChainRetrievalQA implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Retrieval QA Chain',
		name: 'chainRetrievalQa',
		icon: 'fa:link',
		group: ['transform'],
		version: 1,
		description: 'LangChain',
		defaults: {
			name: 'LangChain - Retrieval QA Chain',
			color: '#408080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'vectorRetriever', 'languageModel'],
		inputNames: ['','Vector Retriever', 'Language Model'],
		outputs: ['main'],
		// outputNames: ['', 'Chain'],
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		console.log('Execute Retrieval QA Chain');
		let vectorRetriever1: BaseRetriever;
		const languageModelNodes = await this.getInputConnectionData(0, 0, 'languageModel');

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

		const vectorRetrieverNodes = await this.getInputConnectionData(0, 0, 'vectorRetriever');
		if (vectorRetrieverNodes.length === 1) {
			vectorRetriever1 = vectorRetrieverNodes[0].response as BaseRetriever;
		} else if (languageModelNodes.length > 1) {
			throw new NodeOperationError(this.getNode(), 'Only one Vector Retriever is allowed to be connected!');
		}

		const chain = RetrievalQAChain.fromLLM(model, vectorRetriever1!);
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const runMode = this.getNodeParameter('mode', 0) as string;

		if(runMode === 'runOnceForAllItems') {
			const query = this.getNodeParameter('query', 0) as string;
			const response = await chain.call({ query })

			return this.prepareOutputData([{ json: { response } }]);
		}
		// Run for each item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const query = this.getNodeParameter('query', itemIndex) as string;

			const response = await chain.call({ query })
			returnData.push({ json: { response } });
		}
		return this.prepareOutputData(returnData);
	}
}
