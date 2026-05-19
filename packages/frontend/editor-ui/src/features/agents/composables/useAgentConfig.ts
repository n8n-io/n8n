import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getAgentConfig, updateAgentConfig } from './useAgentApi';
import type { AgentJsonConfig } from '../types';

export function useAgentConfig() {
	const rootStore = useRootStore();
	const config = ref<AgentJsonConfig | null>(null);
	const loading = ref(false);

	// Tracks the most recently requested (project, agent) pair. fetch/update
	// resolutions whose pair no longer matches are dropped — without this, an
	// in-flight fetch for agent A can land after the user switches to agent B
	// and overwrite B's config. Same hazard for an autosave that finishes
	// after the switch.
	let latestKey: string | null = null;

	function keyFor(projectId: string, agentId: string) {
		return `${projectId}:${agentId}`;
	}

	async function fetchConfig(projectId: string, agentId: string) {
		const key = keyFor(projectId, agentId);
		latestKey = key;
		loading.value = true;
		try {
			const fresh = await getAgentConfig(rootStore.restApiContext, projectId, agentId);
			if (latestKey === key) config.value = fresh;
		} finally {
			if (latestKey === key) loading.value = false;
		}
	}

	async function updateConfig(
		projectId: string,
		agentId: string,
		data: AgentJsonConfig,
	): Promise<{ versionId: string | null; stale: boolean }> {
		const key = keyFor(projectId, agentId);
		const result = await updateAgentConfig(rootStore.restApiContext, projectId, agentId, data);
		const stale = latestKey !== key;
		if (!stale) config.value = result.config;
		return { versionId: result.versionId, stale };
	}

	return { config, loading, fetchConfig, updateConfig };
}
