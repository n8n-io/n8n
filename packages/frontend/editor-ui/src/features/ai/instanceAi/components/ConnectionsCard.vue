<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton, N8nHeading, N8nIconButton } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import {
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from '@/app/constants/modals';
import { useInstanceAiMcpConnectionsExperiment } from '@/experiments/instanceAiMcpConnections';
import { useInstanceAiBrowserUseExperiment } from '@/experiments/instanceAiBrowserUse';
import { useInstanceAiComputerUseExperiment } from '@/experiments/instanceAiComputerUse';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useInstanceAiMcpStore } from '../instanceAiMcp.store';
import { useInstanceAiMcpTelemetry } from '../instanceAiMcp.telemetry';
import ConnectionRow, { ConnectionRowIcon } from './ConnectionRow.vue';
import { iconForTool } from '../toolIcons';
import type { McpRegistryServerIconResponse } from '@n8n/api-types';
import {
	BROWSER_USE_CONNECTION_TYPE,
	COMPUTER_USE_CONNECTION_TYPE,
	type BrowserUseConnectionType,
	type ComputerUseConnectionType,
} from '../constants';

type SingletonConnectionType = ComputerUseConnectionType | BrowserUseConnectionType;
type RowAction = 'connect' | 'disconnect' | 'settings' | 'remove';
type ConnectionStatus = 'connected' | 'waiting' | 'disconnected';

const i18n = useI18n();
const uiStore = useUIStore();
const store = useInstanceAiSettingsStore();
const mcpStore = useInstanceAiMcpStore();
const mcpTelemetry = useInstanceAiMcpTelemetry();
const { isFeatureEnabled: isMcpFeatureEnabled } = useInstanceAiMcpConnectionsExperiment();
const { isFeatureEnabled: isBrowserUseEnabled } = useInstanceAiBrowserUseExperiment();
const { isFeatureEnabled: isComputerUseEnabled } = useInstanceAiComputerUseExperiment();

const props = defineProps<{
	dropdownPortalTarget?: HTMLElement;
}>();

const isMcpEnabled = computed(() => isMcpFeatureEnabled.value && store.settings?.mcpAccessEnabled);
const singletonConnections = computed(() => {
	const filteredTypes: SingletonConnectionType[] = [];
	if (!isBrowserUseEnabled.value) filteredTypes.push(BROWSER_USE_CONNECTION_TYPE);
	if (!isComputerUseEnabled.value) filteredTypes.push(COMPUTER_USE_CONNECTION_TYPE);
	return !filteredTypes.length
		? store.connections
		: store.connections.filter(({ type }) => !filteredTypes.includes(type));
});

const mcpConnections = computed(() => (isMcpEnabled.value ? mcpStore.connections : []));
const isVisible = computed(() => {
	const anyChannelEnabled =
		(!store.isLocalGatewayDisabledByAdmin && isComputerUseEnabled.value) ||
		(store.isBrowserUseEnabledByAdmin && isBrowserUseEnabled.value) ||
		isMcpEnabled.value;
	const statusReady =
		store.gatewayStatusLoaded ||
		store.browserStatusLoaded ||
		store.isLocalGatewayDisabled ||
		isMcpEnabled.value;
	return anyChannelEnabled && statusReady;
});

void store.fetch();

if (isMcpFeatureEnabled.value) {
	void mcpStore.fetchConnections();
}

const ICON_MAP: Record<SingletonConnectionType, IconName> = {
	[COMPUTER_USE_CONNECTION_TYPE]: 'mouse-pointer',
	[BROWSER_USE_CONNECTION_TYPE]: 'globe',
};

const hasAddableComputerUse = computed(() => {
	if (!isComputerUseEnabled.value) return false;
	if (store.isLocalGatewayDisabledByAdmin) return false;
	const addedSingletonConnections = new Set(
		singletonConnections.value.map((connection) => connection.type),
	);
	return !addedSingletonConnections.has(COMPUTER_USE_CONNECTION_TYPE);
});

const hasAddableConnection = computed(() => isMcpEnabled.value || hasAddableComputerUse.value);
const addConnectionLabel = computed(() => i18n.baseText('instanceAi.connections.add.label'));

function getSingletonRowActions(
	type: SingletonConnectionType,
	status: ConnectionStatus,
): RowAction[] {
	if (type === BROWSER_USE_CONNECTION_TYPE) {
		return status === 'connected' ? ['disconnect'] : ['connect'];
	}
	if (status === 'connected') return ['settings', 'disconnect', 'remove'];
	return ['connect', 'remove'];
}

const MCP_ROW_ACTIONS: RowAction[] = ['settings', 'remove'];

function getIconForConnection(icons: McpRegistryServerIconResponse[]) {
	const icon = iconForTool(icons, uiStore.appliedTheme);
	if (icon.type === 'icon') return icon.name as ConnectionRowIcon;
	return icon;
}

async function openSingletonModal(type: SingletonConnectionType) {
	if (
		type === COMPUTER_USE_CONNECTION_TYPE &&
		!store.isLocalGatewayDisabledByAdmin &&
		store.isLocalGatewayDisabled
	) {
		await store.persistLocalGatewayPreference(false);
	}

	if (type === COMPUTER_USE_CONNECTION_TYPE) {
		uiStore.openModal(INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY);
	} else {
		uiStore.openModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
	}
}

function openToolsConnectionModal() {
	mcpTelemetry.trackToolsListOpened();
	uiStore.openModal(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
}

async function handleSingletonDisconnect(type: SingletonConnectionType) {
	if (type === COMPUTER_USE_CONNECTION_TYPE) {
		await store.disconnectComputerUse();
	} else if (type === BROWSER_USE_CONNECTION_TYPE) {
		await store.disconnectBrowserUse();
	}
}

async function handleSingletonRemove(type: SingletonConnectionType) {
	if (type === COMPUTER_USE_CONNECTION_TYPE) {
		await store.removeComputerUse();
	}
}

async function handleMcpDisconnect(connectionId: string) {
	await mcpStore.disconnect(connectionId);
}

function openMcpSettings(connectionId: string) {
	const connection = mcpStore.connections.find((c) => c.id === connectionId);
	if (connection) {
		mcpTelemetry.trackSettingsOpened(connection.serverSlug);
	}
	uiStore.openModalWithData({
		name: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
		data: { connectionId },
	});
}
</script>

<template>
	<div v-if="isVisible" :class="$style.section">
		<div :class="$style.header">
			<N8nHeading tag="h3" size="small" :class="$style.sectionTitle">
				{{ i18n.baseText('instanceAi.connections.title') }}
			</N8nHeading>
			<div v-if="hasAddableConnection" :class="$style.headerActions">
				<N8nIconButton
					icon="plus"
					variant="ghost"
					size="small"
					icon-size="medium"
					:aria-label="addConnectionLabel"
					data-test-id="instance-ai-connections-add"
					@click="openToolsConnectionModal()"
				/>
			</div>
		</div>

		<div v-if="singletonConnections.length > 0 || mcpConnections.length > 0" :class="$style.list">
			<ConnectionRow
				v-for="conn in singletonConnections"
				:key="conn.type"
				:name="conn.name"
				:subtitle="conn.subtitle"
				:icon="ICON_MAP[conn.type]"
				:status="conn.status"
				:actions="getSingletonRowActions(conn.type, conn.status)"
				:dropdown-portal-target="props.dropdownPortalTarget"
				@connect="openSingletonModal(conn.type)"
				@disconnect="handleSingletonDisconnect(conn.type)"
				@open-settings="openSingletonModal(conn.type)"
				@remove="handleSingletonRemove(conn.type)"
			/>
			<ConnectionRow
				v-for="conn in mcpConnections"
				:key="conn.id"
				:name="conn.serverTitle"
				:subtitle="conn.credentialName"
				:icon="getIconForConnection(conn.serverIcons)"
				status="connected"
				:actions="MCP_ROW_ACTIONS"
				:dropdown-portal-target="props.dropdownPortalTarget"
				@open-settings="openMcpSettings(conn.id)"
				@remove="handleMcpDisconnect(conn.id)"
			/>
		</div>

		<div v-else :class="$style.empty">
			<span>{{ i18n.baseText('instanceAi.connections.empty.title') }}</span>
			<N8nButton
				v-if="hasAddableConnection"
				:label="i18n.baseText('instanceAi.connections.empty.cta')"
				variant="outline"
				size="small"
				data-test-id="instance-ai-connections-empty-cta"
				@click="openToolsConnectionModal()"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.section {
	position: relative;
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs);
	padding-top: var(--spacing--sm);

	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: var(--spacing--sm);
		right: var(--spacing--sm);
		border-top: var(--border);
	}
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
}

.sectionTitle {
	color: var(--text-color--subtle);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.list {
	display: flex;
	flex-direction: column;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);

	> button {
		margin-top: var(--spacing--2xs);
	}
}
</style>
