<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';
import type { CreateOAuthClientResponseDto, OAuthClientResponseDto } from '@n8n/api-types';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import type { OAuthClientFilters } from '@/features/ai/mcpAccess/clients.utils';
import OAuthClientsTable from '@/features/ai/mcpAccess/components/tabs/OAuthClientsTable.vue';
import RegisterOAuthClientModal from '@/features/ai/mcpAccess/components/RegisterOAuthClientModal.vue';
import RevokeOAuthClientConfirmModal from '@/features/ai/mcpAccess/components/RevokeOAuthClientConfirmModal.vue';
import {
	LOADING_INDICATOR_TIMEOUT,
	MCP_DOCS_PAGE_URL,
	MCP_SETTINGS_VIEW,
} from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUsersStore } from '@n8n/stores/users.store';

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

const registerModalOpen = ref(false);
const registering = ref(false);
/** Set while editing an existing manual registration; null while creating one. */
const editingClient = ref<OAuthClientResponseDto | null>(null);
/** The result step of the register modal: the client id the user has to copy. */
const registeredClient = ref<CreateOAuthClientResponseDto | null>(null);

const openRegisterClientModal = () => {
	editingClient.value = null;
	registeredClient.value = null;
	registerModalOpen.value = true;
};

const onEditClientRequest = (client: OAuthClientResponseDto) => {
	editingClient.value = client;
	registeredClient.value = null;
	registerModalOpen.value = true;
};

const onRegisterClientSubmit = async (payload: {
	name: string;
	redirectUris: string[];
	confidential: boolean;
}) => {
	const editing = editingClient.value;
	try {
		registering.value = true;
		if (editing) {
			await mcpStore.editOAuthClient(editing.id, payload);
			registerModalOpen.value = false;
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('settings.mcp.registerClient.edit.success'),
			});
			return;
		}
		// Keep the modal open on the result step: the generated client id is the
		// only thing the user came for and it isn't shown anywhere else in the flow.
		registeredClient.value = await mcpStore.registerOAuthClient(payload);
		telemetry.track('User registered an MCP client manually');
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText(
				editing
					? 'settings.mcp.registerClient.edit.error'
					: 'settings.mcp.registerClient.error.title',
			),
		);
	} finally {
		registering.value = false;
	}
};

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

/**
 * Replacing a secret reuses the result step, since a new secret is readable
 * exactly once, the same as a fresh registration's.
 */
const onRotateSecret = async (client: OAuthClientResponseDto) => {
	try {
		registering.value = true;
		const clientSecret = await mcpStore.rotateOAuthClientSecret(client.id);
		editingClient.value = null;
		registeredClient.value = {
			id: client.id,
			name: client.name,
			redirectUris: client.redirectUris,
			grantTypes: client.grantTypes,
			tokenEndpointAuthMethod: client.tokenEndpointAuthMethod,
			createdAt: client.createdAt,
			updatedAt: client.updatedAt,
			registration: client.registration,
			clientSecret,
		};
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.mcp.registerClient.rotateSecret.success'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.registerClient.rotateSecret.error'));
	} finally {
		registering.value = false;
	}
};

const onRevokeRequest = (client: OAuthClientResponseDto) => {
	revokeClient.value = client;
};

const onRevokeConfirm = async () => {
	const client = revokeClient.value;
	if (!client) return;
	const deletedRegistration = client.registration === 'manual' && client.canManage === true;
	try {
		revoking.value = true;
		await mcpStore.removeOAuthClient(client.id, client.owner?.id);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText(
				deletedRegistration
					? 'settings.mcp.oAuthClients.delete.success.title'
					: 'settings.mcp.oAuthClients.revoke.success.title',
			),
			message: i18n.baseText(
				deletedRegistration
					? 'settings.mcp.oAuthClients.delete.success.message'
					: 'settings.mcp.oAuthClients.revoke.success.message',
				{ interpolate: { name: client.name } },
			),
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
			:docs-url="MCP_DOCS_PAGE_URL"
		/>
		<div data-test-id="mcp-clients-view">
			<div :class="$style.actions">
				<N8nButton
					variant="solid"
					size="small"
					:label="i18n.baseText('settings.mcp.registerClient.action')"
					data-test-id="mcp-register-client-button"
					@click="openRegisterClientModal"
				/>
			</div>
			<OAuthClientsTable
				:data-test-id="'mcp-oauth-clients-table'"
				:clients="mcpStore.oauthClients"
				:scope-tools="mcpStore.oauthClientScopeTools"
				:loading="oAuthClientsLoading"
				@revoke-client="onRevokeRequest"
				@edit-client="onEditClientRequest"
				@update:ownership="onOwnershipChange"
				@update:filters="onClientsFiltersChange"
				@update:options="onClientsOptionsChange"
				@refresh="fetchoAuthCLients"
			/>
		</div>

		<RegisterOAuthClientModal
			:open="registerModalOpen"
			:client="editingClient"
			:created-client="registeredClient"
			:loading="registering"
			@submit="onRegisterClientSubmit"
			@rotate-secret="onRotateSecret"
			@update:open="registerModalOpen = $event"
		/>

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
.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
}

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
