<script lang="ts" setup>
import { computed, watch } from 'vue';
import {
	N8nDropdownMenu,
	N8nKeyboardShortcut,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@/Interface';

import { useContextMenu } from '../composables/useContextMenu';
import { isFocusHandoffAction, type ContextMenuAction } from '../composables/useContextMenuItems';

// Reka `ContextMenuRoot` opens only from a `contextmenu` event. A script-dispatched
// event cannot be cancelled in time on WebKit, and Safari showed its own menu
// next to ours (API-490). Drive `N8nDropdownMenu` from `isOpen` instead.
const contextMenu = useContextMenu();
const { position, isOpen, actions } = contextMenu;
const emit = defineEmits<{
	action: [action: ContextMenuAction, nodeIds: string[], groupId?: string];
}>();

type MenuItem = DropdownMenuItemProps<ContextMenuAction, ActionDropdownItem<ContextMenuAction>>;

const menuItems = computed<MenuItem[]>(() =>
	actions.value.map((item) => ({
		id: item.id,
		testId: `context-menu-item-${item.id}`,
		label: item.label,
		icon: item.icon ? { type: 'icon', value: item.icon } : undefined,
		disabled: item.disabled,
		divided: item.divided,
		data: item,
	})),
);

// A selected action can hand focus to another floating layer. Restoring focus
// here would land outside that layer and dismiss it.
let suppressRestoreFocus = false;
// The dropdown returns focus to its trigger on close. Restore the element that
// was focused before the menu opened, unless the user already moved focus.
let previouslyFocused: HTMLElement | null = null;
let interactedOutside = false;

function eventElement(target: EventTarget | null): Element | null {
	if (target instanceof Element) return target;
	if (target instanceof Text) return target.parentElement;
	return null;
}

function isInsideMenu(target: EventTarget | null): boolean {
	const element = eventElement(target);
	return Boolean(element?.closest('[role="menu"], [data-context-menu-trigger]'));
}

function onInteractOutside(event: Event) {
	if (!isInsideMenu(event.target)) interactedOutside = true;
}

watch(isOpen, (open, _previous, onCleanup) => {
	if (open) {
		previouslyFocused =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		interactedOutside = false;
		document.addEventListener('pointerdown', onInteractOutside, true);
		document.addEventListener('focusin', onInteractOutside, true);
		onCleanup(() => {
			document.removeEventListener('pointerdown', onInteractOutside, true);
			document.removeEventListener('focusin', onInteractOutside, true);
		});
		return;
	}

	const restore = !suppressRestoreFocus && !interactedOutside;
	suppressRestoreFocus = false;
	if (restore) previouslyFocused?.focus();
	previouslyFocused = null;
});

function onActionSelect(action: ContextMenuAction) {
	suppressRestoreFocus = isFocusHandoffAction(action);
	// Read the target while the menu is open. Group actions must target the
	// group that was right-clicked, not a later resolution of its member ids.
	emit('action', action, contextMenu.targetNodeIds.value, contextMenu.targetGroupId.value);
}

function onOpenChange(open: boolean) {
	if (!open) contextMenu.close();
}
</script>

<template>
	<Teleport v-if="isOpen" to="body">
		<N8nDropdownMenu
			:model-value="isOpen"
			:items="menuItems"
			placement="right-start"
			:modal="false"
			:suppress-close-auto-focus="true"
			content-test-id="context-menu"
			@update:model-value="onOpenChange"
			@select="onActionSelect"
		>
			<template #trigger>
				<div
					:class="$style.trigger"
					data-context-menu-trigger
					:style="{
						left: `${position[0]}px`,
						top: `${position[1]}px`,
					}"
				/>
			</template>
			<template #item-trailing="{ item }">
				<N8nKeyboardShortcut
					v-if="item.data?.shortcut"
					v-bind="item.data.shortcut"
					:class="$style.shortcut"
				/>
			</template>
		</N8nDropdownMenu>
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

/* Keep the menu on the app context-menu layer, with the canvas. */
:global([data-test-id='context-menu'][data-side]) {
	z-index: var(--context-menu--z);
}

.shortcut {
	display: flex;
}
</style>
