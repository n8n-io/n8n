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
	click?: () => void;
	open?: boolean;
	ariaLabel?: string;
}>();

function click(event: MouseEvent) {
	event.stopPropagation();
	event.preventDefault();

	if (typeof props.click === 'function') {
		props.click();
	}
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

	return props.item.icon as IconName;
});
</script>

<template>
	<div class="itemWrapper">
		<span
			class="itemIdent"
			v-if="level && level > 1"
			v-for="level in new Array(level - 1)"
			:key="level"
		/>
		<N8nRoute :to="to" class="sidebarItem" :aria-label="props.ariaLabel">
			<div
				v-if="item.type !== 'workflow'"
				:class="{ sidebarItemDropdown: true, other: item.type === 'other' }"
			>
				<div class="sidebarItemDropdownIcon">
					<span
						v-if="item.icon && !isSupportedIconName(item.icon as string)"
						class="sidebarItemEmoji"
						>{{ item.icon }}</span
					>
					<N8nIcon v-else-if="item.icon" :icon="icon" />
				</div>
			</div>
			<button
				v-if="item.type !== 'other' && item.type !== 'workflow'"
				class="sidebarItemDropdownButton"
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
.itemWrapper {
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

	&:hover .sidebarItemDropdownIcon {
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
	min-width: 0;
}

.sidebarItemText * {
	color: var(--color-text-base);
}

.sidebarItemDropdown {
	position: relative;
	width: var(--spacing-s);
	height: var(--spacing-s);
	min-width: var(--spacing-s);
	border-radius: var(--border-radius-small);

	.sidebarItemDropdownIcon {
		position: absolute;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		color: var(--color-text-light);
	}
}

.sidebarItemDropdownButton {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: transparent;
	cursor: pointer;
	outline: none;
	border: none;
	width: var(--spacing-s);
	height: var(--spacing-s);
	border-radius: 0 var(--border-radius-small) var(--border-radius-small) 0;
	position: absolute;
	right: 0;
	top: 0;
	padding: 0;
	opacity: 0;
	width: 28px;
	height: 28px;
}

.sidebarItem:hover > .sidebarItemDropdownButton {
	opacity: 1;
}

.sidebarItemDropdownButton:hover {
	background-color: var(--color-foreground-base);
	opacity: 1;
}

.sidebarItemDropdownButton:focus-visible {
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

	.sidebarItemDropdownIcon {
		color: var(--color-foreground-xdark);
	}
}

.itemIdent {
	display: block;
	position: relative;
	width: 0.5rem;
	min-width: 0.5rem;
	align-self: stretch;
	margin-left: 0.75rem;
	border-left: 1px solid var(--color-foreground-light);
}

.itemIdent::before {
	content: '';
	position: absolute;
	bottom: -1px;
	left: -1px;
	width: 1px;
	height: 1px;
	background-color: var(--color-foreground-light);
}
</style>
