<script lang="ts" setup>
import { computed } from 'vue';

import type { IMenuItem } from '@n8n/design-system/types';

import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nRoute from '../N8nRoute';
import N8nText from '../N8nText';

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
	onClick: [];
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
	if (typeof props.item.icon === 'string') {
		return undefined;
	}

	return props.item.icon?.color;
});
</script>

<template>
	<div class="sidebarItemWrapper">
		<N8nRoute
			:to="to"
			role="menuitem"
			class="sidebarItem"
			:class="{ active }"
			:aria-label="props.ariaLabel"
			data-test-id="menu-item"
			@click="emit('onClick')"
		>
			<div
				v-if="item.icon"
				:data-test-id="item.id"
				class="sidebarItemIcon"
				:class="{ notification: item.notification }"
			>
				<N8nText
					v-if="item.icon && typeof item.icon === 'object' && item.icon.type === 'emoji'"
					class="sidebarItemEmoji"
					:color="iconColor"
					>{{ item.icon.value }}</N8nText
				>
				<N8nIcon v-else-if="icon" :icon="icon" />
			</div>
			<N8nText v-if="!compact" class="sidebarItemText">{{ item.label }}</N8nText>
		</N8nRoute>
	</div>
</template>

<style lang="scss" scoped>
.sidebarItemWrapper {
	position: relative;
	width: 100%;
	max-width: 100%;
	margin-bottom: 2px;
}

.router-link-active,
.active {
	background-color: var(--color-foreground-base);
}

.sidebarItem {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-3xs);
	gap: var(--spacing-3xs);
	cursor: pointer;
	color: var(--color-text-base);
	border-radius: var(--spacing-4xs);
	cursor: pointer;
	min-width: 0;
	width: 100%;
	position: relative;

	&:hover .sidebarItemIcon {
		color: var(--color-text-dark);
	}
}

.sidebarItem:hover {
	background-color: var(--color-foreground-base);
	color: var(--color-text-dark);
}

.sidebarItem:focus-visible {
	outline: 1px solid var(--color-secondary);
	outline-offset: -1px;
}

.sidebarItemText {
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	flex: 1;
	line-height: 18px;
	min-width: 0;
}

.sidebarItemText * {
	color: var(--color-text-base);
}

.sidebarItemIcon {
	position: relative;
	width: var(--spacing-s);
	height: var(--spacing-s);
	min-width: var(--spacing-s);

	&.notification::after {
		content: '';
		position: absolute;
		top: calc(var(--spacing-5xs) * -1);
		right: calc(var(--spacing-5xs) * -1);
		width: var(--spacing-4xs);
		height: var(--spacing-4xs);
		background-color: var(--color-danger);
		border-radius: 50%;
	}
}

.sidebarItemEmoji {
	font-size: var(--spacing-s);
	line-height: 1;
}

.sidebarItem.active {
	background-color: var(--color-foreground-light);

	.sidebarItemIcon {
		color: var(--color-foreground-xdark);
	}
}
</style>
