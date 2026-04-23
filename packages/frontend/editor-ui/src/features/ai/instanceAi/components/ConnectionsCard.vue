<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton, N8nDropdownMenu, N8nHeading, N8nIcon } from '@n8n/design-system';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import {
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
} from '@/app/constants/modals';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import ConnectionRow from './ConnectionRow.vue';

type ConnectionType = 'computer-use' | 'browser-use';
type RowAction = 'connect' | 'disconnect' | 'settings' | 'remove';
type ConnectionStatus = 'connected' | 'waiting' | 'disconnected';

const i18n = useI18n();
const uiStore = useUIStore();
const store = useInstanceAiSettingsStore();

const connections = computed(() => store.connections);

const isVisible = computed(
	() =>
		!store.isLocalGatewayDisabledByAdmin &&
		(store.gatewayStatusLoaded || store.isLocalGatewayDisabled),
);

const ICON_MAP: Record<ConnectionType, IconName> = {
	'computer-use': 'mouse-pointer',
	'browser-use': 'globe',
};

const baseAddItems: Array<DropdownMenuItemProps<ConnectionType>> = [
	{
		id: 'computer-use',
		label: i18n.baseText('instanceAi.connections.add.computerUse'),
		icon: { type: 'icon', value: 'mouse-pointer' },
	},
];

const addItems = computed(() => {
	const added = new Set(connections.value.map((c) => c.type));
	return baseAddItems.filter((item) => {
		if (added.has(item.id)) return false;
		if (store.isLocalGatewayDisabledByAdmin) return false;
		return true;
	});
});

const hasAddableConnection = computed(() => addItems.value.length > 0);

function getRowActions(type: ConnectionType, status: ConnectionStatus): RowAction[] {
	if (type === 'browser-use') return ['settings'];
	if (status === 'connected') return ['settings', 'disconnect', 'remove'];
	return ['connect', 'remove'];
}

async function openModal(type: ConnectionType) {
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

async function handleDisconnect(type: ConnectionType) {
	if (type === 'computer-use') {
		await store.disconnectComputerUse();
	}
}

async function handleRemove(type: ConnectionType) {
	if (type === 'computer-use') {
		await store.removeComputerUse();
	}
}
</script>

<template>
	<div v-if="isVisible" :class="[$style.section, $style.card]">
		<div :class="$style.header">
			<N8nHeading tag="h3" size="small" bold>
				{{ i18n.baseText('instanceAi.connections.title') }}
			</N8nHeading>
			<N8nDropdownMenu
				v-if="hasAddableConnection"
				:items="addItems"
				:activator-icon="{ type: 'icon', value: 'plus' }"
				placement="bottom-end"
				data-test-id="instance-ai-connections-add"
				@select="openModal"
			/>
		</div>

		<div v-if="connections.length > 0" :class="$style.list">
			<ConnectionRow
				v-for="conn in connections"
				:key="conn.type"
				:name="conn.name"
				:subtitle="conn.subtitle"
				:icon="ICON_MAP[conn.type]"
				:status="conn.status"
				:actions="getRowActions(conn.type, conn.status)"
				@connect="openModal(conn.type)"
				@disconnect="handleDisconnect(conn.type)"
				@open-settings="openModal(conn.type)"
				@remove="handleRemove(conn.type)"
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
				@click="openModal('computer-use')"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
}

.card {
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	background: var(--color--background--light-2);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
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
