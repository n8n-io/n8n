<script lang="ts" setup>
import { useRouter } from 'vue-router';
import N8nIcon from '../N8nIcon';
import { IconName, isSupportedIconName } from '../N8nIcon/icons';
import N8nRoute from '../N8nRoute';
import N8nText from '../N8nText';
import { computed } from 'vue';

const router = useRouter();

const props = defineProps<{
	title: string;
	id: string;
	icon?: IconName | string;
	click?: () => void;
	open?: boolean;
	link: string;
	ariaLabel: string;
	type: 'folder' | 'workflow' | 'project' | 'other';
}>();

function click(event: MouseEvent) {
	event.stopPropagation();
	event.preventDefault();

	if (typeof props.click === 'function') {
		props.click();
	}
}

const active = computed(() => {
	return router.currentRoute.value.path === props.link;
});
</script>

<template>
	<N8nRoute :to="link" :class="{ sidebarItem: true, active }" @click.stop>
		<div v-if="type !== 'workflow'" :class="{ sidebarItemDropdown: true, other: type === 'other' }">
			<div class="sidebarItemDropdownIcon">
				<span v-if="icon && !isSupportedIconName(icon)" class="sidebarItemEmoji">{{ icon }}</span>
				<N8nIcon v-else :icon="isSupportedIconName(icon) ? icon : 'layers'" />
			</div>
			<button
				v-if="type !== 'other'"
				class="sidebarItemDropdownButton"
				@click.stop="click"
				:aria-label="ariaLabel"
			>
				<N8nIcon :icon="open ? 'chevron-down' : 'chevron-right'" />
			</button>
		</div>
		<N8nText class="sidebarItemText">{{ title }}</N8nText>
	</N8nRoute>
</template>

<style lang="scss" scoped>
.sidebarItem {
	display: flex;
	align-items: center;
	padding: 6px 4px;
	gap: 4px;
	cursor: pointer;
	width: 100%;
	color: var(--color-text-base);
	border-radius: 4px;
	margin-top: 1px;
	cursor: pointer;

	&:hover .sidebarItemDropdownIcon {
		color: var(--color-foreground-xdark);
	}
}

.sidebarItem:hover {
	background-color: var(--color-foreground-light);
	color: var(--color-text-dark);
}

.sidebarItem:focus-visible,
.sidebarItem:has(:focus-visible) {
	outline: 1px solid var(--color-secondary);
	outline-offset: -1px;
}

.sidebarItemText {
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.sidebarItemText * {
	color: var(--color-text-base);
}

.sidebarItemDropdown {
	position: relative;
	width: 16px;
	height: 16px;
	min-width: 16px;
	border-radius: var(--border-radius-small);

	.sidebarItemDropdownIcon {
		position: absolute;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		color: var(--color-foreground-dark);
	}

	&:not(.other) {
		&:hover .sidebarItemDropdownIcon,
		&:has(:focus-visible) .sidebarItemDropdownIcon {
			opacity: 0;
		}
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
	width: 16px;
	height: 16px;
	border-radius: 2px;
	padding: 0;
	opacity: 0;
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
	font-size: 16px;
	line-height: 1;
}

.sidebarItem.active {
	background-color: var(--color-foreground-light);

	.sidebarItemDropdownIcon {
		color: var(--color-foreground-xdark);
	}
}
</style>
