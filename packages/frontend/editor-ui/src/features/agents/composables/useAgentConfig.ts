import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getAgentConfig, updateAgentConfig } from './useAgentApi';
import type { AgentJsonConfig } from '../types';

export function useAgentConfig() {
	const rootStore = useRootStore();
	const config = ref<AgentJsonConfig | null>(null);
	// `undefined` until a fetch or update lands; `null` when the agent has no config.
	const configHash = ref<string | null>();
	const loading = ref(false);
	// Hashes this composable's own writes moved the server through since it last
	// saw the server elsewhere, and where they left it. An edit scheduled while a
	// save was still in flight carries that save's base hash and must be saved
	// against the hash the save returned instead. A hash loaded by a fetch never
	// advances a base: when it differs from `ownLatest`, the run is over.
	const ownBases = new Set<string | null>();
	let ownLatest: string | null = null;

	// Tracks the most recently requested (project, agent) pair. fetch/update
	// resolutions whose pair no longer matches are dropped — without this, an
	// in-flight fetch for agent A can land after the user switches to agent B
	// and overwrite B's config. Same hazard for an autosave that finishes
	// after the switch.
	let latestKey: string | null = null;

	function keyFor(projectId: string, agentId: string) {
		return `${projectId}:${agentId}`;
	}

	/**
	 * Repoint the active (project, agent) pair without fetching: any in-flight
	 * fetch/update for the previous pair resolves as stale, and the previous
	 * pair's config is dropped so watchers stop serving it. Used on agent
	 * switch BEFORE flushing the previous agent's pending save — otherwise that
	 * save's response would land as current and repopulate the working copy
	 * with the old agent's data.
	 */
	function repoint(projectId: string, agentId: string) {
		latestKey = keyFor(projectId, agentId);
		config.value = null;
		configHash.value = undefined;
		loading.value = false;
	}

	async function fetchConfig(projectId: string, agentId: string) {
		const key = keyFor(projectId, agentId);
		latestKey = key;
		loading.value = true;
		try {
			const fresh = await getAgentConfig(rootStore.restApiContext, projectId, agentId);
			if (latestKey === key) {
				config.value = fresh.config;
				configHash.value = fresh.configHash;
			}
		} finally {
			if (latestKey === key) loading.value = false;
		}
	}

	/**
	 * `baseConfigHash` is the server hash the edit was made against. Callers
	 * that debounce saves must capture it at edit time: a refresh landing in
	 * between would otherwise lend the stale snapshot the fresh hash and let it
	 * pass the backend's conflict check. A base captured while one of this
	 * composable's own saves was in flight is advanced to that save's result.
	 * An unknown hash is sent as `null`, so the server rejects the write unless
	 * the agent really has no config yet.
	 */
	async function updateConfig(
		projectId: string,
		agentId: string,
		data: AgentJsonConfig,
		baseConfigHash: string | null = configHash.value ?? null,
	): Promise<{ versionId: string | null; stale: boolean }> {
		const key = keyFor(projectId, agentId);
		if (configHash.value !== ownLatest) ownBases.clear();
		else if (ownBases.has(baseConfigHash)) baseConfigHash = ownLatest;
		const result = await updateAgentConfig(
			rootStore.restApiContext,
			projectId,
			agentId,
			data,
			baseConfigHash,
		);
		const stale = latestKey !== key;
		if (!stale) {
			config.value = result.config;
			configHash.value = result.configHash;
			ownBases.add(baseConfigHash);
			ownLatest = result.configHash;
		}
		return { versionId: result.versionId, stale };
	}

	return { config, configHash, loading, repoint, fetchConfig, updateConfig };
}
