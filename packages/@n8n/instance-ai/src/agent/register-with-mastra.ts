/**
 * Register a sub-agent with Mastra for HITL suspend/resume snapshot storage.
 * Without this, tools that use suspend() will fail on resumeStream() because
 * Mastra has no storage to persist/retrieve the execution snapshot.
 *
 * Caches a single storage-only Mastra instance per storage key. The Mastra is
 * created WITHOUT agents so its internal #agents dict stays empty — avoiding
 * unbounded growth from unique per-request sub-agent IDs and cross-user
 * retention of stale agent closures.
 */

import type { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import type { MastraCompositeStore } from '@mastra/core/storage';

let cachedSubAgentMastra: Mastra | null = null;
let cachedSubAgentStorageKey = '';

export function registerWithMastra(_agentId: string, agent: Agent, storage: MastraCompositeStore) {
	const key = storage.id ?? 'default';

	if (!cachedSubAgentMastra || cachedSubAgentStorageKey !== key) {
		// Create a storage-only Mastra — no agents registered.
		// The agent only needs the Mastra back-reference to access getStorage()
		// for workflow snapshot persistence during suspend/resume.
		cachedSubAgentMastra = new Mastra({ storage });
		cachedSubAgentStorageKey = key;
	}

	agent.__registerMastra(cachedSubAgentMastra);
}
