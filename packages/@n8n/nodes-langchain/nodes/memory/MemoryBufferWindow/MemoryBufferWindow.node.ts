/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import type { BufferWindowMemoryInput } from 'langchain/memory';
import { BufferWindowMemory } from 'langchain/memory';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

class MemoryChatBufferSingleton {
	private static instance: MemoryChatBufferSingleton;

	private memoryBuffer: Map<
		string,
		{ buffer: BufferWindowMemory; created: Date; last_accessed: Date }
	>;

	private constructor() {
		this.memoryBuffer = new Map();
	}

	public static getInstance(): MemoryChatBufferSingleton {
		if (!MemoryChatBufferSingleton.instance) {
			MemoryChatBufferSingleton.instance = new MemoryChatBufferSingleton();
		}
		return MemoryChatBufferSingleton.instance;
	}

	public async getMemory(
		sessionKey: string,
		memoryParams: BufferWindowMemoryInput,
	): Promise<BufferWindowMemory> {
		await this.cleanupStaleBuffers();

		let memoryInstance = this.memoryBuffer.get(sessionKey);
		if (memoryInstance) {
			memoryInstance.last_accessed = new Date();
		} else {
			const newMemory = new BufferWindowMemory(memoryParams);

			memoryInstance = {
				buffer: newMemory,
				created: new Date(),
				last_accessed: new Date(),
			};
			this.memoryBuffer.set(sessionKey, memoryInstance);
		}
		return memoryInstance.buffer;
	}

	private async cleanupStaleBuffers(): Promise<void> {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

		for (const [key, memoryInstance] of this.memoryBuffer.entries()) {
			if (memoryInstance.last_accessed < oneHourAgo) {
				await this.memoryBuffer.get(key)?.buffer.clear();
				this.memoryBuffer.delete(key);
			}
		}
	}
}

export class MemoryBufferWindow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Window Buffer Memory (easiest)',
		name: 'memoryBufferWindow',
		icon: 'fa:database',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Stores in n8n memory, so no credentials required',
		defaults: {
			name: 'Window Buffer Memory',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
			{
				displayName: 'Session Key',
				name: 'sessionKey',
				type: 'string',
				default: 'chat_history',
				description: 'The key to use to store the memory in the workflow data',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Session ID',
				name: 'sessionKey',
				type: 'string',
				default: '={{ $json.sessionId }}',
				description: 'The key to use to store the memory',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			},
			{
				displayName: 'Context Window Length',
				name: 'contextWindowLength',
				type: 'number',
				default: 5,
				description: 'The number of previous messages to consider for context',
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const sessionKey = this.getNodeParameter('sessionKey', itemIndex) as string;
		const contextWindowLength = this.getNodeParameter('contextWindowLength', itemIndex) as number;
		const workflowId = this.getWorkflow().id;
		const memoryInstance = MemoryChatBufferSingleton.getInstance();

		const memory = await memoryInstance.getMemory(`${workflowId}__${sessionKey}`, {
			k: contextWindowLength,
			inputKey: 'input',
			memoryKey: 'chat_history',
			outputKey: 'output',
			returnMessages: true,
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
