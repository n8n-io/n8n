import type { BuiltMemory, MemoryDescriptor, Thread } from '../types/sdk/memory';
import type { AgentDbMessage, AgentMessage } from '../types/sdk/message';
import type { JSONObject } from '../types/utils/json';

export abstract class BaseMemory<TConstructorOptions extends JSONObject = JSONObject>
	implements BuiltMemory
{
	constructor(
		protected readonly name: string,
		protected readonly constructorOptions: TConstructorOptions,
	) {}

	abstract getThread(threadId: string): Promise<Thread | null>;
	abstract saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread>;
	abstract deleteThread(threadId: string): Promise<void>;
	abstract getMessages(
		threadId: string,
		opts?: { limit?: number; before?: Date },
	): Promise<AgentDbMessage[]>;
	abstract saveMessages(args: {
		threadId: string;
		resourceId?: string;
		messages: AgentMessage[];
	}): Promise<void>;
	abstract deleteMessages(messageIds: string[]): Promise<void>;
	abstract getWorkingMemory(params: {
		threadId: string;
		resourceId?: string;
	}): Promise<string | null>;
	abstract saveWorkingMemory(
		params: { threadId: string; resourceId?: string },
		content: string,
	): Promise<void>;

	describe(): MemoryDescriptor<TConstructorOptions> {
		return {
			name: this.name,
			constructorName: this.constructor.name,
			connectionParams: this.constructorOptions,
		};
	}
}
