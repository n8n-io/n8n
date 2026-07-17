import { ref } from 'vue';
import type { AgentConfigValidationResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getAgentConfigValidation } from './useAgentApi';

/**
 * Tracks the agent's static, authoritative publish readiness — powers the
 * disabled Publish tooltip and invalid capability chip states. Mirrors
 * `useAgentConfig`'s stale-response guard: a fetch for a previous
 * (project, agent) pair that resolves after the user has switched away is
 * dropped rather than applied.
 */
export function useAgentConfigValidation() {
	const rootStore = useRootStore();
	const validation = ref<AgentConfigValidationResponse | null>(null);
	const loading = ref(false);

	let latestKey: string | null = null;

	function keyFor(projectId: string, agentId: string) {
		return `${projectId}:${agentId}`;
	}

	/**
	 * Repoint the active (project, agent) pair without fetching — mirrors
	 * `useAgentConfig.repoint`. Drops the previous pair's result so an
	 * in-flight validation fetch for it can't land on the new pair.
	 */
	function repoint(projectId: string, agentId: string) {
		latestKey = keyFor(projectId, agentId);
		validation.value = null;
		loading.value = false;
	}

	/**
	 * Mark the current validation result stale without fetching. Called
	 * immediately on local config edits — the persisted validation result is
	 * known to no longer reflect the working copy, so Publish must not stay
	 * enabled against it until a fresh save + refresh lands.
	 */
	function invalidate() {
		validation.value = null;
	}

	async function refresh(projectId: string, agentId: string) {
		const key = keyFor(projectId, agentId);
		latestKey = key;
		loading.value = true;
		try {
			const fresh = await getAgentConfigValidation(rootStore.restApiContext, projectId, agentId);
			if (latestKey === key) validation.value = fresh;
		} catch {
			// Fail safe: a failed readiness fetch must not fail the caller's
			// save/load/publish flow. `null` already means "unknown", which keeps
			// Publish disabled until a later refresh succeeds.
			if (latestKey === key) validation.value = null;
		} finally {
			if (latestKey === key) loading.value = false;
		}
	}

	return { validation, loading, repoint, invalidate, refresh };
}
