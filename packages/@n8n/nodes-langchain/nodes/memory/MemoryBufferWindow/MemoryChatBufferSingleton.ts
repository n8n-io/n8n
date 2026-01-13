import type { BufferWindowMemoryInput } from '@langchain/classic/memory';
import { BufferWindowMemory } from '@langchain/classic/memory';

export class MemoryChatBufferSingleton {
	private static instance: MemoryChatBufferSingleton;

	private memoryBuffer: Map<
		string,
		{ buffer: BufferWindowMemory; created: Date; last_accessed: Date }
	>;

	private constructor() {
		this.memoryBuffer = new Map();
	}

	static getInstance(): MemoryChatBufferSingleton {
		if (!MemoryChatBufferSingleton.instance) {
			MemoryChatBufferSingleton.instance = new MemoryChatBufferSingleton();
		}
		return MemoryChatBufferSingleton.instance;
	}

	async getMemory(
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
