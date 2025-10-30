<script lang="ts" setup>
import { computed } from 'vue';

import type { IMenuItem } from '@n8n/design-system/types';

import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nRoute from '../N8nRoute';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';

const props = defineProps<{
	item: IMenuItem;
	active?: boolean;
	empty?: boolean;
	compact?: boolean;
	level?: number;
	open?: boolean;
	ariaLabel?: string;
}>();

const emit = defineEmits<{
	click: [];
}>();

const to = computed(() => {
	if (props.item.route) {
		return props.item.route.to;
	}

	if (props.item.link) {
		return props.item.link.href;
	}

	return undefined;
});

const icon = computed<IconName | undefined>(() => {
	if (typeof props.item.icon === 'object' && props.item.icon?.type === 'icon') {
		return props.item.icon.value;
	}

	if (typeof props.item.icon === 'string') {
		return props.item.icon;
	}

	return undefined;
});

const iconColor = computed(() => {
	// If the icon is a string, we use the default color
	if (typeof props.item.icon === 'string') {
		return undefined;
	}

	return props.item.icon?.color;
});
</script>

<template>
	<div :data-test-id="item.id" :class="$style.menuItemWrapper">
		<N8nTooltip :placement="'right'" :disabled="!compact" :show-after="500">
			<template v-if="compact" #content>{{ item.label }}</template>

			<N8nRoute
				:to="to"
				role="menuitem"
				:class="[$style.menuItem, { [$style.active]: active }]"
				:aria-label="props.ariaLabel"
				data-test-id="menu-item"
				:id="item.id"
				@click="emit('click')"
			>
				<div
					v-if="item.icon"
					:class="[$style.menuItemIcon, { [$style.notification]: item.notification }]"
				>
					<N8nText
						v-if="item.icon && typeof item.icon === 'object' && item.icon.type === 'emoji'"
						:class="$style.menuItemEmoji"
						:color="iconColor"
						>{{ item.icon.value }}</N8nText
					>
					<N8nIcon v-else-if="icon" :icon="icon" />
				</div>
				<N8nText v-if="!compact" :class="$style.menuItemText">{{ item.label }}</N8nText>
				<N8nIcon v-if="item.children && !compact" icon="chevron-right" color="text-light" />
			</N8nRoute>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.menuItemWrapper {
	position: relative;
	width: 100%;
	max-width: 100%;
	margin-bottom: var(--spacing--5xs);
}

.router-link-active,
.active {
	background-color: var(--color--foreground);
}

.menuItem {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--3xs);
	gap: var(--spacing--3xs);
	cursor: pointer;
	color: var(--color--text);
	border-radius: var(--spacing--4xs);
	cursor: pointer;
	min-width: 0;
	width: 100%;
	position: relative;

	&:hover .menuItemIcon {
		color: var(--color--text--shade-1);
	}
}

.menuItem:hover {
	background-color: var(--color--foreground);
	color: var(--color--text--shade-1);
}

.menuItem:focus-visible {
	outline: 1px solid var(--color--secondary);
	outline-offset: -1px;
}

.menuItemText {
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	flex: 1;
	line-height: var(--font-size--lg);
	min-width: 0;
}

.menuItemText * {
	color: var(--color--text);
}

.menuItemIcon {
	position: relative;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	min-width: var(--spacing--sm);

	&.notification::after {
		content: '';
		position: absolute;
		top: calc(var(--spacing--5xs) * -1);
		right: calc(var(--spacing--5xs) * -1);
		width: var(--spacing--4xs);
		height: var(--spacing--4xs);
		background-color: var(--color--danger);
		border-radius: 50%;
	}
}

.menuItemEmoji {
	font-size: var(--spacing--sm);
	line-height: 1;
}

.menuItem.active {
	.menuItemIcon {
		color: var(--color--foreground--shade-2);
	}
}
</style>
