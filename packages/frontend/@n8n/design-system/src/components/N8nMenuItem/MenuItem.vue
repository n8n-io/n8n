<script lang="ts" setup>
import { computed } from 'vue';
import N8nIcon from '../N8nIcon';
import { IconName, isSupportedIconName } from '../N8nIcon/icons';
import N8nRoute from '../N8nRoute';
import N8nText from '../N8nText';
import { IMenuItem } from '@n8n/design-system/types';

const props = defineProps<{
	item: IMenuItem;
	empty?: boolean;
	level?: number;
	open?: boolean;
	ariaLabel?: string;
}>();

const emit = defineEmits<{
	onClick: [];
	mouseEnter: [];
}>();

function click(event: MouseEvent) {
	event.stopPropagation();
	event.preventDefault();
	emit('onClick');
}

const to = computed(() => {
	if (props.item.route) {
		return props.item.route.to;
	}
	if (props.item.link) {
		return props.item.link.href;
	}
	return undefined;
});

const icon = computed<IconName>(() => {
	if (props.item.type === 'folder') {
		return props.open ? 'folder-open' : 'folder';
	}

	if (typeof props.item.icon === 'object' && props.item.icon?.value) {
		return props.item.icon.value as IconName;
	}

	return props.item.icon as IconName;
});
</script>

<template>
	<div class="sidebarItemWrapper" @mouseenter="emit('mouseEnter')">
		<span
			class="sidebarItemIdent"
			v-if="level && level > 1"
			v-for="level in new Array(level - 1)"
			:key="level"
		/>
		<N8nRoute :to="to" class="sidebarItem" :aria-label="props.ariaLabel">
			<div v-if="item.icon" class="sidebarItemIcon" :class="{ other: item.type === 'other' }">
				<span
					v-if="
						item.icon &&
						typeof item.icon === 'object' &&
						!isSupportedIconName(item.icon.value as string)
					"
					class="sidebarItemEmoji"
					>{{ item.icon.value }}</span
				>
				<N8nIcon v-else-if="item.icon" :icon="icon" />
			</div>
			<button
				v-if="item.children"
				class="sidebarItemDropdown"
				@click="click"
				:aria-label="ariaLabel"
			>
				<N8nIcon color="foreground-xdark" :icon="open ? 'chevron-down' : 'chevron-right'" />
			</button>
			<N8nText class="sidebarItemText">{{ item.label }}</N8nText>
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

.router-link-active {
	background-color: var(--color-foreground-light);
}

.sidebarItem {
	display: flex;
	align-items: center;
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
	background-color: var(--color-foreground-light);
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
}

.sidebarItemDropdown {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--color-foreground-light);
	cursor: pointer;
	outline: none;
	border: none;
	height: var(--spacing-s);
	width: var(--spacing-s);
	border-radius: var(--border-radius-small);
	position: absolute;
	left: 6px;
	top: 7px;
	padding: 0;
	opacity: 0;
	z-index: 100;
}

.sidebarItem:hover > .sidebarItemDropdown {
	opacity: 1;
}

.sidebarItemDropdown:hover {
	background-color: var(--color-foreground-base);
	opacity: 1;
}

.sidebarItemDropdown:focus-visible {
	outline: 1px solid var(--color-secondary);
	outline-offset: -1px;
	opacity: 1;
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

.sidebarItemIdent {
	display: block;
	position: relative;
	width: 0.5rem;
	min-width: 0.5rem;
	align-self: stretch;
	margin-left: 13.75px;
	border-left: 1px solid var(--color-foreground-light);
}

.sidebarItemIdent::before {
	content: '';
	position: absolute;
	top: -2px;
	left: -1px;
	width: 1px;
	height: 2px;
	background-color: var(--color-foreground-light);
}
</style>
