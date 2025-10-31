<script setup lang="ts">
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useToast } from '@/composables/useToast';
import type { WorkflowListItem } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useMCPStore } from '@/features/mcpAccess/mcp.store';
import { useUsersStore } from '@/features/users/users.store';
import MCPConnectionInstructions from '@/features/mcpAccess/components/MCPConnectionInstructions.vue';
import { LOADING_INDICATOR_TIMEOUT } from '@/features/mcpAccess/mcp.constants';
import WorkflowsTable from '@/features/mcpAccess/components/WorkflowsTable.vue';
import McpAccessToggle from './components/McpAccessToggle.vue';

import { N8nHeading } from '@n8n/design-system';
import { useMcp } from './composables/useMcp';
const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const mcp = useMcp();

const workflowsStore = useWorkflowsStore();
const mcpStore = useMCPStore();
const usersStore = useUsersStore();
const rootStore = useRootStore();

const workflowsLoading = ref(false);
const mcpStatusLoading = ref(false);
const mcpKeyLoading = ref(false);

const availableWorkflows = ref<WorkflowListItem[]>([]);
const apiKey = computed(() => mcpStore.currentUserMCPKey);

const isOwner = computed(() => usersStore.isInstanceOwner);
const isAdmin = computed(() => usersStore.isAdmin);

const canToggleMCP = computed(() => isOwner.value || isAdmin.value);

const fetchAvailableWorkflows = async () => {
	workflowsLoading.value = true;
	try {
		const workflows = await mcpStore.fetchWorkflowsAvailableForMCP(1, 200);
		availableWorkflows.value = workflows;
	} catch (error) {
		toast.showError(error, i18n.baseText('workflows.list.error.fetching'));
	} finally {
		workflowsLoading.value = false;
	}
};

const onToggleMCPAccess = async (enabled: boolean) => {
	try {
		mcpStatusLoading.value = true;
		const updated = await mcpStore.setMcpAccessEnabled(enabled);
		if (updated) {
			await fetchAvailableWorkflows();
			await fetchApiKey();
			await fetchoAuthCLients();
		} else {
			workflowsLoading.value = false;
		}
		mcp.trackUserToggledMcpAccess(enabled);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.toggle.error'));
	} finally {
		mcpStatusLoading.value = false;
		workflowsLoading.value = false;
	}
};

const onRemoveMCPAccess = async (workflow: WorkflowListItem) => {
	try {
		await workflowsStore.updateWorkflowSetting(workflow.id, 'availableInMCP', false);
		availableWorkflows.value = availableWorkflows.value.filter((w) => w.id !== workflow.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowSettings.toggleMCP.error.title'));
	}
};

const fetchApiKey = async () => {
	try {
		mcpKeyLoading.value = true;
		await mcpStore.getOrCreateApiKey();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.apiKey'));
	} finally {
		setTimeout(() => {
			mcpKeyLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const rotateKey = async () => {
	try {
		mcpKeyLoading.value = true;
		await mcpStore.generateNewApiKey();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.rotating.apiKey'));
	} finally {
		setTimeout(() => {
			mcpKeyLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const fetchoAuthCLients = async () => {
	try {
		await mcpStore.getAllOAuthClients();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp'));
	if (!mcpStore.mcpAccessEnabled) {
		return;
	}
	await fetchAvailableWorkflows();
	await fetchApiKey();
	await fetchoAuthCLients();
});
</script>
<template>
	<div :class="$style.container">
		<N8nHeading size="2xlarge" class="mb-2xs">{{ i18n.baseText('settings.mcp') }}</N8nHeading>
		<McpAccessToggle
			:data-test-id="'mcp-access-toggle'"
			:model-value="mcpStore.mcpAccessEnabled"
			:disabled="!canToggleMCP"
			:loading="mcpStatusLoading"
			@toggle-mcp-access="onToggleMCPAccess"
		/>
		<div
			v-if="mcpStore.mcpAccessEnabled"
			:class="$style.container"
			data-test-id="mcp-enabled-section"
		>
			<MCPConnectionInstructions
				v-if="apiKey"
				:loading-api-key="mcpKeyLoading"
				:base-url="rootStore.urlBaseEditor"
				:api-key="apiKey"
				@rotate-key="rotateKey"
			/>
			<WorkflowsTable
				:data-test-id="'mcp-workflow-table'"
				:workflows="availableWorkflows"
				:loading="workflowsLoading"
				@remove-mcp-access="onRemoveMCPAccess"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}
</style>
