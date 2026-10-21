<script lang="ts" setup>
import { useStyles } from '@n8n/composables/useStyles';
import { N8nContextMenu, type ContextMenuItem, type ContextMenuNode } from '@n8n/design-system';
import type { ActionDropdownItem } from '@/Interface';
import { computed, nextTick, ref, watch } from 'vue';

import { useContextMenu } from '../composables/useContextMenu';
import { isFocusHandoffAction, type ContextMenuAction } from '../composables/useContextMenuItems';

const contextMenu = useContextMenu();
const { position, isOpen, actions } = contextMenu;
const trigger = ref<HTMLElement>();
const emit = defineEmits<{
	action: [action: ContextMenuAction, nodeIds: string[], groupId?: string];
}>();
const { APP_Z_INDEXES } = useStyles();

const items = computed(() => toContextMenuNodes(actions.value));

// Vue Flow stops the original contextmenu on the pane, so the menu never sees it.
// A 1px trigger receives a new event at the same pointer coordinates. The canvas
// stays outside the trigger, so a long-press on the canvas does not open the menu.
watch(
	isOpen,
	(open) => {
		if (!open) return;

		void nextTick(() => {
			const [clientX, clientY] = position.value;
			trigger.value?.dispatchEvent(
				new PointerEvent('contextmenu', {
					bubbles: true,
					cancelable: true,
					button: 2,
					clientX,
					clientY,
				}),
			);
		});
	},
	{ flush: 'post' },
);

// A selected action can hand focus to another layer, such as the sticky color
// popover. Stop the menu from restoring focus as it closes, or that restore
// lands outside the new layer and dismisses it.
let suppressRestoreFocus = false;

function onSelect(action: ContextMenuAction) {
	suppressRestoreFocus = isFocusHandoffAction(action);
	// Read the target while the menu is open. Group actions must target the
	// group that was right-clicked.
	emit('action', action, contextMenu.targetNodeIds.value, contextMenu.targetGroupId.value);
}

function onCloseAutoFocus(event: Event) {
	if (suppressRestoreFocus) {
		event.preventDefault();
	}
	suppressRestoreFocus = false;
}

function onOpenChange(open: boolean) {
	if (!open) {
		contextMenu.close();
	}
}

/**
 * `divided` starts a new section. The design-system menu draws a separator
 * before each group that follows another node.
 */
function toContextMenuNodes(
	menuActions: Array<ActionDropdownItem<ContextMenuAction>>,
): Array<ContextMenuNode<ContextMenuAction>> {
	const nodes: Array<ContextMenuNode<ContextMenuAction>> = [];
	let section: Array<ContextMenuItem<ContextMenuAction>> = [];

	function pushSection() {
		const first = section[0];
		if (!first) return;
		nodes.push({
			type: 'group',
			// Groups are not selectable. Reuse the first action id as the section key.
			id: first.id,
			children: section,
		});
		section = [];
	}

	for (const action of menuActions) {
		if (action.divided && section.length > 0) pushSection();
		section.push({
			type: 'item',
			id: action.id,
			label: action.label,
			disabled: action.disabled,
			...(action.icon ? { icon: { type: 'icon', value: action.icon } } : {}),
			...(action.shortcut ? { shortcut: action.shortcut } : {}),
			...(action.variant ? { variant: action.variant } : {}),
		});
	}

	pushSection();
	return nodes;
}
</script>

<template>
	<Teleport v-if="isOpen" to="body">
		<N8nContextMenu
			:items="items"
			:modal="false"
			:content-class="$style.content"
			@update:open="onOpenChange"
			@select="onSelect"
			@close-auto-focus="onCloseAutoFocus"
		>
			<template #trigger>
				<div
					ref="trigger"
					:class="$style.trigger"
					:style="{
						left: `${position[0]}px`,
						top: `${position[1]}px`,
						zIndex: APP_Z_INDEXES.CONTEXT_MENU,
					}"
				/>
			</template>
		</N8nContextMenu>
	</Teleport>
</template>

<style module lang="scss">
.trigger {
	position: fixed;
	width: 1px;
	height: 1px;
	pointer-events: none;
	opacity: 0;
}

// The canvas menu stays under the NDV and dialogs. The design-system panel uses the popover layer.
.content[data-state] {
	z-index: var(--context-menu--z, 10);
}
</style>
