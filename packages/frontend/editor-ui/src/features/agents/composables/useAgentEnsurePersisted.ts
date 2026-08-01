import type { Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import { createAgent } from './useAgentApi';
import type { AgentJsonConfig, AgentResource } from '../types';

/**
 * Creates the agent row for a draft on its first write.
 *
 * A draft opened from "New Agent" has an id but no row: nothing is persisted
 * until the user actually configures something, so opening the page and walking
 * away leaves nothing behind. Every write path in the builder calls
 * `ensurePersisted()` first, which POSTs the minted id together with the current
 * config — row and content land in one request, so a rejected config cannot
 * leave an empty agent.
 *
 * Concurrent callers share one in-flight request: the config autosave and a
 * modal confirm can fire in the same tick, and two POSTs with the same id would
 * make the second fail.
 */
export function useAgentEnsurePersisted(options: {
	projectId: () => string;
	agentId: () => string;
	isPending: Ref<boolean>;
	getConfig: () => AgentJsonConfig | null;
	getName: () => string;
	onCreated: (agent: AgentResource) => void;
}) {
	const rootStore = useRootStore();

	let inFlight: Promise<void> | null = null;

	async function create(): Promise<void> {
		const config = options.getConfig();
		const agent = await createAgent(
			rootStore.restApiContext,
			options.projectId(),
			options.getName(),
			{ id: options.agentId(), ...(config ? { config } : {}) },
		);
		options.isPending.value = false;
		options.onCreated(agent);
	}

	async function ensurePersisted(): Promise<void> {
		if (!options.isPending.value) return;
		if (inFlight) return await inFlight;

		// Cleared in `finally` rather than on success only: a failed create must
		// leave `isPending` true so the next edit retries instead of writing
		// against an agent that was never created.
		inFlight = create().finally(() => {
			inFlight = null;
		});
		return await inFlight;
	}

	return { ensurePersisted };
}
