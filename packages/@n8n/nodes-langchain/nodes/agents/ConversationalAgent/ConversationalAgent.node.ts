import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { Tool } from 'langchain/tools';
import { BufferMemory } from 'langchain/memory';
import type { InitializeAgentExecutorOptions } from 'langchain/agents';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import type { BaseLanguageModel } from 'langchain/dist/base_language';
import { BaseChatMessageHistory } from 'langchain/schema';

export class ConversationalAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Conversational Agent',
		name: 'conversationalAgent',
		icon: 'fa:robot',
		group: ['transform'],
		version: 1,
		description: 'Conversational Agent',
		defaults: {
			name: 'Conversational Agent',
			color: '#404040',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Agents'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'tool', 'memory', 'languageModel'],
		inputNames: ['', 'Tools', 'Memory', 'Model'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '={{ $json.input }}',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let memory: BufferMemory | undefined;

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

		const memoryNodes = await this.getInputConnectionData('memory', 0);
		if (memoryNodes.length === 1) {
			memory = new BufferMemory({
				memoryKey: 'chat_history',
				returnMessages: true,
				chatHistory: memoryNodes[0].response as BaseChatMessageHistory,
			});
		} else if (languageModelNodes.length > 1) {
			throw new NodeOperationError(this.getNode(), 'Only one Memory is allowed to be connected!');
		}

		const toolNodes = await this.getInputConnectionData('tool', 0);
		const tools = toolNodes.map((connectedNode) => {
			return connectedNode.response as Tool;
		});

		const options: InitializeAgentExecutorOptions = {
			agentType: 'chat-conversational-react-description',
			memory,
		};

		const executor = await initializeAgentExecutorWithOptions(tools, model, options);

		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const text = this.getNodeParameter('text', itemIndex) as string;

			const response = await executor.call({
				input: text,
			});

			returnData.push({ json: response });
		}
		return this.prepareOutputData(returnData);
	}
}
