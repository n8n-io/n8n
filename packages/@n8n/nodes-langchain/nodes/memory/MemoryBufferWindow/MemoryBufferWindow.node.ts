/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
// import { logWrapper } from '../../../utils/logWrapper';
import { BufferWindowMemory, BufferWindowMemoryInput } from 'langchain/memory';
import { logWrapper } from '../../../utils/logWrapper';

class MemoryBufferSingleton {
	private static instance: MemoryBufferSingleton;
	private memoryBuffer: Map<string, { buffer: BufferWindowMemory, created: Date, last_accessed: Date }>;

	private constructor() {
		this.memoryBuffer = new Map();
	}

	public static getInstance(): MemoryBufferSingleton {
		if (!MemoryBufferSingleton.instance) {
			MemoryBufferSingleton.instance = new MemoryBufferSingleton();
		}
		return MemoryBufferSingleton.instance;
	}

	public async getMemory(memoryKey: string, memoryParams: BufferWindowMemoryInput): Promise<BufferWindowMemory> {
		await this.cleanupStaleBuffers();

		let memoryInstance = this.memoryBuffer.get(memoryKey);
		if (memoryInstance) {
			console.log(`Memory "${memoryKey}" already exists`);
			memoryInstance.last_accessed = new Date();
		} else {
			const newMemory = new BufferWindowMemory(memoryParams);
			console.log(`Creating new memory "${memoryKey}"`, newMemory)

			memoryInstance = {
				buffer: newMemory,
				created: new Date(),
				last_accessed: new Date()
			};
			this.memoryBuffer.set(memoryKey, memoryInstance);
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
		displayName: 'LangChain - Window Buffer Memory',
		name: 'memoryBufferWindow',
		icon: 'fa:database',
		group: ['transform'],
		version: 1,
		description: 'Window Buffer Memory',
		defaults: {
			name: 'LangChain - Window Buffer Memory',
			color: '#400080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['memory'],
		outputNames: ['Memory'],
		properties: [
			{
				displayName: 'Input Key',
				name: 'inputKey',
				type: 'string',
				default: 'input',
			},
			{
				displayName: 'Memory Key',
				name: 'memoryKey',
				type: 'string',
				default: 'chat_history',
				description: 'The key to use to store the memory in the workflow data',
			},
			{
				displayName: 'Context Window Length',
				name: 'contextWindowLength',
				type: 'number',
				default: 5,
				description: 'The number of previous messages to consider for context',
			}
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const inputKey = this.getNodeParameter('inputKey', 0) as string;
		const memoryKey = this.getNodeParameter('memoryKey', 0) as string;
		const contextWindowLength = this.getNodeParameter('contextWindowLength', 0) as number;

		const memoryInstance = MemoryBufferSingleton.getInstance();

		const memory = await memoryInstance.getMemory(memoryKey, {
			k: contextWindowLength,
			inputKey: inputKey ?? 'input',
			memoryKey: 'chat_history',
			outputKey: 'output',
			returnMessages: true,
		});

		// const messages = memory.chatHistory.getMessages();
		// const documentsStore = await MemoryVectorStore.fromDocuments(documents, embeddings);

		return {
			response: logWrapper(memory, this),
		};
	}
}
