/**
 * Register a sub-agent with Mastra for HITL suspend/resume snapshot storage.
 * Without this, tools that use suspend() will fail on resumeStream() because
 * Mastra has no storage to persist/retrieve the execution snapshot.
 *
 * Reuses a single Mastra + Observability instance per storage key to avoid
 * creating throwaway Mastra/LangSmithExporter/Observability objects on every
 * sub-agent call.  Previous approach created a new Mastra per call, leaking
 * RunTree trace objects that retained full LLM request bodies (~25 MB+).
 */

import type { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import type { MastraCompositeStore } from '@mastra/core/storage';
import { LangSmithExporter } from '@mastra/langsmith';
import { Observability } from '@mastra/observability';

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
		observability: new Observability({
			configs: {
				langsmith: {
					serviceName: 'instance-ai',
					exporters: [new LangSmithExporter({ projectName: 'instance-ai' })],
				},
			},
		}),
	});
	cachedSubAgentStorageKey = key;
}
