/* eslint-disable @typescript-eslint/promise-function-async */
import { type AgentDbMessage, type AgentMessage, type Thread, BaseMemory } from '@n8n/agents';

/**
 * Sandbox marker for the n8n built-in memory backend.
 *
 * Exposed as part of the virtual `@n8n/agents-utils` package inside the agent
 * sandbox. When user code writes:
 * ```typescript
 * import { N8nMemory } from '@n8n/agents-utils';
 * agent.memory(new N8nMemory());
 * ```
 * the SDK serializes `describe()` into the agent schema. On the host side,
 * `fromSchema()` looks up `'n8n'` in the `memoryRegistry` and returns the
 * real TypeORM-backed `N8nMemory` service.
 */
export class N8nMemoryMarker extends BaseMemory<{}> {
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
		resourceId?: string;
		messages: AgentMessage[];
	}): Promise<void> {
		throw new Error('Method not implemented.');
	}
	deleteMessages(_messageIds: string[]): Promise<void> {
		throw new Error('Method not implemented.');
	}
	getWorkingMemory(_params: { threadId: string; resourceId?: string }): Promise<string | null> {
		throw new Error('Method not implemented.');
	}
	saveWorkingMemory(
		_params: { threadId: string; resourceId?: string },
		_content: string,
	): Promise<void> {
		throw new Error('Method not implemented.');
	}
	constructor() {
		super('n8n', {});
	}

	describe() {
		return { name: 'n8n', connectionParams: null, constructorName: 'N8nMemory' };
	}
}
