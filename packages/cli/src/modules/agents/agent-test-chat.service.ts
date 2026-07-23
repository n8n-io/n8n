import { Service } from '@n8n/di';

import { AGENT_THREAD_PREFIX } from './builder/builder-tool-names';
import { N8nMemory } from './integrations/n8n-memory';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';

/** Derive a stable thread ID for the test-chat of a given agent and user. */
export function chatThreadId(agentId: string, userId?: string): string {
	const baseThreadId = `${AGENT_THREAD_PREFIX.TEST}${agentId}`;
	return userId ? `${baseThreadId}:${userId}` : baseThreadId;
}

@Service()
export class AgentTestChatService {
	constructor(private readonly n8nMemory: N8nMemory) {}

	/**
	 * Return persisted test-chat messages for an agent scoped to the current
	 * user. Test-chat threads are keyed by agent and user so memory stays isolated.
	 */
	async getTestChatMessages(agentId: string, userId: string) {
		return await this.n8nMemory
			.getImplementation(agentId)
			.getMessages(chatThreadId(agentId, userId), {
				resourceId: draftChatMemoryResourceId(userId),
			});
	}

	/**
	 * Clear the current user's test-chat messages for an agent.
	 */
	async clearTestChatMessages(agentId: string, userId: string) {
		await this.n8nMemory.getImplementation(agentId).deleteThread(chatThreadId(agentId, userId));
	}

	/** Delete all test-chat messages + the thread row — used when the agent itself is deleted. */
	async clearAllTestChatMessages(agentId: string) {
		const threadId = chatThreadId(agentId);
		const memory = this.n8nMemory.getImplementation(agentId);
		await memory.deleteThreadsByPrefix(threadId);
		await memory.deleteMessagesByThread(threadId);
		await memory.deleteThread(threadId);
	}
}
