import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import type { BaseLanguageModel } from 'langchain/base_language';
import { PromptTemplate } from 'langchain/prompts';
import type { BaseOutputParser } from 'langchain/schema/output_parser';
import { CombiningOutputParser } from 'langchain/output_parsers';

async function getChain(context: IExecuteFunctions, query: string): Promise<unknown[]> {
	const llm = (await context.getInputConnectionData('languageModel', 0)) as BaseLanguageModel;
	const outputParsers = (await context.getInputConnectionData(
		'outputParser',
		0,
	)) as BaseOutputParser[];

	let prompt: PromptTemplate;

	let outputParser: BaseOutputParser | undefined;
	if (outputParsers.length) {
		if (outputParsers.length === 1) {
			outputParser = outputParsers[0];
		} else {
			outputParser = new CombiningOutputParser(...outputParsers);
		}
		const formatInstructions = outputParser.getFormatInstructions();

		prompt = new PromptTemplate({
			template: query + '\n{formatInstructions}',
			inputVariables: [],
			partialVariables: { formatInstructions },
		});
	} else {
		prompt = PromptTemplate.fromTemplate(query);
	}

	let chain = prompt.pipe(llm);

	if (outputParser) {
		chain = chain.pipe(outputParser);
	}

	const response = (await chain.invoke({ query })) as string | string[];

	return Array.isArray(response) ? response : [response];
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
			color: '#909298',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Chains'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			'main',
			{
				displayName: 'Model',
				maxConnections: 1,
				type: 'languageModel',
				required: true,
			},
			{
				displayName: 'Output Parser',
				type: 'outputParser',
				required: false,
			},
		],
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
				default: '={{ $json.input }}',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing LLM Chain');
		const items = this.getInputData();
		const runMode = this.getNodeParameter('mode', 0) as string;

		const returnData: INodeExecutionData[] = [];

		let itemCount = items.length;
		if (runMode === 'runOnceForAllItems') {
			itemCount = 1;
		}

		for (let i = 0; i < itemCount; i++) {
			const prompt = this.getNodeParameter('prompt', i) as string;
			const responses = await getChain(this, prompt);

			responses.forEach((response) => {
				let data: IDataObject;
				if (typeof response === 'string') {
					data = {
						response: {
							text: response.trim(),
						},
					};
				} else if (Array.isArray(response)) {
					data = {
						data: response,
					};
				} else if (response instanceof Object) {
					data = response as IDataObject;
				} else {
					data = {
						response: {
							text: response,
						},
					};
				}

				returnData.push({
					json: data,
				});
			});
		}

		return [returnData];
	}
}
