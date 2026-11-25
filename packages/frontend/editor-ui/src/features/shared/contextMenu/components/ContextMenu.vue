<script lang="ts" setup>
import { useContextMenu } from '@/features/shared/contextMenu/composables/useContextMenu';
import {
	isFocusHandoffAction,
	type ContextMenuAction,
} from '@/features/shared/contextMenu/composables/useContextMenuItems';
import { useStyles } from '@n8n/composables/useStyles';
import { computed, watch } from 'vue';
import {
	N8nDropdownMenu,
	N8nKeyboardShortcut,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@/Interface';

// The menu is driven by `isOpen` instead of Reka's `ContextMenuRoot`. That
// component only opens from a `contextmenu` event, so we used to re-dispatch
// a synthetic one. A script-dispatched `contextmenu` cannot be cancelled in
// time for WebKit, and Safari showed its own menu next to ours (API-490).
const contextMenu = useContextMenu();
const { position, isOpen, actions, anchor } = contextMenu;
const reference = computed(
	() =>
		anchor.value ?? {
			getBoundingClientRect: () => DOMRect.fromRect({ x: position.value[0], y: position.value[1] }),
		},
);
const items = computed(() =>
	actions.value.map(
		(item): DropdownMenuItemProps<ContextMenuAction, ActionDropdownItem<ContextMenuAction>> => ({
			id: item.id,
			data: item,
			label: item.label,
			disabled: item.disabled,
			divided: item.divided,
			icon: item.icon ? { type: 'icon', value: item.icon } : undefined,
			iconSize: 'medium',
			testId: `context-menu-item-${item.id}`,
		}),
	),
);
const emit = defineEmits<{
	action: [action: ContextMenuAction, nodeIds: string[], groupId?: string];
}>();
const { APP_Z_INDEXES } = useStyles();

// When a selected action hands off to another floating layer (e.g. the sticky
// color popover), we must not restore focus as the menu closes — otherwise
// the restore lands outside the freshly-opened layer and dismisses it.
let suppressRestoreFocus = false;
// Dropdown content would move focus to the hidden trigger on close. Restore
// the element that was focused before the menu opened instead, and only when
// the user did not click elsewhere, which already moved focus itself.
let previouslyFocused: HTMLElement | null = null;
let interactedOutside = false;

watch(isOpen, (open) => {
	if (!open) return;
	previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	interactedOutside = false;
});

function onActionSelect(item: ContextMenuAction) {
	suppressRestoreFocus = isFocusHandoffAction(item);
	// Read the target while the menu is guaranteed open, and hand it down as
	// data — group actions must target the group that was right-clicked, not
	// whatever the snapshotted member ids resolve to at dispatch time.
	emit('action', item, contextMenu.targetNodeIds.value, contextMenu.targetGroupId.value);
}

function onInteractOutside() {
	interactedOutside = true;
}

function onCloseAutoFocus(event: Event) {
	event.preventDefault();
	const restore = !suppressRestoreFocus && !interactedOutside;
	suppressRestoreFocus = false;
	if (restore) previouslyFocused?.focus();
	previouslyFocused = null;
}

function onOpenChange(open: boolean) {
	if (!open) {
		contextMenu.close();
	}
}
</script>

<template>
	<Teleport v-if="isOpen" to="body">
		<N8nDropdownMenu
			:model-value="isOpen"
			:items="items"
			:modal="false"
			:reference="reference"
			:placement="anchor ? 'bottom-end' : 'right-start'"
			:extra-popper-class="$style.content"
			content-test-id="context-menu"
			@update:model-value="onOpenChange"
			@select="onActionSelect"
			@close-auto-focus="onCloseAutoFocus"
			@interact-outside="onInteractOutside"
		>
			<template #trigger><span hidden /></template>
			<template #item-trailing="{ item, ui }">
				<N8nKeyboardShortcut
					v-if="item.data?.shortcut"
					v-bind="item.data?.shortcut"
					:class="ui.class"
				/>
			</template>
		</N8nDropdownMenu>
	</Teleport>
</template>

<style module lang="scss">
.content {
	z-index: v-bind('APP_Z_INDEXES.CONTEXT_MENU');
}
</style>
