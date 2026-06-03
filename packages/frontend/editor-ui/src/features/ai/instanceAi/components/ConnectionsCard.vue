<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { N8nButton, N8nHeading, N8nIcon, N8nIconButton } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import type { McpRegistryServerIconResponse } from '@n8n/api-types';
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
import ConnectionRow from './ConnectionRow.vue';

type SingletonConnectionType = 'computer-use' | 'browser-use';
type RowAction = 'connect' | 'disconnect' | 'settings' | 'remove';
type ConnectionStatus = 'connected' | 'waiting' | 'disconnected';

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

const singletonConnections = computed(() => store.connections);
const mcpConnections = computed(() => mcpStore.connections);
const isVisible = computed(
	() =>
		!store.isLocalGatewayDisabledByAdmin &&
		(store.gatewayStatusLoaded || store.isLocalGatewayDisabled),
);

const ICON_MAP: Record<SidebarRowIcon, IconName> = {
	'computer-use': 'mouse-pointer',
	'browser-use': 'globe',
	mcp: 'server',
};

/**
 * Pick the icon variant that best matches the current applied theme. Prefer
 * a theme-tagged match, then an untagged icon, then any icon. Returns null if
 * the server has no icons (e.g. the server is no longer in the registry).
 */
function pickIconForTheme(
	icons: McpRegistryServerIconResponse[],
	appliedTheme: 'light' | 'dark',
): string | null {
	if (icons.length === 0) return null;
	const themed = icons.find((i) => i.theme === appliedTheme);
	if (themed) return themed.src;
	const untagged = icons.find((i) => i.theme === undefined);
	return (untagged ?? icons[0]).src;
}

function getSingletonRowActions(
	type: SingletonConnectionType,
	status: ConnectionStatus,
): RowAction[] {
	if (type === 'browser-use') return ['settings'];
	if (status === 'connected') return ['settings', 'disconnect', 'remove'];
	return ['connect', 'remove'];
}

const MCP_ROW_ACTIONS: RowAction[] = ['settings', 'remove'];

function iconForConnection(
	icons: McpRegistryServerIconResponse[],
): IconName | { type: 'file'; src: string } {
	const src = pickIconForTheme(icons, uiStore.appliedTheme);
	return src ? { type: 'file', src } : ICON_MAP.mcp;
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
			<div v-if="isMcpFeatureEnabled" :class="$style.headerActions">
				<N8nIconButton
					icon="plus"
					type="tertiary"
					size="mini"
					data-test-id="instance-ai-connections-add"
					@click="openToolsConnectionModal"
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
				:icon="iconForConnection(conn.serverIcons)"
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
