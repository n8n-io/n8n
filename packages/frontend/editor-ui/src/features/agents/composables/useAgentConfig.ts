import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getAgentConfig, updateAgentConfig } from './useAgentApi';
import type { AgentJsonConfig } from '../types';

export function useAgentConfig() {
	const rootStore = useRootStore();
	const config = ref<AgentJsonConfig | null>(null);
	const loading = ref(false);

	async function fetchConfig(projectId: string, agentId: string) {
		loading.value = true;
		try {
			config.value = await getAgentConfig(rootStore.restApiContext, projectId, agentId);
		} finally {
			loading.value = false;
		}
	}

	async function updateConfig(
		projectId: string,
		agentId: string,
		data: AgentJsonConfig,
	): Promise<void> {
		const result = await updateAgentConfig(rootStore.restApiContext, projectId, agentId, data);
		config.value = result.config;
	}

	return { config, loading, fetchConfig, updateConfig };
}
