/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import type { BaseChatMemory } from 'langchain/memory';

export class MemoryChatRetriever implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chat Messages Retriever',
		name: 'memoryChatRetriever',
		icon: 'fa:database',
		group: ['transform'],
		version: 1,
		description: 'Retrieve chat messages from memory and use them in the workflow',
		defaults: {
			name: 'Memory Chat Retriever',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			'main',
			{
				displayName: 'Memory',
				maxConnections: 1,
				type: 'memory',
				required: true,
			},
		],
		inputNames: ['', 'Memory'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main'],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Chat Memory Retriever');

		const memory = (await this.getInputConnectionData('memory', 0)) as BaseChatMemory | undefined;
		const messages = await memory?.chatHistory.getMessages();
		const serializedMessages = messages?.map((message) => message.toJSON());

		return this.prepareOutputData([{ json: { messages: serializedMessages } }]);
	}
}
