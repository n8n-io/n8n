<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nTooltip,
} from '@n8n/design-system';
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { WORKFLOW_DESCRIPTION_MODAL_KEY } from '@/app/constants';
import type { WorkflowListItem } from '@/Interface';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import {
	LOADING_INDICATOR_TIMEOUT,
	MCP_CONNECT_WORKFLOWS_MODAL_KEY,
	MCP_DOCS_PAGE_URL,
	MCP_SETTINGS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import WorkflowsTable from '@/features/ai/mcpAccess/components/tabs/WorkflowsTable.vue';

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const router = useRouter();
const documentTitle = useDocumentTitle();
const mcpStore = useMCPStore();
const uiStore = useUIStore();

const workflowsLoading = ref(false);
const availableWorkflows = ref<WorkflowListItem[]>([]);
const availableWorkflowsTotal = ref(0);
const workflowsTableState = ref<TableOptions>({
	page: 0,
	itemsPerPage: 10,
	sortBy: [],
});
const workflowsTableItemsPerPage = ref(workflowsTableState.value.itemsPerPage);

const showConnectWorkflowsButton = computed(() => availableWorkflowsTotal.value > 0);

const showMcpAccessUpdatedToast = (count: number, enabled: boolean) => {
	toast.showMessage({
		type: 'success',
		title: i18n.baseText(
			enabled
				? 'settings.mcp.workflows.enableAccess.success.title'
				: 'settings.mcp.workflows.removeAccess.success.title',
			{
				adjustToNumber: count,
				interpolate: { count: String(count) },
			},
		),
	});
};

const fetchAvailableWorkflows = async () => {
	workflowsLoading.value = true;
	try {
		const response = await mcpStore.fetchWorkflowsAvailableForMCP(
			workflowsTableState.value.page + 1,
			workflowsTableState.value.itemsPerPage,
		);
		if (response.data.length === 0 && response.count > 0 && workflowsTableState.value.page > 0) {
			const maxPage = Math.max(
				0,
				Math.ceil(response.count / workflowsTableState.value.itemsPerPage) - 1,
			);
			workflowsTableState.value = { ...workflowsTableState.value, page: maxPage };
			const clampedResponse = await mcpStore.fetchWorkflowsAvailableForMCP(
				workflowsTableState.value.page + 1,
				workflowsTableState.value.itemsPerPage,
			);
			availableWorkflows.value = clampedResponse.data;
			availableWorkflowsTotal.value = clampedResponse.count;
			return;
		}
		availableWorkflows.value = response.data;
		availableWorkflowsTotal.value = response.count;
	} catch (error) {
		toast.showError(error, i18n.baseText('workflows.list.error.fetching'));
	} finally {
		setTimeout(() => {
			workflowsLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const refreshWorkflowsFromFirstPage = async () => {
	workflowsTableState.value = { ...workflowsTableState.value, page: 0 };
	await fetchAvailableWorkflows();
};

const onWorkflowsTableUpdate = async (options: TableOptions) => {
	const pageSizeChanged = options.itemsPerPage !== workflowsTableItemsPerPage.value;
	workflowsTableState.value = { ...options, page: pageSizeChanged ? 0 : options.page };
	workflowsTableItemsPerPage.value = options.itemsPerPage;
	await fetchAvailableWorkflows();
};

const onToggleWorkflowMCPAccess = async (workflowId: string, isEnabled: boolean) => {
	try {
		await mcpStore.toggleWorkflowMcpAccess(workflowId, isEnabled);
		if (isEnabled) {
			await refreshWorkflowsFromFirstPage();
		} else {
			showMcpAccessUpdatedToast(1, false);
			await fetchAvailableWorkflows();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowSettings.toggleMCP.error.title'));
		throw error;
	}
};

const onBulkEnableWorkflowsMCPAccess = async (workflowIds: string[]) => {
	try {
		const response = await mcpStore.toggleWorkflowsMcpAccess({ workflowIds }, true);
		showMcpAccessUpdatedToast(response.updatedCount, true);
		await refreshWorkflowsFromFirstPage();
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowSettings.toggleMCP.error.title'));
		throw error;
	}
};

const onBulkRemoveWorkflowsMCPAccess = async (workflowIds: string[]) => {
	try {
		const response = await mcpStore.toggleWorkflowsMcpAccess({ workflowIds }, false);
		showMcpAccessUpdatedToast(response.updatedCount, false);
		await fetchAvailableWorkflows();
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowSettings.toggleMCP.error.title'));
	}
};

const onUpdateDescription = (workflow: WorkflowListItem) => {
	uiStore.openModalWithData({
		name: WORKFLOW_DESCRIPTION_MODAL_KEY,
		data: {
			workflowId: workflow.id,
			workflowDescription: workflow.description ?? '',
			onSave: (updatedDescription: string | null) => {
				const index = availableWorkflows.value.findIndex((w) => w.id === workflow.id);
				if (index !== -1) {
					availableWorkflows.value[index] = {
						...availableWorkflows.value[index],
						description: updatedDescription ?? undefined,
					};
				}
			},
		},
	});
};

const openConnectWorkflowsModal = () => {
	uiStore.openModalWithData({
		name: MCP_CONNECT_WORKFLOWS_MODAL_KEY,
		data: {
			onEnableMcpAccess: onBulkEnableWorkflowsMCPAccess,
		},
	});
	telemetry.track('User clicked connect workflows from mcp settings');
};

const onBack = () => {
	void router.push({ name: MCP_SETTINGS_VIEW });
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp.workflowsExposed.page.title'));
	if (!mcpStore.mcpAccessEnabled) {
		await router.replace({ name: MCP_SETTINGS_VIEW });
		return;
	}
	await fetchAvailableWorkflows();
});
</script>

<template>
	<N8nSettingsLayout
		full-width
		show-back
		:back-label="i18n.baseText('settings.mcp.back')"
		:class="$style.layout"
		@back="onBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.mcp.workflowsExposed.page.title')"
			:description="i18n.baseText('settings.mcp.workflowsExposed.page.description')"
			:docs-url="MCP_DOCS_PAGE_URL"
		/>
		<div data-test-id="mcp-workflows-view">
			<div :class="$style.actions">
				<N8nButton
					v-if="showConnectWorkflowsButton"
					variant="solid"
					:label="i18n.baseText('settings.mcp.connectWorkflows')"
					data-test-id="mcp-connect-workflows-header-button"
					size="small"
					@click="openConnectWorkflowsModal"
				/>
				<N8nTooltip :content="i18n.baseText('settings.mcp.refresh.tooltip')">
					<N8nButton
						variant="subtle"
						iconOnly
						data-test-id="mcp-workflows-refresh-button"
						size="small"
						icon="refresh-cw"
						@click="fetchAvailableWorkflows"
					/>
				</N8nTooltip>
			</div>
			<WorkflowsTable
				v-model:table-options="workflowsTableState"
				:data-test-id="'mcp-workflow-table'"
				:workflows="availableWorkflows"
				:total-count="availableWorkflowsTotal"
				:loading="workflowsLoading"
				@remove-mcp-access="(workflow) => onToggleWorkflowMCPAccess(workflow.id, false)"
				@bulk-remove-mcp-access="onBulkRemoveWorkflowsMCPAccess"
				@connect-workflows="openConnectWorkflowsModal"
				@update-description="onUpdateDescription"
				@update:options="onWorkflowsTableUpdate"
				@refresh="fetchAvailableWorkflows"
			/>
		</div>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* The settings shell pads the page top (70.5px); pull the column up a step. */
.layout {
	margin-top: calc(-1 * var(--spacing--lg));
	/* Fill the settings shell width so the workflows table spans the full page. */
	--settings-content--max-width: none;
}

/* Pin the back action to the top-left of the settings area (the shell's
   content container is position: relative), independent of the centered column. */
.layout > div:first-child {
	position: absolute;
	top: var(--spacing--lg);
	left: var(--spacing--lg);
	width: auto;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
}
</style>
