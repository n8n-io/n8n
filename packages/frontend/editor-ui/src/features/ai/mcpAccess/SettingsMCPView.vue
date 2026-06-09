<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import type { WorkflowListItem } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import {
	LOADING_INDICATOR_TIMEOUT,
	MCP_CONNECT_WORKFLOWS_MODAL_KEY,
	MCP_DOCS_PAGE_URL,
} from '@/features/ai/mcpAccess/mcp.constants';
import MCPEmptyState from '@/features/ai/mcpAccess/components/MCPEmptyState.vue';
import MCpHeaderActions from '@/features/ai/mcpAccess/components/header/MCPHeaderActions.vue';
import WorkflowsTable from '@/features/ai/mcpAccess/components/tabs/WorkflowsTable.vue';
import OAuthClientsTable from '@/features/ai/mcpAccess/components/tabs/OAuthClientsTable.vue';
import {
	N8nHeading,
	N8nNotice,
	N8nTabs,
	N8nTooltip,
	N8nButton,
	N8nText,
	N8nLink,
	N8nPreviewTag,
} from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { WORKFLOW_DESCRIPTION_MODAL_KEY } from '@/app/constants';
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';

type MCPTabs = 'workflows' | 'oauth';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const mcp = useMcp();
const telemetry = useTelemetry();

const mcpStore = useMCPStore();
const usersStore = useUsersStore();
const uiStore = useUIStore();

const mcpStatusLoading = ref(false);
const selectedTab = ref<MCPTabs>('workflows');

const tabs = ref<Array<TabOptions<MCPTabs>>>([
	{
		label: i18n.baseText('settings.mcp.tabs.workflows'),
		value: 'workflows',
	},
	{
		label: i18n.baseText('settings.mcp.tabs.oauth'),
		value: 'oauth',
	},
]);

const workflowsLoading = ref(false);
const availableWorkflows = ref<WorkflowListItem[]>([]);
const availableWorkflowsTotal = ref(0);
const workflowsTableState = ref<TableOptions>({
	page: 0,
	itemsPerPage: 10,
	sortBy: [],
});
const workflowsTableItemsPerPage = ref(workflowsTableState.value.itemsPerPage);

const oAuthClientsLoading = ref(false);
const connectedOAuthClients = ref<OAuthClientResponseDto[]>([]);

const isOwner = computed(() => usersStore.isInstanceOwner);
const isAdmin = computed(() => usersStore.isAdmin);

const canToggleMCP = computed(() => (isOwner.value || isAdmin.value) && !mcpStore.mcpManagedByEnv);

const canSeeInstanceStats = computed(() => isOwner.value || isAdmin.value);

const showInstanceCapacityNotice = computed(
	() => canSeeInstanceStats.value && mcpStore.instanceClientStats?.atCapacity === true,
);

const instanceCapacityNoticeContent = computed(() => {
	const stats = mcpStore.instanceClientStats;
	if (!stats) return '';
	return i18n.baseText('settings.mcp.instanceCapacity.warning', {
		interpolate: { count: String(stats.count), limit: String(stats.limit) },
	});
});

const showConnectWorkflowsButton = computed(() => {
	return selectedTab.value === 'workflows' && availableWorkflowsTotal.value > 0;
});

const onTabSelected = async (tab: MCPTabs) => {
	selectedTab.value = tab;
	if (tab === 'workflows' && availableWorkflows.value.length === 0) {
		await fetchAvailableWorkflows();
	} else if (tab === 'oauth' && connectedOAuthClients.value.length === 0) {
		await fetchoAuthCLients();
		telemetry.track('User clicked connected clients tab');
	}
};

const onToggleMCPAccess = async (enabled: boolean) => {
	try {
		mcpStatusLoading.value = true;
		const updated = await mcpStore.setMcpAccessEnabled(enabled);
		if (updated) {
			await fetchAvailableWorkflows();
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

const onToggleWorkflowMCPAccess = async (workflowId: string, isEnabled: boolean) => {
	try {
		await mcpStore.toggleWorkflowMcpAccess(workflowId, isEnabled);
		if (isEnabled) {
			workflowsTableState.value = { ...workflowsTableState.value, page: 0 };
			await fetchAvailableWorkflows();
		} else {
			await fetchAvailableWorkflows();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowSettings.toggleMCP.error.title'));
		throw error;
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

const onTableRefresh = async () => {
	if (selectedTab.value === 'workflows') {
		await fetchAvailableWorkflows();
	} else if (selectedTab.value === 'oauth') {
		await fetchoAuthCLients();
	}
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

const onRefreshWorkflows = async () => {
	await fetchAvailableWorkflows();
};

const onWorkflowsTableUpdate = async (options: TableOptions) => {
	const pageSizeChanged = options.itemsPerPage !== workflowsTableItemsPerPage.value;
	workflowsTableState.value = { ...options, page: pageSizeChanged ? 0 : options.page };
	workflowsTableItemsPerPage.value = options.itemsPerPage;
	await fetchAvailableWorkflows();
};

const fetchoAuthCLients = async () => {
	try {
		oAuthClientsLoading.value = true;
		const clients = await mcpStore.getAllOAuthClients();
		connectedOAuthClients.value = clients ?? [];
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	} finally {
		setTimeout(() => {
			oAuthClientsLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const revokeClientAccess = async (client: OAuthClientResponseDto) => {
	try {
		await mcpStore.removeOAuthClient(client.id);
		connectedOAuthClients.value = connectedOAuthClients.value.filter((c) => c.id !== client.id);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.mcp.oAuthClients.revoke.success.title'),
			message: i18n.baseText('settings.mcp.oAuthClients.revoke.success.message', {
				interpolate: { name: client.name },
			}),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.oAuthClients.revoke.error'));
	}
};

const openConnectWorkflowsModal = () => {
	uiStore.openModalWithData({
		name: MCP_CONNECT_WORKFLOWS_MODAL_KEY,
		data: {
			onEnableMcpAccess: async (workflowId: string) => {
				await onToggleWorkflowMCPAccess(workflowId, true);
			},
		},
	});
	telemetry.track('User clicked connect workflows from mcp settings');
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp'));
	if (!mcpStore.mcpAccessEnabled) {
		return;
	}
	const fetches: Array<Promise<unknown>> = [fetchAvailableWorkflows(), fetchoAuthCLients()];
	if (canSeeInstanceStats.value) {
		fetches.push(mcpStore.getInstanceClientStats());
	}
	await Promise.all(fetches);
});
</script>
<template>
	<div :class="$style.container">
		<header :class="$style['main-header']" data-test-id="mcp-settings-header">
			<div :class="$style.headings">
				<div :class="$style['heading-row']">
					<N8nHeading size="2xlarge">{{ i18n.baseText('settings.mcp') }}</N8nHeading>
					<N8nTooltip :content="i18n.baseText('settings.mcp.preview.tooltip')">
						<N8nPreviewTag size="medium" />
					</N8nTooltip>
				</div>
				<div v-show="mcpStore.mcpAccessEnabled" data-test-id="mcp-settings-description">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.mcp.description') }}.
					</N8nText>
					<N8nLink
						:href="MCP_DOCS_PAGE_URL"
						target="_blank"
						rel="noopener noreferrer"
						size="small"
						data-test-id="mcp-docs-link"
					>
						{{ i18n.baseText('generic.learnMore') }}
					</N8nLink>
				</div>
			</div>
			<MCpHeaderActions
				:access-enabled="mcpStore.mcpAccessEnabled"
				:toggle-disabled="!canToggleMCP"
				:loading="mcpStatusLoading"
				:managed-by-env="mcpStore.mcpManagedByEnv"
				@disable-mcp-access="onToggleMCPAccess(!mcpStore.mcpAccessEnabled)"
			/>
		</header>
		<MCPEmptyState
			v-if="!mcpStore.mcpAccessEnabled"
			:disabled="!canToggleMCP"
			:loading="mcpStatusLoading"
			:managed-by-env="mcpStore.mcpManagedByEnv"
			@turn-on-mcp="onToggleMCPAccess(true)"
		/>
		<div
			v-if="mcpStore.mcpAccessEnabled"
			:class="$style.container"
			data-test-id="mcp-enabled-section"
		>
			<N8nNotice
				v-if="showInstanceCapacityNotice"
				theme="warning"
				data-test-id="mcp-instance-capacity-notice"
				:content="instanceCapacityNoticeContent"
			/>
			<header :class="$style['tabs-header']">
				<N8nTabs :model-value="selectedTab" :options="tabs" @update:model-value="onTabSelected" />
				<div :class="$style.actions">
					<N8nButton
						variant="solid"
						v-if="showConnectWorkflowsButton"
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
							@click="onTableRefresh"
						/>
					</N8nTooltip>
				</div>
			</header>
			<main>
				<WorkflowsTable
					v-if="selectedTab === 'workflows'"
					v-model:table-options="workflowsTableState"
					:data-test-id="'mcp-workflow-table'"
					:workflows="availableWorkflows"
					:total-count="availableWorkflowsTotal"
					:loading="workflowsLoading"
					@remove-mcp-access="(workflow) => onToggleWorkflowMCPAccess(workflow.id, false)"
					@connect-workflows="openConnectWorkflowsModal"
					@update-description="onUpdateDescription"
					@update:options="onWorkflowsTableUpdate"
					@refresh="onRefreshWorkflows"
				/>
				<OAuthClientsTable
					v-else-if="selectedTab === 'oauth'"
					:data-test-id="'mcp-oauth-clients-table'"
					:clients="connectedOAuthClients"
					:loading="oAuthClientsLoading"
					@revoke-client="revokeClientAccess"
					@refresh="onTableRefresh"
				/>
			</main>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
}

.main-header {
	display: flex;
	justify-content: space-between;
	margin-bottom: var(--spacing--xl);

	@media (max-width: 820px) {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing--2xs);
	}
}

.headings {
	display: flex;
	flex-direction: column;
	min-height: 60px;
}

.heading-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--5xs);
}

.tabs-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
