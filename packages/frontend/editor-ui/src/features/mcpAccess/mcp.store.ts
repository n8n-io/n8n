import { defineStore } from 'pinia';
import { MCP_STORE } from './mcp.constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { WorkflowListItem } from '@/Interface';
import * as workflowsApi from '@/api/workflows';
import { useRootStore } from '@n8n/stores/useRootStore';
import { updateMcpSettings } from '@/features/mcpAccess/mcp.api';
import { computed } from 'vue';
import { useSettingsStore } from '@/stores/settings.store';

export const useMCPStore = defineStore(MCP_STORE, () => {
	const workflowsStore = useWorkflowsStore();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const mcpAccessEnabled = computed(() => !!settingsStore.moduleSettings.mcp?.mcpAccessEnabled);

	async function fetchWorkflowsAvailableForMCP(
		page = 1,
		pageSize = 50,
	): Promise<WorkflowListItem[]> {
		const options = {
			skip: (page - 1) * pageSize,
			take: pageSize,
		};
		const { count, data } = await workflowsApi.getWorkflowsAndFolders(
			rootStore.restApiContext,
			{ isArchived: false, availableInMCP: true },
			Object.keys(options).length ? options : undefined,
			false,
		);
		workflowsStore.totalWorkflowCount = count;
		data
			.filter((item) => item.resource !== 'folder')
			.forEach((item) => {
				workflowsStore.addWorkflow({
					...item,
					nodes: [],
					connections: {},
					versionId: '',
				});
			});
		return data.filter((item): item is WorkflowListItem => item.resource === 'workflow');
	}

	async function setMcpAccessEnabled(enabled: boolean): Promise<boolean> {
		const { mcpAccessEnabled: updated } = await updateMcpSettings(
			rootStore.restApiContext,
			enabled,
		);
		settingsStore.moduleSettings.mcp = {
			...(settingsStore.moduleSettings.mcp ?? {}),
			mcpAccessEnabled: updated,
		};
		return updated;
	}

	return {
		mcpAccessEnabled,
		fetchWorkflowsAvailableForMCP,
		setMcpAccessEnabled,
	};
});
