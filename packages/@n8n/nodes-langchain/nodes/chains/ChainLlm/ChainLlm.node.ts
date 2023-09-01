import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { LLMChain } from 'langchain/chains';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import { PromptTemplate } from 'langchain';
import { getAndValidateSupplyInput } from '../../../utils/getAndValidateSupplyInput';

async function getChain(context: IExecuteFunctions, query: string) {
	const llm = (await getAndValidateSupplyInput(
		context,
		'languageModel',
		true,
	)) as BaseLanguageModel;
	const prompt = PromptTemplate.fromTemplate(query);

	const chain = new LLMChain({ llm, prompt });
	const response = await chain.call({ query });

	return response;
}

export class ChainLlm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LLM Chain',
		name: 'chainLlm',
		icon: 'fa:link',
		group: ['transform'],
		version: 1,
		description: 'A simple chain to prompt LLM',
		defaults: {
			name: 'LLM Chain',
			color: '#408012',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Chains'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'languageModel'],
		inputNames: ['', 'Language Model'],
		outputs: ['main'],
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
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing LLM Chain');
		const items = this.getInputData();
		const runMode = this.getNodeParameter('mode', 0) as string;

		const returnData: INodeExecutionData[] = [];
		if (runMode === 'runOnceForAllItems') {
			const prompt = this.getNodeParameter('prompt', 0) as string;
			const response = await getChain(this, prompt);

			return this.prepareOutputData([{ json: { response } }]);
		}
		// Run for each item
		for (let i = 0; i < items.length; i++) {
			const prompt = this.getNodeParameter('query', i) as string;
			const response = await getChain(this, prompt);

			returnData.push({ json: { response } });
		}
		return this.prepareOutputData(returnData);
	}
}
