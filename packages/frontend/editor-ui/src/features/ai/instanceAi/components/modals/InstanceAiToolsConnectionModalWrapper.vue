<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { i18n } from '@n8n/i18n';
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
const toast = useToast();

function readConnectionIdPayload(data: unknown): string | undefined {
	if (data === null || typeof data !== 'object') return undefined;
	const value = (data as Record<string, unknown>).connectionId;
	return typeof value === 'string' ? value : undefined;
}

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
//
// Track in-flight initial fetches so other code paths (deep-link below,
// auto-connect snapshot) can await them instead of issuing duplicate requests.
const catalogPromise = ref<Promise<unknown> | null>(null);
const connectionsPromise = ref<Promise<unknown> | null>(null);
const credentialsPromise = ref<Promise<unknown> | null>(null);

onMounted(async () => {
	catalogPromise.value = mcpStore.fetchCatalogLazy();
	// Also ensure connections are loaded if the user opens the modal before
	// ConnectionsCard has mounted (e.g. opened via a deep link).
	connectionsPromise.value = mcpStore.fetchConnections();
	// Pre-load credentials so the picker is populated on first open. The
	// credentials store is only auto-refreshed by `CredentialEdit.vue` after
	// OAuth, so without this the picker is empty until the user creates a
	// credential.
	credentialsPromise.value = credentialsStore.fetchAllCredentials();

	const connectionId = readConnectionIdPayload(modalState.value?.data);
	if (!connectionId) return;

	// Deep-link from a sidebar row: wait for the in-flight fetches above and
	// then snap to the connection's settings view.
	await Promise.all([catalogPromise.value, connectionsPromise.value]);
	const item = items.value.find((i) => i.id === connectionId);
	if (item) detailItem.value = item;
});

// `closeModal` keeps `modalsById[KEY].data` around, so opening from the +
// button (which uses plain `openModal(...)`) would inherit a stale payload
// from a prior row Setup click. Clear it when this wrapper unmounts so the
// next open starts fresh without every caller needing to pass `data: {}`.
onBeforeUnmount(() => {
	const state = uiStore.modalsById[props.modalName];
	if (state && state.data && Object.keys(state.data).length > 0) {
		state.data = {};
	}
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

/**
 * Open the credential-edit modal for `authType`. The credential dialog needs
 * to mount on body (not `#app-modals`) so it stacks above the reka-ui-based
 * `ToolsConnectionModal` we're hosted inside.
 */
function openCredentialEditForAuthType(authType: string): void {
	uiStore.openNewCredential(
		authType,
		/* showAuthOptions */ false,
		/* forceManualMode */ false,
		/* projectId */ undefined,
		/* suggestedName */ undefined,
		/* nodeName */ undefined,
		/* contextNode */ undefined,
		{ appendToBody: true },
	);
}

const credentialAdapter: ToolConnectionCredentialAdapter = {
	getCredentialsByType: (authType: string): readonly PickableCredential[] => {
		const creds = credentialsStore.getCredentialsByType(authType);
		return creds.map((c) => ({ id: c.id, name: c.name, type: c.type }));
	},
	openNewCredential: (authType: string) => {
		void (async () => {
			// Make sure the snapshot reflects what's actually in the store. If the
			// initial credentials fetch hasn't resolved yet, an empty snapshot can
			// later look like the credential is "new" even though it pre-existed.
			if (credentialsPromise.value) await credentialsPromise.value;

			const server = detailItem.value ? findServerForItem(detailItem.value) : undefined;
			if (server) {
				pendingCredentialContext.value = {
					serverSlug: server.slug,
					credentialType: authType,
					snapshotIds: new Set(credentialsStore.getCredentialsByType(authType).map((c) => c.id)),
				};
			}
			openCredentialEditForAuthType(authType);
		})();
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

		// User cancelled OAuth or the credential wasn't saved — no-op silently.
		if (newCreds.length === 0) return;

		// More than one new credential appeared during the same window (e.g. a
		// concurrent tab created one). We can't reliably know which is the
		// user's choice, so surface a hint instead of guessing.
		if (newCreds.length > 1) {
			toast.showMessage({
				type: 'info',
				title: i18n.baseText('instanceAi.mcp.error.autoConnectAmbiguous.title'),
				message: i18n.baseText('instanceAi.mcp.error.autoConnectAmbiguous.message'),
			});
			return;
		}

		const created = await mcpStore.connect({
			serverSlug: ctx.serverSlug,
			credentialId: newCreds[0].id,
		});
		if (!created) return;

		uiStore.closeModal(props.modalName);
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
	const created = await mcpStore.connect({ serverSlug: server.slug, credentialId });
	if (created) uiStore.closeModal(props.modalName);
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
