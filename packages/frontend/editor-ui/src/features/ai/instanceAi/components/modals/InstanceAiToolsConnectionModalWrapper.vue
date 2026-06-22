<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { i18n } from '@n8n/i18n';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import McpToolSettingsContent from '@/features/shared/toolsConnection/McpToolSettingsContent.vue';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import {
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	type McpServerConnectionItem,
	type McpToolSettings,
	type PickableCredential,
	type ToolConnectionCredentialAdapter,
	type ToolConnectionItem,
	type ToolConnectionSettings,
} from '@/features/shared/toolsConnection/types';
import { useInstanceAiMcpStore } from '../../instanceAiMcp.store';
import type {
	InstanceAiMcpConnectionResponse,
	McpRegistryServerResponse,
	McpRegistryServerToolResponse,
} from '@n8n/api-types';
import { iconForTool } from '../../toolIcons';

const props = defineProps<{
	modalName: string;
}>();

const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const mcpStore = useInstanceAiMcpStore();
const toast = useToast();
const { canOAuthCredentialQuickConnect, createAndAuthorize } = useCredentialOAuth();

function readConnectionIdPayload(data: unknown): string | null {
	if (data === null || typeof data !== 'object') return null;
	const value = (data as Record<string, unknown>).connectionId;
	return typeof value === 'string' ? value : null;
}

const modalState = computed(() => uiStore.modalsById[props.modalName] ?? null);
const isOpen = computed({
	get: () => true,
	set: (value: boolean) => {
		if (!value) uiStore.closeModal(props.modalName);
	},
});

const activeMcpConnectionId = ref(readConnectionIdPayload(modalState.value?.data));

const detailItem = computed<ToolConnectionItem | null>(() => {
	return activeMcpConnectionId.value
		? (items.value.find((i) => i.id === activeMcpConnectionId.value) ?? null)
		: null;
});

const detailMode = computed<'detail' | 'settings'>(() =>
	detailItem.value?.isConnected ? 'settings' : 'detail',
);

interface PendingCredentialContext {
	serverSlug: string;
	credentialType: string;
	existingCredentialIds: Set<string>;
}

const pendingCredentialContext = ref<PendingCredentialContext | null>(null);

async function connectOrSwapCredential(serverSlug: string, credentialId: string): Promise<boolean> {
	const existing = mcpStore.connections.find((c) => c.serverSlug === serverSlug);
	if (!existing) {
		const created = await mcpStore.connect({ serverSlug, credentialId });
		return Boolean(created);
	}

	if (existing.credentialId === credentialId) {
		return false;
	}

	const updated = await mcpStore.updateConnection(existing.id, { credentialId });
	return Boolean(updated);
}

void mcpStore.fetchCatalogLazy();
void mcpStore.fetchConnections();
const credentialsPromise = credentialsStore.fetchAllCredentials();

// Clear the state on close so the next open starts
// fresh without every caller needing to pass `data: {}`
onBeforeUnmount(() => {
	const state = uiStore.modalsById[props.modalName];
	if (state && state.data && Object.keys(state.data).length > 0) {
		state.data = {};
	}
});

function categoryForTool(tool: McpRegistryServerToolResponse): 'read' | 'write' | undefined {
	if (tool.annotations?.readOnlyHint === true) return 'read';
	if (tool.annotations?.readOnlyHint === false) return 'write';
	return undefined;
}

function buildItem(
	server: McpRegistryServerResponse,
	connection: InstanceAiMcpConnectionResponse | undefined,
): McpServerConnectionItem {
	return {
		id: connection?.id ?? server.slug,
		kind: 'mcp-server',
		title: server.title,
		description: server.tagline,
		longDescription: server.description,
		isConnected: Boolean(connection),
		iconSource: iconForTool(server.icons, uiStore.appliedTheme),
		credentials: [
			{
				authType: server.credentialType,
				credentialId: connection?.credentialId,
				required: true,
			},
		],
		availableTools: server.tools.map((tool) => ({
			id: tool.name,
			name: tool.title ?? tool.name,
			category: categoryForTool(tool),
		})),
		publisher:
			server.isOfficial || server.websiteUrl
				? { name: server.title, url: server.websiteUrl }
				: undefined,
		version: server.version,
		docsUrl: server.websiteUrl,
	};
}

const items = computed<ToolConnectionItem[]>(() => {
	const catalog = mcpStore.catalog ?? [];
	const out: ToolConnectionItem[] = [];
	for (const server of catalog) {
		const connections = mcpStore.connectionsByServerSlug.get(server.slug) ?? [];
		if (connections.length === 0) {
			out.push(buildItem(server, undefined));
			continue;
		}
		for (const connection of connections) {
			out.push(buildItem(server, connection));
		}
	}
	return out;
});

async function openCredentialEditModal(server: McpRegistryServerResponse): Promise<void> {
	await credentialsPromise;
	pendingCredentialContext.value = {
		serverSlug: server.slug,
		credentialType: server.credentialType,
		existingCredentialIds: new Set(
			credentialsStore.getCredentialsByType(server.credentialType).map((c) => c.id),
		),
	};
	uiStore.openNewCredential(server.credentialType);
}

function showSettingsForServer(serverSlug: string): void {
	activeMcpConnectionId.value =
		mcpStore.connections.find((c) => c.serverSlug === serverSlug)?.id ?? null;
}

async function createCredentialAndConnect(server: McpRegistryServerResponse): Promise<void> {
	if (canOAuthCredentialQuickConnect(server.credentialType)) {
		const credential = await createAndAuthorize(server.credentialType);
		if (!credential) return;
		const ok = await connectOrSwapCredential(server.slug, credential.id);
		if (ok) showSettingsForServer(server.slug);
		return;
	}
	await openCredentialEditModal(server);
}

const credentialAdapter: ToolConnectionCredentialAdapter = {
	getCredentialsByType: (authType: string): readonly PickableCredential[] => {
		const creds = credentialsStore.getCredentialsByType(authType);
		return creds.map((c) => ({ id: c.id, name: c.name, type: c.type }));
	},
	openNewCredential: (authType: string) => {
		void (async () => {
			const server = detailItem.value ? findServerForItem(detailItem.value) : undefined;
			if (!server) {
				// Detail view isn't open or the item isn't an MCP server — fall back
				// to the bare modal so the user can still create a credential.
				uiStore.openNewCredential(authType);
				return;
			}
			await createCredentialAndConnect(server);
		})();
	},
};

provide(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, credentialAdapter);

// Once the credential modal is closed, if a new
// credential was created, create a connection for it
watch(
	() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open,
	async (isCredentialModalOpen, wasOpen) => {
		const ctx = pendingCredentialContext.value;
		if (!ctx || !wasOpen || isCredentialModalOpen) return;
		pendingCredentialContext.value = null;

		await credentialsStore.fetchAllCredentials();
		const current = credentialsStore.getCredentialsByType(ctx.credentialType);
		const newCreds = current.filter((c) => !ctx.existingCredentialIds.has(c.id));

		if (newCreds.length === 0) return;

		if (newCreds.length > 1) {
			toast.showMessage({
				type: 'info',
				title: i18n.baseText('instanceAi.mcp.error.autoConnectAmbiguous.title'),
				message: i18n.baseText('instanceAi.mcp.error.autoConnectAmbiguous.message'),
			});
			return;
		}

		const ok = await connectOrSwapCredential(ctx.serverSlug, newCreds[0].id);
		if (ok) showSettingsForServer(ctx.serverSlug);
	},
);

function findServerForItem(item: ToolConnectionItem): McpRegistryServerResponse | undefined {
	const connection = mcpStore.connections.find((c) => c.id === item.id);
	const slug = connection?.serverSlug ?? item.id;
	return mcpStore.catalog?.find((s) => s.slug === slug);
}

async function handleSelectCredential(
	item: ToolConnectionItem,
	_authType: string,
	credentialId: string,
) {
	const server = findServerForItem(item);
	if (!server) return;
	const ok = await connectOrSwapCredential(server.slug, credentialId);
	if (ok) showSettingsForServer(server.slug);
}

async function handleSave(item: ToolConnectionItem, settings?: ToolConnectionSettings) {
	if (!item.isConnected) return;
	if (!settings) return;
	// TODO: show success indicator
	await mcpStore.updateConnection(item.id, {
		inclusionMode: settings.inclusionMode,
		selectedTools: settings.selectedTools,
		excludedTools: settings.excludedTools,
	});
}

async function handleDisconnect(item: ToolConnectionItem) {
	if (!item.isConnected) return;
	const disconnected = await mcpStore.disconnect(item.id);
	if (!disconnected) return;
	activeMcpConnectionId.value = null;
}

async function handleConnect(item: ToolConnectionItem) {
	const server = findServerForItem(item);
	if (!server) return;
	await createCredentialAndConnect(server);
}
</script>

<template>
	<ToolsConnectionModal
		v-model:open="isOpen"
		:items="items"
		:sections="['connected', 'nodes']"
		:detail-item="detailItem"
		:detail-mode="detailMode"
		@update:detail-item="(item) => (activeMcpConnectionId = item?.id ?? null)"
		@select-credential="handleSelectCredential"
		@connect="handleConnect"
		@save="handleSave"
		@disconnect="handleDisconnect"
	>
		<template #settings-body="{ item, onSave, onDisconnect }">
			<McpToolSettingsContent
				:item="item as McpServerConnectionItem"
				@save="(settings: McpToolSettings) => onSave(settings)"
				@disconnect="onDisconnect"
			/>
		</template>
	</ToolsConnectionModal>
</template>
