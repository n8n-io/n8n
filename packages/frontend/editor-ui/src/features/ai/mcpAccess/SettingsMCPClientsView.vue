<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import type { OAuthClientFilters } from '@/features/ai/mcpAccess/clients.utils';
import OAuthClientsTable from '@/features/ai/mcpAccess/components/tabs/OAuthClientsTable.vue';
import RevokeOAuthClientConfirmModal from '@/features/ai/mcpAccess/components/RevokeOAuthClientConfirmModal.vue';
import {
	LOADING_INDICATOR_TIMEOUT,
	MCP_DOCS_PAGE_URL,
	MCP_SETTINGS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import { useOAuthClientRevoke } from '@/features/ai/mcpAccess/composables/useOAuthClientRevoke';
import { useRBACStore } from '@n8n/stores/rbac.store';

const i18n = useI18n();
const toast = useToast();
const mcp = useMcp();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const mcpStore = useMCPStore();
const rbacStore = useRBACStore();

const oAuthClientsLoading = ref(false);
const { revokeClient, revoking, isRevokingForOther, requestRevoke, cancelRevoke, confirmRevoke } =
	useOAuthClientRevoke();

const fetchoAuthCLients = async () => {
	try {
		oAuthClientsLoading.value = true;
		await mcpStore.getAllOAuthClients();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	} finally {
		setTimeout(() => {
			oAuthClientsLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

const onOwnershipChange = async (ownership: 'mine' | 'all') => {
	try {
		oAuthClientsLoading.value = true;
		await mcpStore.setOAuthClientsOwnership(ownership);
		if (ownership === 'all') {
			mcp.trackViewedAllClients();
		}
		// Reflect the tab in the URL (replace keeps history clean / back-button safe).
		if (route.query.tab !== ownership) {
			void router.replace({ query: { ...route.query, tab: ownership } });
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	} finally {
		setTimeout(() => {
			oAuthClientsLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
};

/**
 * `?tab=all` deep-links to everyone's clients (the overview sends managers here
 * when they have none of their own). Only honoured for `mcp:manage` holders: the
 * endpoint rejects the instance-wide list for anyone else.
 */
const requestedOwnership = (): 'mine' | 'all' | undefined => {
	if (route.query.tab === 'all') return rbacStore.hasScope('mcp:manage') ? 'all' : 'mine';
	if (route.query.tab === 'mine') return 'mine';
	return undefined;
};

const onClientsFiltersChange = async (filters: OAuthClientFilters) => {
	try {
		await mcpStore.setOAuthClientsFilters(filters);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	}
};

const onClientsOptionsChange = async (options: { page: number; itemsPerPage: number }) => {
	try {
		await mcpStore.setOAuthClientsPagination(options.page, options.itemsPerPage);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	}
};

const onBack = () => {
	void router.push({ name: MCP_SETTINGS_VIEW });
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp.connectedClients.title'));
	if (!mcpStore.mcpAccessEnabled) {
		await router.replace({ name: MCP_SETTINGS_VIEW });
		return;
	}
	const ownership = requestedOwnership();
	if (ownership && ownership !== mcpStore.oauthClientsOwnership) {
		await onOwnershipChange(ownership);
		return;
	}
	await fetchoAuthCLients();
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
			:title="i18n.baseText('settings.mcp.connectedClients.title')"
			:description="i18n.baseText('settings.mcp.connectedClients.description')"
			:docs-url="MCP_DOCS_PAGE_URL"
		/>
		<div data-test-id="mcp-clients-view">
			<OAuthClientsTable
				:data-test-id="'mcp-oauth-clients-table'"
				:clients="mcpStore.oauthClients"
				:scope-tools="mcpStore.oauthClientScopeTools"
				:loading="oAuthClientsLoading"
				@revoke-client="requestRevoke"
				@update:ownership="onOwnershipChange"
				@update:filters="onClientsFiltersChange"
				@update:options="onClientsOptionsChange"
				@refresh="fetchoAuthCLients"
			/>
		</div>

		<RevokeOAuthClientConfirmModal
			:client="revokeClient"
			:open="!!revokeClient"
			:loading="revoking"
			:revoking-for-other="!!revokeClient && isRevokingForOther(revokeClient)"
			@confirm="confirmRevoke"
			@cancel="cancelRevoke"
			@update:open="cancelRevoke"
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
</style>
