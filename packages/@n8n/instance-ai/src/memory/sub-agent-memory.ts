/**
 * Sub-Agent Working Memory via Mastra Memory
 *
 * Creates lightweight Mastra Memory instances for sub-agents with per-role
 * working memory templates. The working memory persists per-user across
 * invocations — each time a builder sub-agent runs, it sees (and can update)
 * the knowledge accumulated from all previous builds for that user.
 *
 * Mechanics (handled by Mastra):
 * - Current working memory is injected into the system prompt automatically
 * - The `updateWorkingMemory` tool is provided to the agent automatically
 * - Working memory is scoped to `resource` (userId:role) — persists across threads
 *
 * Resource ID convention:
 *   `${userId}:${role}` — e.g. "user-123:workflow-builder"
 *   This separates each role's memory from the orchestrator's (which uses plain userId).
 */

import type { MastraCompositeStore } from '@mastra/core/storage';
import { Memory } from '@mastra/memory';

import { getSubAgentMemoryTemplate } from './sub-agent-memory-templates';

/**
 * Build the composite resource ID used to scope a sub-agent's working memory
 * per user and per role.
 */
export function subAgentResourceId(userId: string, role: string): string {
	return `${userId}:${role}`;
}

/**
 * Create a Mastra Memory instance for a sub-agent role.
 *
 * Returns `undefined` if the role doesn't have a working memory template
 * (i.e., it's not a memory-enabled role).
 *
 * The Memory instance is lightweight — it wraps the storage backend and config.
 * Creating one per sub-agent invocation is fine.
 */
export function createSubAgentMemory(
	storage: MastraCompositeStore,
	role: string,
): Memory | undefined {
	const template = getSubAgentMemoryTemplate(role);
	if (!template) return undefined;

	return new Memory({
		storage,
		options: {
			// Sub-agents are ephemeral — no conversation history needed
			lastMessages: 0,
			semanticRecall: false,
			workingMemory: {
				enabled: true,
				template,
			},
		},
	});
}
