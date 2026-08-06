/* eslint-disable @typescript-eslint/promise-function-async */
import type { BuiltMemory, MemoryDescriptor, Thread } from '../types/sdk/memory';
import type { AgentDbMessage } from '../types/sdk/message';
import type { JSONObject } from '../types/utils/json';

export abstract class BaseMemory<TConstructorOptions extends JSONObject = JSONObject>
	implements BuiltMemory
{
	constructor(
		protected readonly name: string,
		protected readonly constructorOptions: TConstructorOptions,
	) {}

	getThread(_threadId: string): Promise<Thread | null> {
		throw new Error('Method not implemented.');
	}
	saveThread(_thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread> {
		throw new Error('Method not implemented.');
	}
	deleteThread(_threadId: string): Promise<void> {
		throw new Error('Method not implemented.');
	}
	getMessages(
		_threadId: string,
		_opts?: { limit?: number; before?: Date },
	): Promise<AgentDbMessage[]> {
		throw new Error('Method not implemented.');
	}
	saveMessages(_args: {
		threadId: string;
		resourceId: string;
		messages: AgentDbMessage[];
	}): Promise<void> {
		throw new Error('Method not implemented.');
	}
	deleteMessages(_messageIds: string[]): Promise<void> {
		throw new Error('Method not implemented.');
	}

	close?(): Promise<void> {
		throw new Error('Method not implemented.');
	}

	describe(): MemoryDescriptor<TConstructorOptions> {
		return {
			name: this.name,
			constructorName: this.constructor.name,
			connectionParams: this.constructorOptions,
		};
	}
}
