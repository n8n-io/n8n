<script lang="ts" setup>
import { computed } from 'vue';
import { N8nDropdownMenu, N8nIcon, N8nText } from '@n8n/design-system';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

type RowAction = 'connect' | 'disconnect' | 'settings' | 'remove';
/** `none` is for rows that were never connected: there is no state to report, so
 *  the row renders no indicator at all rather than a failure-coloured one. */
export type ConnectionStatus = 'connected' | 'waiting' | 'disconnected' | 'none';
export type ConnectionRowIcon =
	| IconName
	| { type: 'icon'; name: IconName }
	| { type: 'file'; src: string };

const props = withDefaults(
	defineProps<{
		name: string;
		subtitle: string;
		icon: ConnectionRowIcon;
		status?: ConnectionStatus;
		actions?: RowAction[];
		dropdownPortalTarget?: HTMLElement;
		clickable?: boolean;
	}>(),
	{ status: 'none', actions: () => [], clickable: true },
);

const iconSource = computed<{ type: 'icon'; name: IconName } | { type: 'file'; src: string }>(
	() => {
		if (typeof props.icon === 'string') return { type: 'icon', name: props.icon };
		return props.icon;
	},
);

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

const STATUS_LABEL_KEYS = {
	connected: 'instanceAi.connections.row.status.connected',
	waiting: 'instanceAi.connections.row.status.waiting',
	disconnected: 'instanceAi.connections.row.status.disconnected',
} satisfies Record<Exclude<ConnectionStatus, 'none'>, BaseTextKey>;

const statusLabel = computed(() =>
	props.status === 'none' ? undefined : i18n.baseText(STATUS_LABEL_KEYS[props.status]),
);

function handleSelect(action: RowAction) {
	if (action === 'connect') emit('connect');
	else if (action === 'disconnect') emit('disconnect');
	else if (action === 'settings') emit('openSettings');
	else if (action === 'remove') emit('remove');
}

function handleRowClick() {
	if (!props.clickable) return;
	emit('openSettings');
}
</script>

<template>
	<div :class="[$style.row, !clickable && $style.rowStatic]" @click="handleRowClick">
		<span :class="$style.iconWrap">
			<img
				v-if="iconSource.type === 'file'"
				:src="iconSource.src"
				alt=""
				aria-hidden="true"
				loading="lazy"
				referrerpolicy="no-referrer"
				:class="$style.iconImage"
			/>
			<N8nIcon v-else :icon="iconSource.name" size="large" :class="$style.icon" />
		</span>
		<div :class="$style.labels">
			<N8nText bold size="small" :class="$style.name">{{ name }}</N8nText>
			<N8nText size="xsmall" color="text-light">{{ subtitle }}</N8nText>
		</div>
		<div :class="$style.action" @click.stop>
			<slot name="action">
				<span
					v-if="status !== 'none'"
					:class="[
						$style.dot,
						status === 'connected' && $style.dotConnected,
						status === 'waiting' && $style.dotWaiting,
						status === 'disconnected' && $style.dotDisconnected,
					]"
					:title="statusLabel"
					data-test-id="instance-ai-connection-row-status"
				/>
				<N8nDropdownMenu
					v-if="menuItems.length > 0"
					:items="menuItems"
					placement="bottom-end"
					:portal-target="dropdownPortalTarget"
					data-test-id="instance-ai-connection-row-actions"
					@select="handleSelect"
				/>
			</slot>
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) 0;
	margin-left: var(--spacing--2xs);
	cursor: pointer;
}

.rowStatic {
	cursor: default;
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

.iconImage {
	width: 20px;
	height: 20px;
	object-fit: contain;
	display: block;
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

.action {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-shrink: 0;
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
