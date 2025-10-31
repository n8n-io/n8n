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

import { ElSwitch } from 'element-plus';
import { N8nHeading, N8nText, N8nTooltip } from '@n8n/design-system';
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

const onUpdateMCPEnabled = async (value: string | number | boolean) => {
	try {
		mcpStatusLoading.value = true;
		const boolValue = typeof value === 'boolean' ? value : Boolean(value);
		const updated = await mcpStore.setMcpAccessEnabled(boolValue);
		if (updated) {
			await fetchAvailableWorkflows();
			await fetchApiKey();
		} else {
			workflowsLoading.value = false;
		}
		mcp.trackUserToggledMcpAccess(boolValue);
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
		<div :class="$style.headingContainer">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.mcp') }}</N8nHeading>
		</div>
		<div :class="$style.mainToggleContainer">
			<div :class="$style.mainToggleInfo">
				<N8nText :bold="true">{{ i18n.baseText('settings.mcp.toggle.label') }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.mcp.toggle.description') }}
				</N8nText>
			</div>
			<div :class="$style.mainTooggle" data-test-id="mcp-toggle-container">
				<N8nTooltip
					:content="i18n.baseText('settings.mcp.toggle.disabled.tooltip')"
					:disabled="canToggleMCP"
					placement="top"
				>
					<ElSwitch
						size="large"
						data-test-id="mcp-access-toggle"
						:model-value="mcpStore.mcpAccessEnabled"
						:disabled="!canToggleMCP"
						:loading="mcpStatusLoading"
						@update:model-value="onUpdateMCPEnabled"
					/>
				</N8nTooltip>
			</div>
		</div>
		<div
			v-if="mcpStore.mcpAccessEnabled"
			:class="$style.container"
			data-test-id="mcp-enabled-section"
		>
			<div>
				<N8nHeading size="medium" :bold="true">
					{{ i18n.baseText('settings.mcp.connection.info.heading') }}
				</N8nHeading>
				<MCPConnectionInstructions
					v-if="apiKey"
					:loading-api-key="mcpKeyLoading"
					:base-url="rootStore.urlBaseEditor"
					:api-key="apiKey"
					@rotate-key="rotateKey"
				/>
			</div>
			<div :class="$style['workflow-list-container']" data-test-id="mcp-workflow-list">
				<WorkflowsTable
					:data-test-id="'mcp-workflow-table'"
					:workflows="availableWorkflows"
					:loading="workflowsLoading"
					@remove-mcp-access="onRemoveMCPAccess"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);

	:global(.table-pagination) {
		display: none;
	}
}

.headingContainer {
	margin-bottom: var(--spacing--xs);
}

.mainToggleContainer {
	display: flex;
	align-items: center;
	padding: var(--spacing--sm);
	justify-content: space-between;
	flex-shrink: 0;

	border-radius: var(--radius);
	border: var(--border);
}

.mainToggleInfo {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
}

.mainTooggle {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}
</style>
