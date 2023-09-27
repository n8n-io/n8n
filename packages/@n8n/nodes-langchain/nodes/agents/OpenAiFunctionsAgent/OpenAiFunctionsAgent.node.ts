import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import type { Tool } from 'langchain/tools';
import type { BaseOutputParser } from 'langchain/schema/output_parser';
import { PromptTemplate } from 'langchain/prompts';
import { CombiningOutputParser } from 'langchain/output_parsers';
import type { BaseChatMemory } from 'langchain/memory';
import type { OpenAIChat } from 'langchain/dist/llms/openai-chat';

export class OpenAiFunctionsAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAI Functions Agent',
		name: 'openAiFunctionsAgent',
		icon: 'fa:robot',
		group: ['transform'],
		version: 1,
		description:
			"Utilizes OpenAI's Function Calling feature to select the appropriate tool and arguments for execution",
		defaults: {
			name: 'OpenAI Functions Agent',
			color: '#404040',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Agents'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.openaifunctionsagent/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			NodeConnectionType.Main,
			{
				displayName: 'Language Model',
				maxConnections: 1,
				type: NodeConnectionType.AiLanguageModel,
				filter: {
					nodes: ['@n8n/n8n-nodes-langchain.lmChatOpenAi'],
				},
				required: true,
			},
			{
				displayName: 'Memory',
				maxConnections: 1,
				type: NodeConnectionType.AiMemory,
				required: false,
			},
			{
				displayName: 'Tools',
				type: NodeConnectionType.AiTool,
				required: false,
			},
			{
				displayName: 'Output Parser',
				type: NodeConnectionType.AiOutputParser,
				required: false,
			},
		],
		outputs: [NodeConnectionType.Main],
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
		this.logger.verbose('Executing OpenAi Functions Agent');
		const runMode = this.getNodeParameter('mode', 0) as string;

		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as OpenAIChat;
		const memory = (await this.getInputConnectionData(NodeConnectionType.AiMemory, 0)) as
			| BaseChatMemory
			| undefined;
		const tools = (await this.getInputConnectionData(NodeConnectionType.AiTool, 0)) as Tool[];
		const outputParsers = (await this.getInputConnectionData(
			NodeConnectionType.AiOutputParser,
			0,
		)) as BaseOutputParser[];

		const agentExecutor = await initializeAgentExecutorWithOptions(tools, model, {
			agentType: 'openai-functions',
		});

		if (memory) {
			agentExecutor.memory = memory;
		}

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
