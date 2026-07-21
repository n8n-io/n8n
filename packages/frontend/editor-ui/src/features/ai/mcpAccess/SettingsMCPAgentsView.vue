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
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { Agent } from '@/features/agents/agent.types';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import {
	LOADING_INDICATOR_TIMEOUT,
	MCP_CONNECT_AGENTS_MODAL_KEY,
	MCP_DOCS_PAGE_URL,
	MCP_SETTINGS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import AgentsTable from '@/features/ai/mcpAccess/components/tabs/AgentsTable.vue';

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const router = useRouter();
const documentTitle = useDocumentTitle();
const mcpStore = useMCPStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();

const agentsLoading = ref(false);
const availableAgents = ref<Agent[]>([]);
const availableAgentsTotal = ref(0);
const agentsTableState = ref<TableOptions>({
	page: 0,
	itemsPerPage: 10,
	sortBy: [],
});
const agentsTableItemsPerPage = ref(agentsTableState.value.itemsPerPage);

const showConnectAgentsButton = computed(() => availableAgentsTotal.value > 0);

const showMcpAccessUpdatedToast = (count: number, enabled: boolean) => {
	toast.showMessage({
		type: 'success',
		title: i18n.baseText(
			enabled
				? 'settings.mcp.agents.enableAccess.success.title'
				: 'settings.mcp.agents.removeAccess.success.title',
			{
				adjustToNumber: count,
				interpolate: { count: String(count) },
			},
		),
	});
};

const fetchAvailableAgents = async () => {
	agentsLoading.value = true;
	try {
		const response = await mcpStore.fetchAgentsAvailableForMCP(
			agentsTableState.value.page + 1,
			agentsTableState.value.itemsPerPage,
		);
		if (response.data.length === 0 && response.count > 0 && agentsTableState.value.page > 0) {
			const maxPage = Math.max(
				0,
				Math.ceil(response.count / agentsTableState.value.itemsPerPage) - 1,
			);
			agentsTableState.value = { ...agentsTableState.value, page: maxPage };
			const clampedResponse = await mcpStore.fetchAgentsAvailableForMCP(
				agentsTableState.value.page + 1,
				agentsTableState.value.itemsPerPage,
			);
			availableAgents.value = clampedResponse.data;
			availableAgentsTotal.value = clampedResponse.count;
			return;
		}
		availableAgents.value = response.data;
		availableAgentsTotal.value = response.count;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.agents.list.error.fetching'));
	} finally {
		setTimeout(() => {
			agentsLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const refreshAgentsFromFirstPage = async () => {
	agentsTableState.value = { ...agentsTableState.value, page: 0 };
	await fetchAvailableAgents();
};

const onAgentsTableUpdate = async (options: TableOptions) => {
	const pageSizeChanged = options.itemsPerPage !== agentsTableItemsPerPage.value;
	agentsTableState.value = { ...options, page: pageSizeChanged ? 0 : options.page };
	agentsTableItemsPerPage.value = options.itemsPerPage;
	await fetchAvailableAgents();
};

const onToggleAgentMCPAccess = async (agentId: string, isEnabled: boolean) => {
	try {
		await mcpStore.toggleAgentMcpAccess(agentId, isEnabled);
		if (isEnabled) {
			await refreshAgentsFromFirstPage();
		} else {
			showMcpAccessUpdatedToast(1, false);
			await fetchAvailableAgents();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.toggleMCP.error.title'));
		throw error;
	}
};

const onBulkEnableAgentsMCPAccess = async (agentIds: string[]) => {
	try {
		const response = await mcpStore.toggleAgentsMcpAccess({ agentIds }, true);
		showMcpAccessUpdatedToast(response.updatedCount, true);
		await refreshAgentsFromFirstPage();
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.toggleMCP.error.title'));
		throw error;
	}
};

const onBulkRemoveAgentsMCPAccess = async (agentIds: string[]) => {
	try {
		const response = await mcpStore.toggleAgentsMcpAccess({ agentIds }, false);
		showMcpAccessUpdatedToast(response.updatedCount, false);
		await fetchAvailableAgents();
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.toggleMCP.error.title'));
	}
};

const openConnectAgentsModal = () => {
	uiStore.openModalWithData({
		name: MCP_CONNECT_AGENTS_MODAL_KEY,
		data: {
			onEnableMcpAccess: onBulkEnableAgentsMCPAccess,
		},
	});
	telemetry.track('User clicked connect agents from mcp settings');
};

const onBack = () => {
	void router.push({ name: MCP_SETTINGS_VIEW });
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp.agentsExposed.page.title'));
	if (!mcpStore.mcpAccessEnabled || !settingsStore.isModuleActive('agents')) {
		await router.replace({ name: MCP_SETTINGS_VIEW });
		return;
	}
	await fetchAvailableAgents();
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
			:title="i18n.baseText('settings.mcp.agentsExposed.page.title')"
			:description="i18n.baseText('settings.mcp.agentsExposed.page.description')"
			:docs-url="MCP_DOCS_PAGE_URL"
		/>
		<div data-test-id="mcp-agents-view">
			<div :class="$style.actions">
				<N8nButton
					v-if="showConnectAgentsButton"
					variant="solid"
					:label="i18n.baseText('settings.mcp.connectAgents')"
					data-test-id="mcp-connect-agents-header-button"
					size="small"
					@click="openConnectAgentsModal"
				/>
				<N8nTooltip :content="i18n.baseText('settings.mcp.refresh.tooltip')">
					<N8nButton
						variant="subtle"
						iconOnly
						data-test-id="mcp-agents-refresh-button"
						size="small"
						icon="refresh-cw"
						@click="fetchAvailableAgents"
					/>
				</N8nTooltip>
			</div>
			<AgentsTable
				v-model:table-options="agentsTableState"
				:agents="availableAgents"
				:total-count="availableAgentsTotal"
				:loading="agentsLoading"
				@remove-mcp-access="(agent) => onToggleAgentMCPAccess(agent.id, false)"
				@bulk-remove-mcp-access="onBulkRemoveAgentsMCPAccess"
				@connect-agents="openConnectAgentsModal"
				@update:options="onAgentsTableUpdate"
			/>
		</div>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* The settings shell pads the page top (70.5px); pull the column up a step. */
.layout {
	margin-top: calc(-1 * var(--spacing--lg));
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
