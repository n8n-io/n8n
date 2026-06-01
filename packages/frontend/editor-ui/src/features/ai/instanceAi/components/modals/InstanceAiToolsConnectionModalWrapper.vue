<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
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

const props = defineProps<{
	modalName: string;
}>();

const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const mcpStore = useInstanceAiMcpStore();

const modalState = computed(() => uiStore.modalsById[props.modalName] ?? null);
const isOpen = computed({
	get: () => modalState.value?.open === true,
	set: (value: boolean) => {
		if (!value) uiStore.closeModal(props.modalName);
	},
});

const detailItem = ref<ToolConnectionItem | null>(null);

const detailMode = computed<'detail' | 'settings'>(() =>
	detailItem.value?.isConnected ? 'settings' : 'detail',
);

interface PendingCredentialContext {
	serverSlug: string;
	credentialType: string;
	snapshotIds: Set<string>;
}

const pendingCredentialContext = ref<PendingCredentialContext | null>(null);

// ModalRoot only renders this wrapper while the modal is open, so isOpen is
// already true on mount — kick off the lazy catalog fetch here rather than via
// a transition watcher (which wouldn't fire on initial true).
onMounted(async () => {
	void mcpStore.fetchCatalogLazy();
	// Also ensure connections are loaded if the user opens the modal before
	// ConnectionsCard has mounted (e.g. opened via a deep link).
	void mcpStore.fetchConnections();

	const payload = modalState.value?.data as { connectionId?: string } | undefined;
	const connectionId = payload?.connectionId;
	if (!connectionId) return;

	// Deep-link from a sidebar row: wait for both data sources, then snap to
	// the connection's settings view.
	await Promise.all([mcpStore.fetchCatalogLazy(), mcpStore.fetchConnections()]);
	const item = items.value.find((i) => i.id === connectionId);
	if (item) detailItem.value = item;
});

watch(isOpen, (open) => {
	if (!open) {
		detailItem.value = null;
		pendingCredentialContext.value = null;
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
		iconSource: server.icons[0]?.src ? { type: 'file', src: server.icons[0].src } : undefined,
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
		publisher: server.isOfficial
			? { name: server.title, url: server.websiteUrl }
			: server.websiteUrl
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

const credentialAdapter: ToolConnectionCredentialAdapter = {
	getCredentialsByType: (authType: string): readonly PickableCredential[] => {
		const creds = credentialsStore.getCredentialsByType(authType);
		return creds.map((c) => ({ id: c.id, name: c.name, type: c.type }));
	},
	openNewCredential: (authType: string) => {
		const server = detailItem.value ? findServerForItem(detailItem.value) : undefined;
		if (server) {
			pendingCredentialContext.value = {
				serverSlug: server.slug,
				credentialType: authType,
				snapshotIds: new Set(credentialsStore.getCredentialsByType(authType).map((c) => c.id)),
			};
		}
		uiStore.openNewCredential(
			authType,
			false,
			false,
			undefined,
			undefined,
			undefined,
			undefined,
			// Force body mount so the credential dialog stacks above the reka-ui
			// `ToolsConnectionModal` we're hosted inside.
			{ appendToBody: true },
		);
	},
};

provide(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, credentialAdapter);

// Auto-connect after credential creation: when the credential modal closes
// after the user opened it from our picker, defensively refresh credentials
// (because `CredentialEdit.vue` fires `fetchAllCredentials()` without await
// on the OAuth callback), then connect if exactly one new credential of the
// expected type appeared. Swap `detailItem` to the connected version so the
// modal flips to the settings view (via `detailMode` computed).
watch(
	() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open,
	async (isCredentialModalOpen, wasOpen) => {
		const ctx = pendingCredentialContext.value;
		if (!ctx || !wasOpen || isCredentialModalOpen) return;
		pendingCredentialContext.value = null;

		await credentialsStore.fetchAllCredentials();
		const current = credentialsStore.getCredentialsByType(ctx.credentialType);
		const newCreds = current.filter((c) => !ctx.snapshotIds.has(c.id));
		if (newCreds.length !== 1) return;

		const created = await mcpStore.connect({
			serverSlug: ctx.serverSlug,
			credentialId: newCreds[0].id,
		});
		if (!created) return;

		const next = items.value.find((i) => i.id === created.id);
		if (next) detailItem.value = next;
	},
);

function findServerForItem(item: ToolConnectionItem): McpRegistryServerResponse | undefined {
	if (item.kind !== 'mcp-server') return undefined;
	// Connected items use connection.id; unconnected items use server.slug
	const connection = mcpStore.connections.find((c) => c.id === item.id);
	const slug = connection?.serverSlug ?? item.id;
	return mcpStore.catalog?.find((s) => s.slug === slug);
}

async function handleSelectCredential(
	item: ToolConnectionItem,
	_authType: string,
	credentialId: string,
) {
	if (item.kind !== 'mcp-server') return;
	if (item.isConnected) return;
	const server = findServerForItem(item);
	if (!server) return;
	await mcpStore.connect({ serverSlug: server.slug, credentialId });
}

async function handleSave(item: ToolConnectionItem, settings?: ToolConnectionSettings) {
	if (item.kind !== 'mcp-server') return;
	if (!item.isConnected) return;
	if (!settings) return;
	await mcpStore.updateSettings(item.id, {
		inclusionMode: settings.inclusionMode,
		selectedTools: settings.selectedTools,
		excludedTools: settings.excludedTools,
	});
}

async function handleDisconnect(item: ToolConnectionItem) {
	if (item.kind !== 'mcp-server' || !item.isConnected) return;
	await mcpStore.disconnect(item.id);
	detailItem.value = null;
}
</script>

<template>
	<ToolsConnectionModal
		v-model:open="isOpen"
		:items="items"
		:sections="['connected', 'nodes']"
		:detail-item="detailItem"
		:detail-mode="detailMode"
		@update:detail-item="(item) => (detailItem = item)"
		@select-credential="handleSelectCredential"
		@save="handleSave"
		@disconnect="handleDisconnect"
	>
		<template #settings-body="{ item, onSave, onDisconnect }">
			<McpToolSettingsContent
				v-if="item.kind === 'mcp-server'"
				:item="item as McpServerConnectionItem"
				@save="(settings: McpToolSettings) => onSave(settings)"
				@disconnect="onDisconnect"
			/>
		</template>
	</ToolsConnectionModal>
</template>
