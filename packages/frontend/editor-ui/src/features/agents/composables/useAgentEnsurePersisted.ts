import type { Ref } from 'vue';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

import { createAgent } from './useAgentApi';
import type { AgentJsonConfig, AgentResource } from '../types';

export type EnsurePersistedResult = 'created' | 'already-persisted' | 'conflict';

/** The single shape every consumer of the draft-create hook should use. */
export type EnsurePersisted = () => Promise<EnsurePersistedResult>;

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
	/** Called when the row turned out to already exist. The caller's snapshot is
	 *  by definition older than whatever created it, so it must be discarded
	 *  rather than written. */
	onConflict?: () => void | Promise<void>;
	/** True when the captured target is no longer the one on screen — the host
	 *  switched agents while the create was in flight, so the result must not be
	 *  applied. */
	isStale: (projectId: string, agentId: string) => boolean;
}) {
	const rootStore = useRootStore();

	let inFlight: { agentId: string; promise: Promise<EnsurePersistedResult> } | null = null;

	async function create(): Promise<EnsurePersistedResult> {
		const targetProjectId = options.projectId();
		const targetAgentId = options.agentId();
		try {
			const config = options.getConfig();
			const agent = await createAgent(
				rootStore.restApiContext,
				targetProjectId,
				options.getName(),
				{ id: targetAgentId, ...(config ? { config } : {}) },
			);
			if (options.isStale(targetProjectId, targetAgentId)) {
				return 'created';
			}
			options.isPending.value = false;
			options.onCreated(agent);
			return 'created';
		} catch (error) {
			// The builder materialized the row first. The agent exists, which is all
			// the caller needed — clear the draft state and let it fall through to a
			// normal update instead of retrying a create that can never succeed.
			if (error instanceof ResponseError && error.httpStatusCode === 409) {
				if (options.isStale(targetProjectId, targetAgentId)) {
					return 'conflict';
				}
				options.isPending.value = false;
				await options.onConflict?.();
				return 'conflict';
			}
			throw error;
		}
	}

	async function ensurePersisted(): Promise<EnsurePersistedResult> {
		if (!options.isPending.value) return 'already-persisted';
		const currentAgentId = options.agentId();
		if (inFlight && inFlight.agentId === currentAgentId) {
			const result = await inFlight.promise;
			// Waiters did not perform the create. Propagate conflict so they do
			// not fall through and overwrite the newer server config; a successful
			// create still reports already-persisted so only the leader claims it.
			return result === 'created' ? 'already-persisted' : result;
		}

		// Cleared in `finally` rather than on success only: a rejected create must
		// not leave a poisoned promise that every later caller awaits.
		const promise = create().finally(() => {
			if (inFlight?.agentId === currentAgentId) {
				inFlight = null;
			}
		});
		inFlight = { agentId: currentAgentId, promise };
		return await promise;
	}

	return { ensurePersisted };
}
