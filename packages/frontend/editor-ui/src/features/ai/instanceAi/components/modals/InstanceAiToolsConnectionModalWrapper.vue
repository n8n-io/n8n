<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, watch, type Component } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { i18n } from '@n8n/i18n';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { useInstanceAiMcpConnectionsExperiment } from '@/experiments/instanceAiMcpConnections';
import DefaultDetailBody from '@/features/shared/toolsConnection/DefaultDetailBody.vue';
import McpDetailBody from '@/features/shared/toolsConnection/McpDetailBody.vue';
import McpToolSettingsContent from '@/features/shared/toolsConnection/McpToolSettingsContent.vue';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import {
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	type McpServerConnectionItem,
	type McpServerTool,
	type McpToolSettings,
	type PickableCredential,
	type ServiceConnectionItem,
	type ToolConnectionCredentialAdapter,
	type ToolConnectionItem,
	type ToolConnectionSettings,
} from '@/features/shared/toolsConnection/types';
import { useInstanceAiMcpStore } from '../../instanceAiMcp.store';
import { useInstanceAiMcpTelemetry } from '../../instanceAiMcp.telemetry';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import type {
	InstanceAiMcpConnectionResponse,
	InstanceAiMcpConnectionToolResponse,
	McpRegistryServerResponse,
	McpRegistryServerToolResponse,
} from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import { iconForTool } from '../../toolIcons';
import BrowserUseSetupContent from './BrowserUseSetupContent.vue';
import ComputerUseSetupContent from './ComputerUseSetupContent.vue';
import { useInstanceAiComputerUseExperiment } from '@/experiments/instanceAiComputerUse';
import { useInstanceAiBrowserUseExperiment } from '@/experiments/instanceAiBrowserUse';
import { BROWSER_USE_CONNECTION_TYPE, COMPUTER_USE_CONNECTION_TYPE } from '../../constants';

interface ServiceConnectionDefinition {
	id: string;
	titleKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	iconSource: ServiceConnectionItem['iconSource'];
	detailComponent: Component;
	detailProps?: Record<string, unknown>;
	isAvailable: boolean;
	isConnected: boolean;
}

const props = defineProps<{
	modalName: string;
}>();

const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const mcpStore = useInstanceAiMcpStore();
const mcpTelemetry = useInstanceAiMcpTelemetry();
const settingsStore = useInstanceAiSettingsStore();
const toast = useToast();
const { canOAuthCredentialQuickConnect, createAndAuthorize } = useCredentialOAuth();
const { isFeatureEnabled: isMcpFeatureEnabled } = useInstanceAiMcpConnectionsExperiment();
const { isFeatureEnabled: isComputerUseFeatureEnabled } = useInstanceAiComputerUseExperiment();
const { isFeatureEnabled: isBrowserUseFeatureEnabled } = useInstanceAiBrowserUseExperiment();

const isMcpEnabled = computed(
	() => isMcpFeatureEnabled.value && settingsStore.settings?.mcpAccessEnabled,
);
const isComputerUseEnabled = computed(
	() => isComputerUseFeatureEnabled.value && !settingsStore.isLocalGatewayDisabledByAdmin,
);
const isBrowserUseEnabled = computed(
	() => isBrowserUseFeatureEnabled.value && settingsStore.isBrowserUseEnabledByAdmin,
);

function readConnectionIdPayload(data: unknown): string | null {
	if (data === null || typeof data !== 'object') return null;
	const value = (data as Record<string, unknown>).connectionId;
	return typeof value === 'string' ? value : null;
}

const modalState = computed(() => uiStore.modalsById[props.modalName] ?? null);
const isCredentialModalOpen = computed(
	() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open === true,
);
const isOpen = computed({
	// Hide tools connection modal when the credential modal is open
	// because it's not properly rendered on top of the tools modal
	get: () => !isCredentialModalOpen.value,
	set: (value: boolean) => {
		if (!value) uiStore.closeModal(props.modalName);
	},
});

const activeItemId = ref(readConnectionIdPayload(modalState.value?.data));

// If there is a connection ID in the modal data, the modal is being opened
// for a particular connection, not from a list, so we don't show the back button
const shouldHideBackButton = computed(() => !!readConnectionIdPayload(modalState.value?.data));

const detailItem = computed<ToolConnectionItem | null>(() => {
	return activeItemId.value ? (items.value.find((i) => i.id === activeItemId.value) ?? null) : null;
});

const detailMode = computed<'detail' | 'settings'>(() =>
	detailItem.value?.kind === 'mcp-server' && detailItem.value.isConnected ? 'settings' : 'detail',
);

interface PendingCredentialContext {
	serverSlug: string;
	credentialType: string;
	existingCredentialIds: Set<string>;
}

const pendingCredentialContext = ref<PendingCredentialContext | null>(null);

type McpToolMetadata = McpRegistryServerToolResponse | InstanceAiMcpConnectionToolResponse;

async function connectOrSwapCredential(serverSlug: string, credentialId: string): Promise<boolean> {
	const existing = mcpStore.connections.find((c) => c.serverSlug === serverSlug);
	if (!existing) {
		const result = await mcpStore.connect({ serverSlug, credentialId });
		if (result) {
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('instanceAi.mcp.success.connect'),
			});
		}
		return Boolean(result);
	}

	if (existing.credentialId === credentialId) {
		return false;
	}

	const updated = await mcpStore.updateConnection(existing.id, { credentialId });
	if (updated) {
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('instanceAi.mcp.success.changeCredential'),
		});
	}
	return Boolean(updated);
}

if (isMcpEnabled.value) {
	void mcpStore.fetchCatalogLazy();
	void mcpStore.fetchConnections();
}

const credentialsPromise = isMcpEnabled.value
	? credentialsStore.fetchAllCredentials()
	: Promise.resolve([]);

// Clear the state on close so the next open starts
// fresh without every caller needing to pass `data: {}`
onBeforeUnmount(() => {
	const state = uiStore.modalsById[props.modalName];
	if (state?.data && Object.keys(state.data).length > 0) {
		state.data = {};
	}
});

function categoryForTool(
	tool: McpRegistryServerToolResponse | undefined,
): 'read' | 'write' | undefined {
	if (tool?.annotations?.readOnlyHint === true) return 'read';
	if (tool?.annotations?.readOnlyHint === false) return 'write';
	return undefined;
}

function toMcpServerTool(
	tool: McpToolMetadata,
	categorySource?: McpRegistryServerToolResponse,
): McpServerTool {
	const out: McpServerTool = {
		id: tool.name,
		name: tool.name,
	};
	const category = categoryForTool(categorySource);
	if (category !== undefined) out.category = category;
	if ('description' in tool && tool.description) out.description = tool.description;
	return out;
}

function settingsForConnection(connection: InstanceAiMcpConnectionResponse): McpToolSettings {
	if (!connection.toolFilter) {
		return { inclusionMode: 'all', selectedTools: [], excludedTools: [] };
	}

	if (connection.toolFilter.mode === 'allow') {
		return {
			inclusionMode: 'selected',
			selectedTools: [...connection.toolFilter.tools],
			excludedTools: [],
		};
	}

	return {
		inclusionMode: 'except',
		selectedTools: [],
		excludedTools: [...connection.toolFilter.tools],
	};
}

function availableToolsForServer(
	server: McpRegistryServerResponse,
	connection: InstanceAiMcpConnectionResponse | undefined,
): McpServerTool[] {
	const liveTools = connection ? mcpStore.connectionToolsById.get(connection.id) : undefined;
	if (!liveTools) return server.tools.map((tool) => toMcpServerTool(tool, tool));

	const registryToolByName = new Map(server.tools.map((tool) => [tool.name, tool]));
	return liveTools.map((tool) => toMcpServerTool(tool, registryToolByName.get(tool.name)));
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
		availableTools: availableToolsForServer(server, connection),
		...(connection ? { settings: settingsForConnection(connection) } : {}),
		publisher:
			server.isOfficial || server.websiteUrl
				? { name: server.title, url: server.websiteUrl }
				: undefined,
		version: server.version,
		docsUrl: server.websiteUrl,
	};
}

const builtInServiceDefinitions = computed<ServiceConnectionDefinition[]>(() => {
	return [
		{
			id: BROWSER_USE_CONNECTION_TYPE,
			titleKey: 'instanceAi.connections.add.browserUse',
			descriptionKey: 'instanceAi.connections.types.browserUse.description',
			iconSource: { type: 'icon', name: 'globe' },
			detailComponent: BrowserUseSetupContent,
			detailProps: { embedded: true },
			isAvailable: isBrowserUseEnabled.value,
			isConnected: settingsStore.isBrowserUseConnected,
		},
		{
			id: COMPUTER_USE_CONNECTION_TYPE,
			titleKey: 'instanceAi.connections.add.computerUse',
			descriptionKey: 'instanceAi.connections.types.computerUse.description',
			iconSource: { type: 'icon', name: 'mouse-pointer' },
			detailComponent: ComputerUseSetupContent,
			detailProps: { embedded: true },
			isAvailable: isComputerUseEnabled.value,
			isConnected: settingsStore.isGatewayConnected,
		},
	];
});

const serviceItems = computed<ServiceConnectionItem[]>(() => {
	return builtInServiceDefinitions.value
		.filter((service) => service.isAvailable)
		.map((service) => ({
			id: service.id,
			kind: 'service',
			serviceId: service.id,
			title: i18n.baseText(service.titleKey),
			description: i18n.baseText(service.descriptionKey),
			isConnected: service.isConnected,
			iconSource: service.iconSource,
		}));
});

const activeServiceDefinition = computed<ServiceConnectionDefinition | null>(() => {
	const item = detailItem.value;
	if (item?.kind !== 'service') return null;
	return builtInServiceDefinitions.value.find((service) => service.id === item.serviceId) ?? null;
});

const items = computed<ToolConnectionItem[]>(() => {
	const out: ToolConnectionItem[] = [...serviceItems.value];
	if (isMcpEnabled.value) {
		const catalog = mcpStore.catalog ?? [];
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
	}

	return out;
});

watch(
	() => (detailMode.value === 'settings' ? detailItem.value : null),
	(item) => {
		if (!item?.isConnected || item.kind !== 'mcp-server') return;
		void mcpStore.fetchConnectionToolsLazy(item.id);
	},
	{ immediate: true },
);

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
	activeItemId.value = mcpStore.connections.find((c) => c.serverSlug === serverSlug)?.id ?? null;
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
			const item = detailItem.value;
			const server = item?.kind === 'mcp-server' ? findServerForItem(item) : undefined;
			if (!server) {
				// Detail view isn't open or the item isn't an MCP server — fall back
				// to the bare modal so the user can still create a credential.
				uiStore.openNewCredential(authType);
				return;
			}
			await createCredentialAndConnect(server);
		})();
	},
	openExistingCredential: (credentialId: string) => {
		uiStore.openExistingCredential(credentialId);
	},
};

provide(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, credentialAdapter);

// Once the credential modal is closed, if a new
// credential was created, create a connection for it
watch(
	() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open,
	async (isCredentialModalOpen, wasOpen) => {
		if (!wasOpen || isCredentialModalOpen) return;

		const ctx = pendingCredentialContext.value;
		pendingCredentialContext.value = null;
		await Promise.all([credentialsStore.fetchAllCredentials(), mcpStore.fetchConnections()]);

		if (!ctx) return;

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

function findServerForItem(item: McpServerConnectionItem): McpRegistryServerResponse | undefined {
	const connection = mcpStore.connections.find((c) => c.id === item.id);
	const slug = connection?.serverSlug ?? item.id;
	return mcpStore.catalog?.find((s) => s.slug === slug);
}

function trackMcpCredentialInteraction(
	item: ToolConnectionItem,
	track: (serverSlug: string) => void,
): void {
	if (item.kind !== 'mcp-server') return;
	const server = findServerForItem(item);
	if (!server) return;
	track(server.slug);
}

function handleFirstCredentialConnect(item: ToolConnectionItem): void {
	trackMcpCredentialInteraction(item, (serverSlug) => {
		mcpTelemetry.trackFirstCredentialConnectionStart(serverSlug);
	});
}

function handleCredentialDropdownOpen(item: ToolConnectionItem): void {
	trackMcpCredentialInteraction(item, (serverSlug) => {
		mcpTelemetry.trackCredentialDropdownOpened(serverSlug);
	});
}

function handleNewCredentialConnect(item: ToolConnectionItem): void {
	trackMcpCredentialInteraction(item, (serverSlug) => {
		mcpTelemetry.trackNewCredentialConnectionStart(serverSlug);
	});
}

async function handleSelectCredential(
	item: ToolConnectionItem,
	_authType: string,
	credentialId: string,
) {
	if (item.kind !== 'mcp-server') return;
	const server = findServerForItem(item);
	if (!server) return;
	mcpTelemetry.trackExistingCredentialSelected(server.slug);
	const ok = await connectOrSwapCredential(server.slug, credentialId);
	if (ok) showSettingsForServer(server.slug);
}

async function handleSave(item: ToolConnectionItem, settings?: ToolConnectionSettings) {
	if (!settings) return;
	const updated = await mcpStore.updateConnection(item.id, {
		inclusionMode: settings.inclusionMode,
		selectedTools: settings.selectedTools,
		excludedTools: settings.excludedTools,
	});
	if (!updated) return;
	mcpTelemetry.trackToolFilterSettingsUpdated(updated.serverSlug, settings.inclusionMode);
	toast.showMessage({
		type: 'success',
		title: i18n.baseText('instanceAi.mcp.settings.saved'),
	});
}

async function handleDisconnect(item: ToolConnectionItem) {
	const disconnected = await mcpStore.disconnect(item.id);
	if (!disconnected) return;
	activeItemId.value = null;
}

async function handleConnect(item: ToolConnectionItem) {
	switch (item.kind) {
		case 'service':
			activeItemId.value = item.id;
			break;
		case 'mcp-server':
			const server = findServerForItem(item);
			if (server) {
				await createCredentialAndConnect(server);
			}
			break;
	}
}
</script>

<template>
	<ToolsConnectionModal
		v-model:open="isOpen"
		:items="items"
		:sections="['connected', 'built-in-services', 'nodes']"
		:detail-item="detailItem"
		:detail-mode="detailMode"
		:hide-back-button="shouldHideBackButton"
		@update:detail-item="(item) => (activeItemId = item?.id ?? null)"
		@select-credential="handleSelectCredential"
		@credential-dropdown-open="handleCredentialDropdownOpen"
		@first-credential-connect="handleFirstCredentialConnect"
		@new-credential-connect="handleNewCredentialConnect"
		@connect="handleConnect"
		@save="handleSave"
		@disconnect="handleDisconnect"
	>
		<template #detail-body="{ item }">
			<template v-if="item.kind === 'service' && activeServiceDefinition">
				<component
					:is="activeServiceDefinition.detailComponent"
					v-bind="activeServiceDefinition.detailProps ?? {}"
				/>
			</template>
			<McpDetailBody v-else-if="item.kind === 'mcp-server'" :item="item" />
			<DefaultDetailBody v-else :item="item" />
		</template>
		<template #settings-body="{ item, onSave, onDisconnect }">
			<McpToolSettingsContent
				v-if="item.kind === 'mcp-server'"
				:item="item"
				@save="(settings: McpToolSettings) => onSave(settings)"
				@disconnect="onDisconnect"
			/>
		</template>
	</ToolsConnectionModal>
</template>
