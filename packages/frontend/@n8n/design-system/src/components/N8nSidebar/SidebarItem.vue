<script lang="ts" setup>
import N8nIcon from '../N8nIcon';
import { IconName } from '../N8nIcon/icons';
import N8nLink from '../N8nLink';

defineProps<{
	title: string;
	id: string;
	icon?: IconName;
	click?: () => void;
	open?: boolean;
	link: string;
	ariaLabel: string;
	type: 'folder' | 'workflow' | 'project' | 'other';
}>();
</script>

<template>
	<div class="sidebarItem">
		<div v-if="type !== 'workflow'" class="sidebarItemDropdown">
			<div class="sidebarItemDropdownIcon">
				<N8nIcon color="foreground-xdark" :icon="icon ?? 'layers'" />
			</div>
			<button
				v-if="type !== 'other'"
				class="sidebarItemDropdownButton"
				@click.stop="click"
				:aria-label="ariaLabel"
			>
				<N8nIcon color="foreground-xdark" :icon="open ? 'chevron-down' : 'chevron-right'" />
			</button>
		</div>
		<N8nLink class="sidebarItemLink" :to="link">{{ title }}</N8nLink>
	</div>
</template>

<style lang="scss" scoped>
.sidebarItem {
	display: flex;
	align-items: center;
	padding: 4px;
	gap: 4px;
	cursor: pointer;
	width: 100%;
}

.sidebarItemLink {
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.sidebarItemLink * {
	color: var(--color-text-base);
}

.sidebarItemLink:hover *,
.sidebarItemLink:focus * {
	color: var(--color-text-dark);
	text-decoration: underline;
}

.sidebarItemDropdown {
	position: relative;
	width: 16px;
	height: 16px;
	border-radius: var(--border-radius-small);

	.sidebarItemDropdownIcon {
		position: absolute;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.sidebarItemDropdownButton {
		opacity: 0;
	}

	&:hover .sidebarItemDropdownButton,
	.sidebarItemDropdownButton:focus {
		opacity: 1;
	}

	&:hover .sidebarItemDropdownIcon,
	&:focus-within .sidebarItemDropdownIcon {
		opacity: 0;
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
	padding: 0;
}
</style>
