import type { BufferWindowMemoryInput } from 'langchain/memory';
import { BufferWindowMemory } from 'langchain/memory';
import {
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
export declare class MemoryChatBufferSingleton {
	private static instance;
	private memoryBuffer;
	private constructor();
	static getInstance(): MemoryChatBufferSingleton;
	getMemory(sessionKey: string, memoryParams: BufferWindowMemoryInput): Promise<BufferWindowMemory>;
	private cleanupStaleBuffers;
}
export declare class MemoryBufferWindow implements INodeType {
	description: INodeTypeDescription;
	supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;
}
