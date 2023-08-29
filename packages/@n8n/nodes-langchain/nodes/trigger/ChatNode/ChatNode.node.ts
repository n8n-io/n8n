import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	SupplyData,
} from 'n8n-workflow';
import { logWrapper } from '../../../utils/logWrapper';
import { BaseChatMemory } from 'langchain/memory';
// import { BaseMessage } from 'langchain/schema';
// import { Serialized } from 'langchain/dist/load/serializable';
// import { getAndValidateSupplyInput } from '../../../utils/getAndValidateSupplyInput';

export class N8nChatProvider {
	private memory: BaseChatMemory | null = null;
	// private messages: BaseMessage[] = [];

	async refreshChat(memory: BaseChatMemory,): Promise<{ type: string, text: string }[]> {
		this.memory = memory;
		const serializedMessages = (await memory.chatHistory.getMessages()).map((message) => {
			const serializedMessage = message.toJSON();

			const payload = {
				type: serializedMessage.id.join('.'),
				text: message.content,
			}

			return payload;
		});

		return serializedMessages;
	}

	getMemory(): BaseChatMemory | null {
			return this.memory;
	}
}

export class ChatNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Agent Chat',
		name: 'chatNode',
		icon: 'fa:comments',
		group: ['transform'],
		version: 1,
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'Agent Chat',
			color: '#909298',
		},

		inputs: [],
		outputs: ['chat'],
		properties: [
			{
				displayName: 'Launch chat workflow by sending a message to the chat node.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
		description: ''
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		// const chat = await getAndValidateSupplyInput(this, 'chat', true) as any;
		// console.log("🚀 ~ file: ChatNode.node.ts:58 ~ ChatNode ~ supplyData ~ chat:", chat)
		const chatInstance = new N8nChatProvider();
		const executionId = this.getExecutionId
		return {
			// @ts-ignore
			response: logWrapper(chatInstance, this),
		};
	}

	// async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
	// 	const manualTriggerFunction = async () => {
	// 		this.emit([this.helpers.returnJsonArray([{}])]);
	// 	};

	// 	return {
	// 		manualTriggerFunction,
	// 	};
	// }
}
