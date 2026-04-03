<script lang="ts" setup>
import { useContextMenu } from '../composables/useContextMenu';
import { type ContextMenuAction, type ContextMenuItem } from '../composables/useContextMenuItems';
import { useStyles } from '@/app/composables/useStyles';
import { ref, watch, reactive, type Directive } from 'vue';
import { type ComponentExposed } from 'vue-component-type-helpers';

import { N8nActionDropdown } from '@n8n/design-system';

const contextMenu = useContextMenu();
const { position, isOpen, actions, target } = contextMenu;
const dropdown = ref<ComponentExposed<typeof N8nActionDropdown>>();
const emit = defineEmits<{ action: [action: ContextMenuAction, nodeIds: string[]] }>();
const { APP_Z_INDEXES } = useStyles();

// Submenu state
const openSubmenu = ref<ContextMenuItem | null>(null);
const submenuPosition = reactive({ x: 0, y: 0 });
// Needed to keep the submenu open, otherwise the submenu closes when leaving the parent element
let closeTimeout: ReturnType<typeof setTimeout> | null = null;

const SUBMENU_WIDTH = 200;

/**
 * Directive that attaches mouseenter/mouseleave listeners to the closest
 * itemContainer ancestor. This ensures the full row triggers the submenu,
 * not just the inner label span.
 */
const vParentHover: Directive<HTMLElement, ContextMenuItem> = {
	mounted(el, binding) {
		// Our element sits inside: <li> > <div.itemContainer> > <span.label> > el
		const container = el.parentElement?.parentElement;
		if (!container) return;

		const item = binding.value;
		const onEnter = () => onContainerEnter(container, item);
		const onLeave = (e: MouseEvent) => onContainerLeave(e);

		container.addEventListener('mouseenter', onEnter);
		container.addEventListener('mouseleave', onLeave);

		(el as HTMLElement & { _cleanup?: () => void })._cleanup = () => {
			container.removeEventListener('mouseenter', onEnter);
			container.removeEventListener('mouseleave', onLeave);
		};
	},
	unmounted(el) {
		(el as HTMLElement & { _cleanup?: () => void })._cleanup?.();
	},
};

watch(
	isOpen,
	() => {
		if (isOpen.value) {
			dropdown.value?.open();
		} else {
			dropdown.value?.close();
			openSubmenu.value = null;
		}
	},
	{ flush: 'post' },
);

function cancelClose() {
	if (closeTimeout) {
		clearTimeout(closeTimeout);
		closeTimeout = null;
	}
}

function scheduleClose() {
	cancelClose();
	closeTimeout = setTimeout(() => {
		openSubmenu.value = null;
	}, 100);
}

function onContainerEnter(container: HTMLElement, item: ContextMenuItem) {
	cancelClose();
	if (!item.children?.length) return;

	const rect = container.getBoundingClientRect();

	const fitsRight = rect.right + SUBMENU_WIDTH <= window.innerWidth;
	submenuPosition.x = fitsRight ? rect.right : rect.left - SUBMENU_WIDTH;
	submenuPosition.y = rect.top;
	openSubmenu.value = item;
}

function onContainerLeave(event: MouseEvent) {
	const related = event.relatedTarget as HTMLElement | null;
	if (related?.closest('[data-context-submenu]')) return;
	scheduleClose();
}

function onActionSelect(item: ContextMenuAction) {
	// Ignore clicks on items that have submenus — they open the submenu instead
	const action = actions.value.find((a) => a.id === item);
	if (action?.children?.length) return;
	emit('action', item, contextMenu.targetNodeIds.value);
}

function onSubmenuEnter() {
	cancelClose();
}

function onSubmenuLeave(event: MouseEvent) {
	const related = event.relatedTarget as HTMLElement | null;
	if (related?.closest('.el-dropdown-menu__item')) {
		// Mouse went back to a menu item — let the container's mouseenter handle it
		return;
	}
	scheduleClose();
}

function onChildSelect(childId: ContextMenuAction) {
	openSubmenu.value = null;
	dropdown.value?.close();
	emit('action', childId, contextMenu.targetNodeIds.value);
}

function onVisibleChange(open: boolean) {
	if (!open) {
		openSubmenu.value = null;
		contextMenu.close();
	}
}
</script>

<template>
	<Teleport v-if="isOpen" to="body">
		<div
			:class="$style.contextMenu"
			:style="{
				left: `${position[0]}px`,
				top: `${position[1]}px`,
				zIndex: APP_Z_INDEXES.CONTEXT_MENU,
			}"
		>
			<N8nActionDropdown
				ref="dropdown"
				:items="actions"
				placement="bottom-start"
				data-test-id="context-menu"
				:hide-arrow="target?.source !== 'node-button'"
				:teleported="false"
				@select="onActionSelect"
				@visible-change="onVisibleChange"
			>
				<template #activator>
					<div :class="$style.activator"></div>
				</template>
				<template #menuItem="item">
					<template v-if="(item as ContextMenuItem).children?.length">
						<div
							v-parent-hover="item as ContextMenuItem"
							:class="$style.submenuTrigger"
							@click.stop.prevent
						>
							<span>{{ item.label }}</span>
							<span :class="$style.chevron">&#x203A;</span>
						</div>
					</template>
					<template v-else>
						{{ item.label }}
					</template>
				</template>
			</N8nActionDropdown>
		</div>

		<!-- Submenu rendered as separate floating panel -->
		<div
			v-if="openSubmenu?.children?.length"
			data-context-submenu
			:class="$style.submenu"
			:style="{
				left: `${submenuPosition.x}px`,
				top: `${submenuPosition.y}px`,
				zIndex: APP_Z_INDEXES.CONTEXT_MENU + 1,
			}"
			@mouseenter="onSubmenuEnter"
			@mouseleave="onSubmenuLeave"
		>
			<div
				v-for="child in openSubmenu.children"
				:key="child.id"
				:class="$style.submenuItem"
				@click="onChildSelect(child.id)"
			>
				{{ child.label }}
			</div>
		</div>
	</Teleport>
</template>

<style module lang="scss">
.contextMenu {
	position: fixed;
}

.activator {
	pointer-events: none;
	opacity: 0;
}

.submenuTrigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	cursor: default;
}

.chevron {
	margin-left: var(--spacing--sm);
	font-size: var(--font-size--md);
	color: var(--color--text--tint-1);
}

.submenu {
	position: fixed;
	width: 200px;
	padding: var(--spacing--4xs) 0;
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
	box-shadow: var(--shadow--light);
}

.submenuItem {
	display: flex;
	align-items: center;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	line-height: 18px;
	cursor: pointer;
	color: var(--color--text--shade-1);

	&:hover {
		background-color: var(--color--primary--tint-3);
		color: var(--color--primary);
	}
}
</style>
