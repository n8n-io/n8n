<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';
import type { OAuthClientResponseDto } from '@n8n/api-types';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import type { OAuthClientFilters } from '@/features/ai/mcpAccess/clients.utils';
import OAuthClientsTable from '@/features/ai/mcpAccess/components/tabs/OAuthClientsTable.vue';
import RevokeOAuthClientConfirmModal from '@/features/ai/mcpAccess/components/RevokeOAuthClientConfirmModal.vue';
import {
	LOADING_INDICATOR_TIMEOUT,
	MCP_SETTINGS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUsersStore } from '@/features/settings/users/users.store';

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const router = useRouter();
const documentTitle = useDocumentTitle();
const mcpStore = useMCPStore();
const usersStore = useUsersStore();

const oAuthClientsLoading = ref(false);
const revokeClient = ref<OAuthClientResponseDto | null>(null);
const revoking = ref(false);

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
			telemetry.track('User viewed all MCP clients');
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	} finally {
		setTimeout(() => {
			oAuthClientsLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
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

const onRevokeRequest = (client: OAuthClientResponseDto) => {
	revokeClient.value = client;
};

const onRevokeConfirm = async () => {
	const client = revokeClient.value;
	if (!client) return;
	try {
		revoking.value = true;
		await mcpStore.removeOAuthClient(client.id, client.owner?.id);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.mcp.oAuthClients.revoke.success.title'),
			message: i18n.baseText('settings.mcp.oAuthClients.revoke.success.message', {
				interpolate: { name: client.name },
			}),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.oAuthClients.revoke.error'));
	} finally {
		revoking.value = false;
		revokeClient.value = null;
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
			:show-docs-link="false"
		/>
		<div data-test-id="mcp-clients-view">
			<OAuthClientsTable
				:data-test-id="'mcp-oauth-clients-table'"
				:clients="mcpStore.oauthClients"
				:scope-tools="mcpStore.oauthClientScopeTools"
				:loading="oAuthClientsLoading"
				@revoke-client="onRevokeRequest"
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
			:revoking-for-other="
				!!revokeClient?.owner && revokeClient.owner.id !== usersStore.currentUser?.id
			"
			@confirm="onRevokeConfirm"
			@cancel="revokeClient = null"
			@update:open="revokeClient = null"
		/>
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
</style>
