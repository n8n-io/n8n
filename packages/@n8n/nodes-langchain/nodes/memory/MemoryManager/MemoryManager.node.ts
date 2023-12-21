/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import type { BaseChatMemory } from 'langchain/memory';
import { AIMessage, SystemMessage, HumanMessage, type BaseMessage } from 'langchain/schema';

type MessageRole = 'ai' | 'system' | 'user';
interface MessageRecord {
	type: MessageRole;
	message: string;
}

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

		return simplified;
	});
	return transformedMessages;
}

export class MemoryManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chat Memory Manager',
		name: 'memoryManager',
		icon: 'fa:database',
		group: ['transform'],
		version: 1,
		description: 'Massage chat messages memory and use it in the workflow',
		defaults: {
			name: 'Chat Memory Manager',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Miscellaneous'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorymanager/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: '',
				type: NodeConnectionType.Main,
			},
			{
				displayName: 'Memory',
				type: NodeConnectionType.AiMemory,
				required: true,
				maxConnections: 1,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [
			{
				displayName: '',
				type: NodeConnectionType.Main,
			},
		],
		properties: [
			{
				displayName: 'Operation Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				default: 'load',
				options: [
					{
						name: 'Get Many Messages',
						description: 'Retrieve chat messages from connected memory',
						value: 'load',
					},
					{
						name: 'Insert Messages',
						description: 'Insert chat messages into connected memory',
						value: 'insert',
					},
					{
						name: 'Delete Messages',
						description: 'Delete chat messages from connected memory',
						value: 'delete',
					},
				],
			},
			{
				displayName: 'Insert Mode',
				name: 'insertMode',
				type: 'options',
				// Detailed description of the field:
				description:
					'Determines how new messages are inserted into the memory. You can choose between "Insert Messages", which adds messages alongside existing ones, and "Override All Messages", which replaces the current memory with new messages.',
				noDataExpression: true,
				default: 'insert',
				options: [
					{
						name: 'Insert Messages',
						value: 'insert',
					},
					{
						name: 'Override All Messages',
						value: 'override',
					},
				],
				displayOptions: {
					show: {
						mode: ['insert'],
					},
				},
			},
			{
				displayName: 'Delete Mode',
				name: 'deleteMode',
				type: 'options',
				description:
					'Configures how messages are deleted from memory. "Last N" will delete the last N messages, while "All Messages" will clear all messages from the memory.',
				noDataExpression: true,
				default: 'lastN',
				options: [
					{
						name: 'Last N',
						description: 'Delete the last N messages',
						value: 'lastN',
					},
					{
						name: 'All Messages',
						description: 'Delete all messages',
						value: 'all',
					},
				],
				displayOptions: {
					show: {
						mode: ['delete'],
					},
				},
			},
			{
				displayName: 'Chat Messages',
				name: 'messages',
				description: 'Chat messages to insert into memory',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add message',
				options: [
					{
						name: 'messageValues',
						displayName: 'Message',
						values: [
							{
								displayName: 'Type Name or ID',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'AI',
										value: 'ai',
									},
									{
										name: 'System',
										value: 'system',
									},
									{
										name: 'User',
										value: 'user',
									},
								],
								default: 'system',
							},
							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								required: true,
								default: '',
							},
						],
					},
				],
				displayOptions: {
					show: {
						mode: ['insert'],
					},
				},
			},
			{
				displayName: 'Messages Count',
				name: 'lastMessagesCount',
				type: 'number',
				description: 'The amount of last messages to delete',
				default: 2,
				displayOptions: {
					show: {
						mode: ['delete'],
						deleteMode: ['lastN'],
					},
				},
			},
			{
				displayName: 'Simplify Output',
				name: 'simplifyOutput',
				type: 'boolean',
				description: 'Whether to simplify the output to only include the sender and the text',
				default: true,
				displayOptions: {
					show: {
						mode: ['load'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const memory = (await this.getInputConnectionData(
			NodeConnectionType.AiMemory,
			0,
		)) as BaseChatMemory;

		const items = this.getInputData();
		const result = [];
		for (let i = 0; i < items.length; i++) {
			const mode = this.getNodeParameter('mode', i) as 'load' | 'insert' | 'delete';

			let messages = [...(await memory.chatHistory.getMessages())];

			if (mode === 'delete') {
				const deleteMode = this.getNodeParameter('deleteMode', i) as 'lastN' | 'all';

				if (deleteMode === 'lastN') {
					const lastMessagesCount = this.getNodeParameter('lastMessagesCount', i) as number;
					if (messages.length >= lastMessagesCount) {
						const newMessages = messages.slice(0, messages.length - lastMessagesCount);

						await memory.chatHistory.clear();
						for (const message of newMessages) {
							await memory.chatHistory.addMessage(message);
						}
					}
				} else {
					await memory.chatHistory.clear();
				}
			}

			if (mode === 'insert') {
				const insertMode = this.getNodeParameter('insertMode', i) as 'insert' | 'override';
				const messagesToInsert = this.getNodeParameter(
					'messages.messageValues',
					i,
					[],
				) as MessageRecord[];

				const templateMapper = {
					ai: AIMessage,
					system: SystemMessage,
					user: HumanMessage,
				};

				if (insertMode === 'override') {
					await memory.chatHistory.clear();
				}

				for (const message of messagesToInsert) {
					const MessageClass = new templateMapper[message.type](message.message);
					await memory.chatHistory.addMessage(MessageClass);
				}
			}

			// Refresh messages from memory
			messages = await memory.chatHistory.getMessages();

			const simplifyOutput = this.getNodeParameter('simplifyOutput', i, false) as boolean;
			if (simplifyOutput && messages) {
				return [
					this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(simplifyMessages(messages)),
						{ itemData: { item: i } },
					),
				];
			}
			const serializedMessages = messages?.map((message) => message.toJSON()) ?? [];

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(serializedMessages as unknown as IDataObject[]),
				{ itemData: { item: i } },
			);
			result.push(...executionData);
		}

		return this.prepareOutputData(result);
	}
}
