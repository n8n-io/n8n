<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
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

const props = defineProps<{
	modalName: string;
}>();

const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const mcpStore = useInstanceAiMcpStore();
const toast = useToast();
const { canOAuthCredentialQuickConnect, createAndAuthorize } = useCredentialOAuth();

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

// Serialize credential swaps so rapid picker clicks can't interleave their
// DELETE+POST sequences and leave the wrong credential connected.
const isSwappingCredential = ref(false);

/**
 * v1 swap: switching the credential of an already-connected server is a
 * client-orchestrated `DELETE` then `POST`, not an atomic backend operation.
 * There's a brief window where the user has no connection, and a race against
 * a concurrent disconnect can fail. Acceptable for v1; revisit with a BE
 * upsert / dedicated swap endpoint when we generalize multi-credential UX.
 */
async function swapOrConnect(serverSlug: string, credentialId: string): Promise<boolean> {
	if (isSwappingCredential.value) return false;
	isSwappingCredential.value = true;
	try {
		const existing = mcpStore.connections.find((c) => c.serverSlug === serverSlug);
		if (existing) {
			if (existing.credentialId === credentialId) return false; // silent re-pick
			const disconnected = await mcpStore.disconnect(existing.id);
			if (!disconnected) return false;
		}
		const created = await mcpStore.connect({ serverSlug, credentialId });
		return Boolean(created);
	} finally {
		isSwappingCredential.value = false;
	}
}

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

/**
 * Open the credential-edit modal in "new" mode for this server's auth type.
 * Slow path: the user goes through the credential modal manually. After the
 * modal closes, the auto-connect watcher diffs the credentials store against
 * the snapshot we capture here and connects (or swaps).
 */
async function openCredentialEditModal(server: McpRegistryServerResponse): Promise<void> {
	// Make sure the snapshot reflects what's actually in the store. If the
	// initial credentials fetch hasn't resolved yet, an empty snapshot can
	// later look like the credential is "new" even though it pre-existed.
	if (credentialsPromise.value) await credentialsPromise.value;

	pendingCredentialContext.value = {
		serverSlug: server.slug,
		credentialType: server.credentialType,
		snapshotIds: new Set(
			credentialsStore.getCredentialsByType(server.credentialType).map((c) => c.id),
		),
	};
	openCredentialEditForAuthType(server.credentialType);
}

/**
 * Connect flow for a chosen MCP server. If the server's credential type
 * qualifies for Quick Connect (OAuth with all config pre-filled, like the
 * registry-generated `notionMcpOAuth2Api`), skip the credential-edit modal
 * entirely — create the credential server-side and run OAuth in one step,
 * then connect. Otherwise fall back to the modal-based path so the user can
 * fill in whatever the credential type needs.
 *
 * Shared by both entry points: the catalog-row Connect button (handleConnect)
 * and the picker's "+ New credential" action (credentialAdapter).
 */
/**
 * After a successful connect or swap, leave the user on the new connection's
 * settings view (instead of closing the modal). `detailMode` is computed from
 * `detailItem.isConnected`, so swapping `detailItem` to the now-connected
 * item flips the view to `ToolSettingsView` (tabbed Settings / Details).
 */
function showSettingsForServer(serverSlug: string): void {
	const connection = mcpStore.connections.find((c) => c.serverSlug === serverSlug);
	if (!connection) return;
	const next = items.value.find((i) => i.id === connection.id);
	if (next) detailItem.value = next;
}

async function createCredentialAndConnect(server: McpRegistryServerResponse): Promise<void> {
	if (canOAuthCredentialQuickConnect(server.credentialType)) {
		const credential = await createAndAuthorize(server.credentialType);
		if (!credential) return;
		const ok = await swapOrConnect(server.slug, credential.id);
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
				openCredentialEditForAuthType(authType);
				return;
			}
			await createCredentialAndConnect(server);
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

		const ok = await swapOrConnect(ctx.serverSlug, newCreds[0].id);
		if (ok) showSettingsForServer(ctx.serverSlug);
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
	const server = findServerForItem(item);
	if (!server) return;
	const ok = await swapOrConnect(server.slug, credentialId);
	if (ok) showSettingsForServer(server.slug);
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

async function handleConnect(item: ToolConnectionItem) {
	if (item.kind !== 'mcp-server') return;
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
		@update:detail-item="(item) => (detailItem = item)"
		@select-credential="handleSelectCredential"
		@connect="handleConnect"
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
