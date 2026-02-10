import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAgentsStore } from './agents.store';
import type { AgentCapabilitiesResponse, AgentTaskDispatchResponse } from './agents.types';

export const useAgentPanelStore = defineStore('agentPanel', () => {
	const panelOpen = ref(false);
	const panelAgentId = ref<string | null>(null);
	const capabilities = ref<AgentCapabilitiesResponse | null>(null);
	const isLoading = ref(false);
	const taskResult = ref<AgentTaskDispatchResponse | null>(null);
	const isSubmitting = ref(false);

	const rootStore = useRootStore();
	const agentsStore = useAgentsStore();

	const selectedAgent = computed(() => {
		if (!panelAgentId.value) return null;
		return agentsStore.agents.find((a) => a.id === panelAgentId.value) ?? null;
	});

	const zoneName = computed(() => {
		const agent = selectedAgent.value;
		if (!agent?.zoneId) return null;
		const zone = agentsStore.zones.find((z) => z.projectId === agent.zoneId);
		return zone?.name ?? null;
	});

	const connectedAgents = computed(() => {
		if (!panelAgentId.value) return [];
		const id = panelAgentId.value;
		const connectedIds = new Set<string>();

		for (const conn of agentsStore.connections) {
			if (conn.fromAgentId === id) connectedIds.add(conn.toAgentId);
			if (conn.toAgentId === id) connectedIds.add(conn.fromAgentId);
		}

		return agentsStore.agents.filter((a) => connectedIds.has(a.id));
	});

	const openPanel = async (agentId: string) => {
		panelAgentId.value = agentId;
		panelOpen.value = true;
		taskResult.value = null;
		isLoading.value = true;

		try {
			capabilities.value = await makeRestApiRequest<AgentCapabilitiesResponse>(
				rootStore.restApiContext,
				'GET',
				`/agents/${agentId}/capabilities`,
			);
		} catch {
			capabilities.value = null;
		} finally {
			isLoading.value = false;
		}
	};

	const closePanel = () => {
		panelOpen.value = false;
		panelAgentId.value = null;
		capabilities.value = null;
		taskResult.value = null;
		isLoading.value = false;
		isSubmitting.value = false;
	};

	const updateAgent = async (updates: { firstName?: string; avatar?: string | null }) => {
		if (!panelAgentId.value) return;
		await agentsStore.updateAgent(panelAgentId.value, updates);
	};

	const dispatchTask = async (prompt: string) => {
		if (!panelAgentId.value) return;

		isSubmitting.value = true;
		taskResult.value = null;

		try {
			taskResult.value = await makeRestApiRequest<AgentTaskDispatchResponse>(
				rootStore.restApiContext,
				'POST',
				`/agents/${panelAgentId.value}/task`,
				{ prompt },
			);
		} catch {
			taskResult.value = {
				status: 'error',
				message: 'Failed to dispatch task. Check agent worker configuration.',
			};
		} finally {
			isSubmitting.value = false;
		}
	};

	return {
		panelOpen,
		panelAgentId,
		capabilities,
		isLoading,
		taskResult,
		isSubmitting,
		selectedAgent,
		zoneName,
		connectedAgents,
		openPanel,
		closePanel,
		updateAgent,
		dispatchTask,
	};
});
