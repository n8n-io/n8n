<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { N8nButton, N8nDropdownMenu, N8nHeading, N8nIcon } from '@n8n/design-system';
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
import ConnectionRow from './ConnectionRow.vue';

type SingletonConnectionType = 'computer-use' | 'browser-use';
type AddMenuOption = SingletonConnectionType | 'mcp';
type RowAction = 'connect' | 'disconnect' | 'settings' | 'remove';
type ConnectionStatus = 'connected' | 'waiting' | 'disconnected';

const i18n = useI18n();
const uiStore = useUIStore();
const store = useInstanceAiSettingsStore();
const mcpStore = useInstanceAiMcpStore();
const { isFeatureEnabled: isMcpFeatureEnabled } = useInstanceAiMcpConnectionsExperiment();

const props = defineProps<{
	dropdownPortalTarget?: HTMLElement;
}>();

const singletonConnections = computed(() => store.connections);
const mcpConnections = computed(() => mcpStore.connections);
const isVisible = computed(
	() =>
		!store.isLocalGatewayDisabledByAdmin &&
		(store.gatewayStatusLoaded || store.isLocalGatewayDisabled),
);

const ICON_MAP: Record<AddMenuOption, IconName> = {
	'computer-use': 'mouse-pointer',
	'browser-use': 'globe',
	mcp: 'server',
};

const baseAddItems: Array<DropdownMenuItemProps<AddMenuOption>> = [
	{
		id: 'computer-use',
		label: i18n.baseText('instanceAi.connections.add.computerUse'),
		icon: { type: 'icon', value: 'mouse-pointer' },
	},
];

const addItems = computed(() => {
	const addedSingletons = new Set(singletonConnections.value.map((c) => c.type));
	const items: Array<DropdownMenuItemProps<AddMenuOption>> = baseAddItems.filter((item) => {
		if (addedSingletons.has(item.id as SingletonConnectionType)) return false;
		if (store.isLocalGatewayDisabledByAdmin) return false;
		return true;
	});

	if (isMcpFeatureEnabled.value) {
		items.push({
			id: 'mcp',
			label: i18n.baseText('instanceAi.connections.add.mcp'),
			icon: { type: 'icon', value: 'server' },
		});
	}

	return items;
});

const hasAddableConnection = computed(() => addItems.value.length > 0);

function getSingletonRowActions(
	type: SingletonConnectionType,
	status: ConnectionStatus,
): RowAction[] {
	if (type === 'browser-use') return ['settings'];
	if (status === 'connected') return ['settings', 'disconnect', 'remove'];
	return ['connect', 'remove'];
}

const MCP_ROW_ACTIONS: RowAction[] = ['settings', 'remove'];

async function openSingletonModal(type: SingletonConnectionType) {
	// Adding Computer Use from the +menu while the user preference has it
	// disabled re-enables it. The existing watcher in InstanceAiView triggers
	// daemon probing/polling.
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

async function handleAdd(option: AddMenuOption) {
	if (option === 'mcp') {
		uiStore.openModal(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
		return;
	}
	await openSingletonModal(option);
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

function openMcpSettings(_connectionId: string) {
	uiStore.openModal(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
}

onMounted(() => {
	if (!isMcpFeatureEnabled.value) return;
	void mcpStore.fetchConnections();
});
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
					:activator-icon="{ type: 'icon', value: 'plus' }"
					placement="bottom-end"
					:portal-target="props.dropdownPortalTarget"
					data-test-id="instance-ai-connections-add"
					@select="handleAdd"
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
				:name="conn.credentialName"
				:subtitle="conn.serverSlug"
				:icon="ICON_MAP.mcp"
				status="connected"
				:actions="MCP_ROW_ACTIONS"
				:dropdown-portal-target="props.dropdownPortalTarget"
				@open-settings="openMcpSettings(conn.id)"
				@remove="handleMcpDisconnect(conn.id)"
			/>
		</div>

		<div v-else :class="$style.empty">
			<N8nIcon icon="link" :size="30" :class="$style.emptyIcon" />
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

.emptyIcon {
	color: var(--color--text--tint-1);
	padding: var(--spacing--4xs);
	background: var(--color--foreground--tint-1);
	border-radius: var(--radius--lg);
}
</style>
