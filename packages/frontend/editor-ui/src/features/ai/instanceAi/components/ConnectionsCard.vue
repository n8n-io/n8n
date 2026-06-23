<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton, N8nDropdownMenu, N8nHeading, N8nIconButton } from '@n8n/design-system';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import {
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from '@/app/constants/modals';
import { useInstanceAiMcpConnectionsExperiment } from '@/experiments/instanceAiMcpConnections';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useInstanceAiMcpStore } from '../instanceAiMcp.store';
import { useInstanceAiMcpTelemetry } from '../instanceAiMcp.telemetry';
import ConnectionRow, { ConnectionRowIcon } from './ConnectionRow.vue';
import { iconForTool } from '../toolIcons';
import type { McpRegistryServerIconResponse } from '@n8n/api-types';

type SingletonConnectionType = 'computer-use' | 'browser-use';
type RowAction = 'connect' | 'disconnect' | 'settings' | 'remove';
type ConnectionStatus = 'connected' | 'waiting' | 'disconnected';
type AddConnectionType = SingletonConnectionType | 'mcp';

type SidebarRowIcon = SingletonConnectionType | 'mcp';

const i18n = useI18n();
const uiStore = useUIStore();
const store = useInstanceAiSettingsStore();
const mcpStore = useInstanceAiMcpStore();
const mcpTelemetry = useInstanceAiMcpTelemetry();
const { isFeatureEnabled: isMcpFeatureEnabled } = useInstanceAiMcpConnectionsExperiment();

const props = defineProps<{
	dropdownPortalTarget?: HTMLElement;
}>();

const isMcpEnabled = computed(() => isMcpFeatureEnabled.value && store.settings?.mcpAccessEnabled);
const singletonConnections = computed(() => store.connections);
const mcpConnections = computed(() => (isMcpEnabled.value ? mcpStore.connections : []));
const isVisible = computed(
	() =>
		!store.isLocalGatewayDisabledByAdmin &&
		(store.gatewayStatusLoaded || store.isLocalGatewayDisabled),
);

void store.fetch();

if (isMcpFeatureEnabled.value) {
	void mcpStore.fetchConnections();
}

const ICON_MAP: Record<SidebarRowIcon, IconName> = {
	'computer-use': 'mouse-pointer',
	'browser-use': 'globe',
	mcp: 'mcp',
};

const baseAddItems = computed<Array<DropdownMenuItemProps<AddConnectionType>>>(() => {
	const items: Array<DropdownMenuItemProps<AddConnectionType>> = [
		{
			id: 'computer-use',
			label: i18n.baseText('instanceAi.connections.add.computerUse'),
			icon: { type: 'icon', value: ICON_MAP['computer-use'] },
		},
	];

	if (isMcpEnabled.value) {
		items.push({
			id: 'mcp',
			label: i18n.baseText('instanceAi.connections.add.mcp'),
			icon: { type: 'icon', value: ICON_MAP.mcp },
		});
	}

	return items;
});

const addItems = computed<Array<DropdownMenuItemProps<AddConnectionType>>>(() => {
	const addedSingletonConnections = new Set(
		singletonConnections.value.map((connection) => connection.type),
	);
	return baseAddItems.value.filter((item) => {
		if (store.isLocalGatewayDisabledByAdmin) return false;
		if (item.id === 'computer-use' && addedSingletonConnections.has(item.id)) return false;
		return true;
	});
});

const hasAddableConnection = computed(() => addItems.value.length > 0);
const addConnectionLabel = computed(() => i18n.baseText('instanceAi.connections.add.label'));

function getSingletonRowActions(
	type: SingletonConnectionType,
	status: ConnectionStatus,
): RowAction[] {
	if (type === 'browser-use') return ['settings'];
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
		type === 'computer-use' &&
		!store.isLocalGatewayDisabledByAdmin &&
		store.isLocalGatewayDisabled
	) {
		await store.persistLocalGatewayPreference(false);
	}

	if (type === 'computer-use') {
		uiStore.openModal(INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY);
	} else {
		uiStore.openModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
	}
}

function openToolsConnectionModal() {
	mcpTelemetry.trackAddMenuMcpSelected();
	mcpTelemetry.trackModalOpened();
	uiStore.openModal(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
}

function handleAddSelect(type: AddConnectionType) {
	if (type === 'mcp') {
		openToolsConnectionModal();
		return;
	}

	void openSingletonModal(type);
}

async function handleSingletonDisconnect(type: SingletonConnectionType) {
	if (type === 'computer-use') {
		await store.disconnectComputerUse();
	}
}

async function handleSingletonRemove(type: SingletonConnectionType) {
	if (type === 'computer-use') {
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
	mcpTelemetry.trackModalOpened();
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
				<N8nDropdownMenu
					:items="addItems"
					placement="bottom-end"
					:portal-target="props.dropdownPortalTarget"
					data-test-id="instance-ai-connections-add"
					@select="handleAddSelect"
				>
					<template #trigger>
						<N8nIconButton
							icon="plus"
							variant="ghost"
							size="small"
							icon-size="medium"
							:aria-label="addConnectionLabel"
						/>
					</template>
				</N8nDropdownMenu>
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
				:label="i18n.baseText('instanceAi.connections.empty.cta')"
				variant="outline"
				size="small"
				:disabled="store.isLocalGatewayDisabledByAdmin"
				data-test-id="instance-ai-connections-empty-cta"
				@click="openSingletonModal('computer-use')"
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
