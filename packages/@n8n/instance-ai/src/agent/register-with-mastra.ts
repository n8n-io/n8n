/**
 * Register a sub-agent with Mastra for HITL suspend/resume snapshot storage.
 * Without this, tools that use suspend() will fail on resumeStream() because
 * Mastra has no storage to persist/retrieve the execution snapshot.
 *
 * Reuses a single Mastra instance per storage key to avoid creating throwaway
 * registration objects on every sub-agent call.
 */

import type { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import type { MastraCompositeStore } from '@mastra/core/storage';

let cachedSubAgentMastra: Mastra | null = null;
let cachedSubAgentStorageKey = '';

export function registerWithMastra(agentId: string, agent: Agent, storage: MastraCompositeStore) {
	const key = storage.id ?? 'default';

	if (cachedSubAgentMastra && cachedSubAgentStorageKey === key) {
		// Mastra.__registerMastra sets the mastra back-reference on the agent,
		// which is what enables suspend/resume snapshot storage.
		agent.__registerMastra(cachedSubAgentMastra);
		return;
	}

	cachedSubAgentMastra = new Mastra({
		agents: { [agentId]: agent },
		storage,
	});
	cachedSubAgentStorageKey = key;
}
