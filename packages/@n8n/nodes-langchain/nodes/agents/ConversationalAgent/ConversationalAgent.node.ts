import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import type { Tool } from 'langchain/tools';
import type { BaseChatMemory } from 'langchain/memory';

export class ConversationalAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Conversational Agent',
		name: 'conversationalAgent',
		icon: 'fa:robot',
		group: ['transform'],
		version: 1,
		description:
			'Recalls previous dialogues from its memory and strategically select tools to accomplish a given task',
		defaults: {
			name: 'Conversational Agent',
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
				filter: {
					nodes: ['@n8n/nodes-langchain.lmChatOpenAi'],
				},
				required: true,
			},
			{
				displayName: 'Memory',
				maxConnections: 1,
				type: 'memory',
				required: false,
			},
			{
				displayName: 'Tools',
				type: 'tool',
				required: false,
			},
		],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '={{ $json.input }}',
			},
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
				displayName: 'System Message',
				name: 'systemMessage',
				type: 'string',
				default:
					'Do your best to answer the questions. Feel free to use any tools available to look up relevant information, only if necessary.',
				description: 'The message that will be sent to the agent before the conversation starts',
				typeOptions: {
					rows: 3,
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Vector Store QA Chain');
		const runMode = this.getNodeParameter('mode', 0) as string;

		const model = (await this.getInputConnectionData('languageModel', 0)) as BaseLanguageModel;
		const memory = (await this.getInputConnectionData('memory', 0)) as BaseChatMemory | undefined;
		const tools = (await this.getInputConnectionData('tool', 0)) as Tool[];

		const agentExecutor = await initializeAgentExecutorWithOptions(tools, model, {
			// Passing "chat-conversational-react-description" as the agent type
			// automatically creates and uses BufferMemory with the executor.
			// If you would like to override this, you can pass in a custom
			// memory option, but the memoryKey set on it must be "chat_history".
			agentType: 'chat-conversational-react-description',
			memory,
			agentArgs: {
				systemMessage: this.getNodeParameter('systemMessage', 0) as string,
			},
		});

		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		if (runMode === 'runOnceForAllItems') {
			const input = this.getNodeParameter('text', 0) as string;
			const response = await agentExecutor.call({ input });

			return this.prepareOutputData([{ json: response }]);
		}

		// Run for each item
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const input = this.getNodeParameter('text', itemIndex) as string;

			const response = await agentExecutor.call({ input });

			returnData.push({ json: response });
		}

		return this.prepareOutputData(returnData);
	}
}
