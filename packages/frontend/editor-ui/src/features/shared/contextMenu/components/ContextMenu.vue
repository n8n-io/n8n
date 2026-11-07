<script lang="ts" setup>
import { computed, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import {
	N8nDropdownMenu,
	N8nKeyboardShortcut,
	type DropdownMenuItemProps,
	type KeyboardShortcut,
} from '@n8n/design-system';

import { useContextMenu } from '../composables/useContextMenu';
import { isFocusHandoffAction, type ContextMenuAction } from '../composables/useContextMenuItems';

// The menu is driven by `isOpen` instead of Reka's `ContextMenuRoot`. That
// component only opens from a `contextmenu` event, so we used to re-dispatch
// a synthetic one. A script-dispatched `contextmenu` cannot be cancelled in
// time for WebKit, and Safari showed its own menu next to ours (API-490).
const contextMenu = useContextMenu();
const { position, isOpen, actions } = contextMenu;
const emit = defineEmits<{
	action: [action: ContextMenuAction, nodeIds: string[], groupId?: string];
}>();

type MenuItemData = {
	shortcut?: KeyboardShortcut;
};

const menuItems = computed(
	(): Array<DropdownMenuItemProps<ContextMenuAction, MenuItemData>> =>
		actions.value.map((action) => ({
			id: action.id,
			label: action.label,
			testId: `context-menu-item-${action.id}`,
			icon: action.icon ? { type: 'icon', value: action.icon } : undefined,
			disabled: action.disabled,
			divided: action.divided,
			suppressCloseAutoFocus: isFocusHandoffAction(action.id),
			data: { shortcut: action.shortcut },
		})),
);

const reference = computed(() => {
	const [x, y] = position.value;
	return {
		getBoundingClientRect: () =>
			DOMRect.fromRect({
				x,
				y,
				width: 0,
				height: 0,
			}),
	};
});

// When a selected action hands off to another floating layer (e.g. the sticky
// color popover), we must not restore focus as the menu closes — otherwise
// the restore lands outside the freshly-opened layer and dismisses it.
let suppressRestoreFocus = false;
// The menu would return focus to its hidden trigger on close. Restore the
// element that was focused before the menu opened instead, and only when the
// user dismissed with the keyboard (an outside click already moved focus).
let previouslyFocused: HTMLElement | null = null;
let closedByKeyboard = false;

watch(isOpen, (open) => {
	if (open) {
		previouslyFocused =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		closedByKeyboard = false;
		return;
	}

	const restore = closedByKeyboard && !suppressRestoreFocus;
	suppressRestoreFocus = false;
	closedByKeyboard = false;
	if (restore) previouslyFocused?.focus();
	previouslyFocused = null;
});

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
	if (event.key === 'Escape' && isOpen.value) {
		closedByKeyboard = true;
	}
});

function onActionSelect(item: ContextMenuAction) {
	suppressRestoreFocus = isFocusHandoffAction(item);
	// Read the target while the menu is guaranteed open, and hand it down as
	// data — group actions must target the group that was right-clicked, not
	// whatever the snapshotted member ids resolve to at dispatch time.
	emit('action', item, contextMenu.targetNodeIds.value, contextMenu.targetGroupId.value);
}

function onOpenChange(open: boolean) {
	if (!open) {
		contextMenu.close();
	}
}
</script>

<template>
	<N8nDropdownMenu
		:model-value="isOpen"
		:items="menuItems"
		:reference="reference"
		:modal="false"
		placement="right-start"
		content-test-id="context-menu"
		suppress-close-auto-focus
		width="24rem"
		@update:model-value="onOpenChange"
		@select="onActionSelect"
	>
		<template #trigger>
			<span :class="$style.trigger" aria-hidden="true" />
		</template>
		<template #item-trailing="{ item, ui }">
			<N8nKeyboardShortcut
				v-if="item.data?.shortcut"
				v-bind="item.data.shortcut"
				:class="[ui.class, $style.shortcut]"
			/>
		</template>
	</N8nDropdownMenu>
</template>

<style module lang="scss">
.trigger {
	position: fixed;
	width: 1px;
	height: 1px;
	pointer-events: none;
	opacity: 0;
}

.shortcut {
	margin-left: var(--spacing--xl);
}
</style>
