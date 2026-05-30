<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import {
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	type McpServerConnectionItem,
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

watch(isOpen, async (open) => {
	if (open) {
		await mcpStore.fetchCatalogLazy();
	} else {
		detailItem.value = null;
	}
});

const AUTH_TYPE_TO_CREDENTIAL_TYPE: Record<string, string> = {
	oauth2: 'mcpOAuth2Api',
};

function credentialTypeFor(server: McpRegistryServerResponse): string {
	return AUTH_TYPE_TO_CREDENTIAL_TYPE[server.authType] ?? server.authType;
}

function categoryForTool(tool: McpRegistryServerToolResponse): 'read' | 'write' | undefined {
	if (tool.annotations?.readOnlyHint === true) return 'read';
	if (tool.annotations?.readOnlyHint === false) return 'write';
	return undefined;
}

function buildItem(
	server: McpRegistryServerResponse,
	connection: InstanceAiMcpConnectionResponse | undefined,
): McpServerConnectionItem {
	const credType = credentialTypeFor(server);
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
				authType: credType,
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
		uiStore.openNewCredential(authType, false, false);
	},
};

provide(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, credentialAdapter);

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
		@update:detail-item="(item) => (detailItem = item)"
		@select-credential="handleSelectCredential"
		@save="handleSave"
		@disconnect="handleDisconnect"
	/>
</template>
