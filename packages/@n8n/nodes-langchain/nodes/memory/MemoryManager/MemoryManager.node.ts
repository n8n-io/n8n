/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { MessageContent, BaseMessage } from '@langchain/core/messages';
import { AIMessage, SystemMessage, HumanMessage } from '@langchain/core/messages';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

type MessageRole = 'ai' | 'system' | 'user';
interface MessageRecord {
	type: MessageRole;
	message: string;
	hideFromUI: boolean;
}

export function simplifyMessages(messages: BaseMessage[]): Array<Record<string, MessageContent>> {
	if (messages.length === 0) return [];

	const result: Array<Record<string, MessageContent>> = [];
	let index = 0;

	while (index < messages.length) {
		const currentGroup: Record<string, MessageContent> = {};

		do {
			const message = messages[index];
			const messageType = message.getType();

			if (messageType in currentGroup) {
				break;
			}

			currentGroup[messageType] = message.content;
			index++;
		} while (index < messages.length);

		result.push(currentGroup);
	}

	return result;
}

const prepareOutputSetup = (ctx: IExecuteFunctions, version: number, memory: BaseChatMemory) => {
	if (version === 1) {
		//legacy behavior of insert and delete for version 1
		return async (i: number) => {
			const messages = await memory.chatHistory.getMessages();

			const serializedMessages = messages?.map((message) => message.toJSON()) ?? [];

			const executionData = ctx.helpers.constructExecutionMetaData(
				ctx.helpers.returnJsonArray(serializedMessages as unknown as IDataObject[]),
				{ itemData: { item: i } },
			);

			return executionData;
		};
	}
	return async (i: number) => {
		return [
			{
				json: { success: true },
				pairedItem: { item: i },
			},
		];
	};
};

export class MemoryManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chat Memory Manager',
		name: 'memoryManager',
		icon: 'fa:database',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Manage chat messages memory and use it in the workflow',
		defaults: {
			name: 'Chat Memory Manager',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Miscellaneous', 'Root Nodes'],
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
				type: NodeConnectionTypes.Main,
			},
			{
				displayName: 'Memory',
				type: NodeConnectionTypes.AiMemory,
				required: true,
				maxConnections: 1,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [
			{
				displayName: '',
				type: NodeConnectionTypes.Main,
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
				description: 'Choose how new messages are inserted into the memory',
				noDataExpression: true,
				default: 'insert',
				options: [
					{
						name: 'Insert Messages',
						value: 'insert',
						description: 'Add messages alongside existing ones',
					},
					{
						name: 'Override All Messages',
						value: 'override',
						description: 'Replace the current memory with new messages',
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
				description: 'How messages are deleted from memory',
				noDataExpression: true,
				default: 'lastN',
				options: [
					{
						name: 'Last N',
						value: 'lastN',
						description: 'Delete the last N messages',
					},
					{
						name: 'All Messages',
						value: 'all',
						description: 'Clear all messages from memory',
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
							{
								displayName: 'Hide Message in Chat',
								name: 'hideFromUI',
								type: 'boolean',
								required: true,
								default: false,
								description: 'Whether to hide the message from the chat UI',
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
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Group Messages',
						name: 'groupMessages',
						type: 'boolean',
						default: true,
						description:
							'Whether to group messages into a single item or return each message as a separate item',
					},
				],
				displayOptions: {
					show: {
						mode: ['load'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const nodeVersion = this.getNode().typeVersion;
		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0, 'load') as 'load' | 'insert' | 'delete';
		const memory = (await this.getInputConnectionData(
			NodeConnectionTypes.AiMemory,
			0,
		)) as BaseChatMemory;

		const prepareOutput = prepareOutputSetup(this, nodeVersion, memory);

		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const messages = await memory.chatHistory.getMessages();

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

				returnData.push(...(await prepareOutput(i)));
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

					if (message.hideFromUI) {
						MessageClass.additional_kwargs.hideFromUI = true;
					}

					await memory.chatHistory.addMessage(MessageClass);
				}

				returnData.push(...(await prepareOutput(i)));
			}

			if (mode === 'load') {
				const simplifyOutput = this.getNodeParameter('simplifyOutput', i, false) as boolean;
				const options = this.getNodeParameter('options', i);

				//Load mode, legacy behavior for version 1, buggy - outputs only for single input item
				if (simplifyOutput && messages.length && nodeVersion === 1) {
					const groupMessages = options.groupMessages as boolean;
					const output = simplifyMessages(messages);

					return [
						this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(
								groupMessages ? [{ messages: output, messagesCount: output.length }] : output,
							),
							{ itemData: { item: i } },
						),
					];
				}

				let groupMessages = true;
				//disable grouping if explicitly set to false
				if (options.groupMessages === false) {
					groupMessages = false;
				}
				//disable grouping if not set and node version is 1 (legacy behavior)
				if (options.groupMessages === undefined && nodeVersion === 1) {
					groupMessages = false;
				}

				let output: IDataObject[] =
					(simplifyOutput
						? simplifyMessages(messages)
						: (messages?.map((message) => message.toJSON()) as unknown as IDataObject[])) ?? [];

				if (groupMessages) {
					output = [{ messages: output, messagesCount: output.length }];
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(output),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			}
		}

		return [returnData];
	}
}
