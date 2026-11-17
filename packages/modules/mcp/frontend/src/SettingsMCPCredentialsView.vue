<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import {
	N8nButton,
	N8nNotice,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nTooltip,
} from '@n8n/design-system';
import type { TableOptions } from '@n8n/design-system';

import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { McpCredential } from './mcp.types';
import { useMCPStore } from './mcp.store';
import { LOADING_INDICATOR_TIMEOUT, MCP_DOCS_PAGE_URL, MCP_SETTINGS_VIEW } from './mcp.constants';
import CredentialsTable from './components/tabs/CredentialsTable.vue';
import MCPConnectCredentialsModal from './modals/MCPConnectCredentialsModal.vue';

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const documentTitle = useDocumentTitle({
	releaseChannel: useSettingsStore().settings.releaseChannel,
});
const mcpStore = useMCPStore();

const credentialsLoading = ref(false);
const showConnectCredentialsDialog = ref(false);
/** Every credential that can be made available in MCP. The endpoint has no pagination. */
const credentials = ref<McpCredential[]>([]);
const credentialsTableState = ref<TableOptions>({
	page: 0,
	itemsPerPage: 10,
	sortBy: [],
});
const credentialsTableItemsPerPage = ref(credentialsTableState.value.itemsPerPage);

const exposedCredentials = computed(() =>
	credentials.value.filter((credential) => credential.availableInMCP),
);

const connectableCredentials = computed(() =>
	credentials.value.filter((credential) => !credential.availableInMCP && credential.canUpdate),
);

const pageCredentials = computed(() => {
	const { page, itemsPerPage } = credentialsTableState.value;
	return exposedCredentials.value.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
});

const isCredentialUseBlocked = computed(() => mcpStore.credentialUseMode === 'blocked');

const showMcpAccessUpdatedToast = (count: number, enabled: boolean) => {
	toast.showMessage({
		type: 'success',
		title: i18n.baseText(
			enabled
				? 'settings.mcp.credentials.enableAccess.success.title'
				: 'settings.mcp.credentials.removeAccess.success.title',
			{
				adjustToNumber: count,
				interpolate: { count: String(count) },
			},
		),
	});
};

/** Keeps the page inside the list after the list gets shorter. */
const clampPage = () => {
	const { page, itemsPerPage } = credentialsTableState.value;
	const lastPage = Math.max(0, Math.ceil(exposedCredentials.value.length / itemsPerPage) - 1);
	if (page > lastPage) {
		credentialsTableState.value = { ...credentialsTableState.value, page: lastPage };
	}
};

const fetchCredentials = async () => {
	credentialsLoading.value = true;
	try {
		credentials.value = await mcpStore.fetchMcpCredentials();
		clampPage();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.credentials.list.error.fetching'));
	} finally {
		setTimeout(() => {
			credentialsLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const onCredentialsTableUpdate = (options: TableOptions) => {
	const pageSizeChanged = options.itemsPerPage !== credentialsTableItemsPerPage.value;
	credentialsTableState.value = { ...options, page: pageSizeChanged ? 0 : options.page };
	credentialsTableItemsPerPage.value = options.itemsPerPage;
};

const onEnableCredentialsMCPAccess = async (credentialIds: string[]) => {
	try {
		const response = await mcpStore.toggleCredentialsMcpAccess(credentialIds, true);
		showMcpAccessUpdatedToast(response.updatedIds.length, true);
		credentialsTableState.value = { ...credentialsTableState.value, page: 0 };
		await fetchCredentials();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.credentials.toggle.error.title'));
		throw error;
	}
};

const onRemoveCredentialsMCPAccess = async (credentialIds: string[]) => {
	if (credentialIds.length === 0) return;
	try {
		const response = await mcpStore.toggleCredentialsMcpAccess(credentialIds, false);
		showMcpAccessUpdatedToast(response.updatedIds.length, false);
		await fetchCredentials();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.credentials.toggle.error.title'));
	}
};

const openConnectCredentialsModal = () => {
	showConnectCredentialsDialog.value = true;
};

const onBack = () => {
	void router.push({ name: MCP_SETTINGS_VIEW });
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp.credentialsExposed.page.title'));
	if (!mcpStore.mcpAccessEnabled) {
		await router.replace({ name: MCP_SETTINGS_VIEW });
		return;
	}
	// The type names and icons are a nicety: the table shows the raw type until they load.
	void capabilityRegistry
		.tryUse(capabilities.credentialTypeNames)
		?.load()
		.catch(() => {});
	await fetchCredentials();
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
			:title="i18n.baseText('settings.mcp.credentialsExposed.page.title')"
			:description="i18n.baseText('settings.mcp.credentialsExposed.page.description')"
			:docs-url="MCP_DOCS_PAGE_URL"
		/>
		<div data-test-id="mcp-credentials-view">
			<N8nNotice
				v-if="isCredentialUseBlocked"
				theme="warning"
				:class="$style.notice"
				data-test-id="mcp-credentials-blocked-notice"
				:content="i18n.baseText('settings.mcp.credentialsExposed.blockedNotice')"
			/>
			<div :class="$style.actions">
				<N8nButton
					v-if="exposedCredentials.length > 0"
					variant="solid"
					:label="i18n.baseText('settings.mcp.connectCredentials')"
					data-test-id="mcp-connect-credentials-header-button"
					size="small"
					@click="openConnectCredentialsModal"
				/>
				<N8nTooltip :content="i18n.baseText('settings.mcp.refresh.tooltip')">
					<N8nButton
						variant="outline"
						icon-only
						data-test-id="mcp-credentials-refresh-button"
						size="small"
						icon="refresh-cw"
						@click="fetchCredentials"
					/>
				</N8nTooltip>
			</div>
			<CredentialsTable
				v-model:table-options="credentialsTableState"
				:credentials="pageCredentials"
				:total-count="exposedCredentials.length"
				:loading="credentialsLoading"
				:can-connect="connectableCredentials.length > 0"
				@remove-mcp-access="(credential) => onRemoveCredentialsMCPAccess([credential.id])"
				@bulk-remove-mcp-access="onRemoveCredentialsMCPAccess"
				@connect-credentials="openConnectCredentialsModal"
				@update:options="onCredentialsTableUpdate"
			/>
		</div>
		<MCPConnectCredentialsModal
			v-model:open="showConnectCredentialsDialog"
			:credentials="connectableCredentials"
			:enable-mcp-access="onEnableCredentialsMCPAccess"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}

/* Pin the back action to the top-left of the settings area (the shell's
   content container is position: relative), independent of the centered column. */
.layout > div:first-child {
	position: absolute;
	top: var(--spacing--lg);
	left: var(--spacing--lg);
	width: auto;
}

.notice {
	margin: 0 0 var(--spacing--sm);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
}
</style>
