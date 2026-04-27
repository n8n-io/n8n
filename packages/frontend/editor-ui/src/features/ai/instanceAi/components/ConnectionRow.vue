<script lang="ts" setup>
import { computed } from 'vue';
import { N8nDropdownMenu, N8nIcon, N8nText } from '@n8n/design-system';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

type RowAction = 'connect' | 'disconnect' | 'settings' | 'remove';
type ConnectionStatus = 'connected' | 'waiting' | 'disconnected';

const props = defineProps<{
	name: string;
	subtitle: string;
	icon: IconName;
	status: ConnectionStatus;
	actions: RowAction[];
}>();

const emit = defineEmits<{
	connect: [];
	disconnect: [];
	openSettings: [];
	remove: [];
}>();

const i18n = useI18n();

const ACTION_LABEL_KEYS: Record<RowAction, BaseTextKey> = {
	connect: 'instanceAi.connections.row.connect',
	disconnect: 'instanceAi.connections.row.disconnect',
	settings: 'instanceAi.connections.row.settings',
	remove: 'instanceAi.connections.row.remove',
};

const ACTION_ORDER: RowAction[] = ['connect', 'settings', 'disconnect', 'remove'];

const menuItems = computed<Array<DropdownMenuItemProps<RowAction>>>(() =>
	ACTION_ORDER.filter((a) => props.actions.includes(a)).map((a) => ({
		id: a,
		label: i18n.baseText(ACTION_LABEL_KEYS[a]),
	})),
);

const statusTooltip = computed(() => {
	if (props.status === 'connected')
		return i18n.baseText('instanceAi.connections.row.status.connected');
	if (props.status === 'waiting') return i18n.baseText('instanceAi.connections.row.status.waiting');
	return i18n.baseText('instanceAi.connections.row.status.disconnected');
});

function handleSelect(action: RowAction) {
	if (action === 'connect') emit('connect');
	else if (action === 'disconnect') emit('disconnect');
	else if (action === 'settings') emit('openSettings');
	else if (action === 'remove') emit('remove');
}
</script>

<template>
	<div :class="$style.row">
		<span :class="$style.iconWrap">
			<N8nIcon :icon="icon" size="large" :class="$style.icon" />
		</span>
		<div :class="$style.labels">
			<N8nText bold size="small" :class="$style.name">{{ name }}</N8nText>
			<N8nText size="xsmall" color="text-light">{{ subtitle }}</N8nText>
		</div>
		<span
			:class="[
				$style.dot,
				status === 'connected' && $style.dotConnected,
				status === 'waiting' && $style.dotWaiting,
				status === 'disconnected' && $style.dotDisconnected,
			]"
			:title="statusTooltip"
		/>
		<N8nDropdownMenu
			v-if="menuItems.length > 0"
			:items="menuItems"
			placement="bottom-end"
			@select="handleSelect"
		/>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) 0;
}

.iconWrap {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	background: var(--color--foreground--tint-1);
	border-radius: var(--radius);
	flex-shrink: 0;
}

.icon {
	color: var(--color--text);
}

.labels {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	gap: var(--spacing--5xs);
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.dotConnected {
	background: var(--color--success);
}

.dotWaiting {
	background: var(--color--warning);
}

.dotDisconnected {
	background: var(--color--danger);
}
</style>
