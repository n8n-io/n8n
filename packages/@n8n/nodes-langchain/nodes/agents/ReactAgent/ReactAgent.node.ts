import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import type { BaseLanguageModel } from 'langchain/base_language';
import type { Tool } from 'langchain/tools';
import type { BaseOutputParser } from 'langchain/schema/output_parser';
import { PromptTemplate } from 'langchain/prompts';
import { CombiningOutputParser } from 'langchain/output_parsers';
import { BaseChatModel } from 'langchain/chat_models/base';

export class ReactAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ReAct Agent',
		name: 'reactAgent',
		icon: 'fa:robot',
		group: ['transform'],
		version: 1,
		description:
			'Leverages the ReAct framework to retrieve past dialogues from memory and strategically chooses tools to fulfill a specific task',
		defaults: {
			name: 'ReAct Agent',
			color: '#404040',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Agents'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			'main',
			{
				displayName: 'Language Model',
				maxConnections: 1,
				type: 'languageModel',
				required: true,
			},
			{
				displayName: 'Tools',
				type: 'tool',
				required: false,
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
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '={{ $json.input }}',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing ReAct Agent');
		const runMode = this.getNodeParameter('mode', 0) as string;

		const model = (await this.getInputConnectionData('languageModel', 0)) as
			| BaseLanguageModel
			| BaseChatModel;

		const tools = (await this.getInputConnectionData('tool', 0)) as Tool[];
		const outputParsers = (await this.getInputConnectionData(
			'outputParser',
			0,
		)) as BaseOutputParser[];

		const agentExecutor = await initializeAgentExecutorWithOptions(tools, model, {
			agentType:
				model instanceof BaseChatModel
					? 'chat-zero-shot-react-description'
					: 'zero-shot-react-description',
		});

		const returnData: INodeExecutionData[] = [];

		let outputParser: BaseOutputParser | undefined;
		let prompt: PromptTemplate | undefined;
		if (outputParsers.length) {
			outputParser =
				outputParsers.length === 1 ? outputParsers[0] : new CombiningOutputParser(...outputParsers);

			const formatInstructions = outputParser.getFormatInstructions();

			prompt = new PromptTemplate({
				template: '{input}\n{formatInstructions}',
				inputVariables: ['input'],
				partialVariables: { formatInstructions },
			});
		}

		const items = this.getInputData();

		let itemCount = items.length;
		if (runMode === 'runOnceForAllItems') {
			itemCount = 1;
		}

		// Run for each item
		for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
			let input = this.getNodeParameter('text', itemIndex) as string;

			if (prompt) {
				input = (await prompt.invoke({ input })).value;
			}

			let response = await agentExecutor.call({ input, outputParsers });

			if (outputParser) {
				response = { output: await outputParser.parse(response.output as string) };
			}

			returnData.push({ json: response });
		}

		return this.prepareOutputData(returnData);
	}
}
