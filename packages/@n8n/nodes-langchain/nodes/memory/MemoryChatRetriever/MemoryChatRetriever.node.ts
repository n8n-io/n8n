/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import type { BaseChatMemory } from 'langchain/memory';
import type { BaseMessage } from 'langchain/schema';

function simplifyMessages(messages: BaseMessage[]) {
	const chunkedMessages = [];
	for (let i = 0; i < messages.length; i += 2) {
		chunkedMessages.push([messages[i], messages[i + 1]]);
	}

	const transformedMessages = chunkedMessages.map((exchange) => {
		const simplified = {
			[exchange[0]._getType()]: exchange[0].content,
		};

		if (exchange[1]) {
			simplified[exchange[1]._getType()] = exchange[1].content;
		}

		return {
			json: simplified,
		};
	});
	return transformedMessages;
}

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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main'],
		properties: [
			{
				displayName: 'Simplify Output',
				name: 'simplifyOutput',
				type: 'boolean',
				description: 'Whether to simplify the output to only include the sender and the text',
				default: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Chat Memory Retriever');

		const memory = (await this.getInputConnectionData('memory', 0)) as BaseChatMemory | undefined;
		const simplifyOutput = this.getNodeParameter('simplifyOutput', 0) as boolean;

		const messages = await memory?.chatHistory.getMessages();

		if (simplifyOutput && messages) {
			return this.prepareOutputData(simplifyMessages(messages));
		}

		const serializedMessages =
			messages?.map((message) => {
				const serializedMessage = message.toJSON();
				return { json: serializedMessage as unknown as IDataObject };
			}) ?? [];

		return this.prepareOutputData(serializedMessages);
	}
}
