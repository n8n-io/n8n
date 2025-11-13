<script lang="ts" setup>
import type { PrimitiveProps } from 'reka-ui';
import { Primitive } from 'reka-ui';
import type { Component } from 'vue';
import { computed, nextTick, ref } from 'vue';

import { N8nIcon, N8nText } from '@n8n/design-system/components';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { isIconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import type { IMenuItem } from '@n8n/design-system/types';

// Discriminated union for proper TypeScript autocomplete
type MenuItemAsButton = {
	as?: 'button';
	type?: 'button' | 'submit' | 'reset';
	disabled?: boolean;
} & PrimitiveProps;

type MenuItemAsLink = {
	as: 'a';
	href: string;
	target?: string;
	rel?: string;
} & PrimitiveProps;

type MenuItemAsComponent = {
	as: Component;
} & PrimitiveProps;

type MenuItemProps = MenuItemAsButton | MenuItemAsLink | MenuItemAsComponent;

interface BaseProps {
	item: IMenuItem;
	collapsed?: boolean;
	/** When `true`, prevents the user from interacting with the item. */
	disabled?: boolean;
	/**
	 * Optional text used for typeahead purposes. By default the typeahead
	 * behavior will use the `.textContent` of the item.
	 * Use this when the content is complex, or you have non-textual content inside.
	 */
	textValue?: string;
}

const props = withDefaults(defineProps<MenuItemProps & BaseProps>(), {
	as: 'button',
});

const emit = defineEmits<{
	click: [event: MouseEvent];
	select: [event: Event];
}>();

const isFocused = ref(false);

// Helper function to check if event is from mouse
function isMouseEvent(event: PointerEvent): boolean {
	return event.pointerType === 'mouse';
}

// Pointer event handlers for better mouse interaction
async function handlePointerMove(event: PointerEvent) {
	if (event.defaultPrevented) return;
	if (!isMouseEvent(event)) return;

	if (props.disabled || props.item.disabled) {
		// Handle item leave if disabled
		// TODO: Integrate with menu content context when available
	} else {
		// Focus the item for keyboard navigation
		const item = event.currentTarget;
		(item as HTMLElement)?.focus({ preventScroll: true });
	}
}

async function handlePointerLeave(event: PointerEvent) {
	await nextTick();
	if (event.defaultPrevented) return;
	if (!isMouseEvent(event)) return;

	// TODO: Integrate with menu content context when available
}

const icon = computed<
	{ value: IconName; type: 'icon' } | { value: string; type: 'emoji' } | undefined
>(() => {
	if (isIconOrEmoji(props.item.icon)) {
		return props.item.icon;
	} else if (typeof props.item.icon === 'string') {
		return { value: props.item.icon, type: 'icon' };
	}
	return undefined;
});
</script>

<template>
	<Primitive
		v-bind="$attrs"
		:class="[
			$style.MenuItem,
			{
				[$style.MenuItemCollapsed]: collapsed,
				[$style.MenuItemDisabled]: disabled || item.disabled,
				[$style.MenuItemFocused]: isFocused,
			},
		]"
		:disabled="disabled || item.disabled"
		:data-textvalue="textValue || item.label"
		@click="emit('click', $event)"
		@select="emit('select', $event)"
		@pointermove="handlePointerMove"
		@pointerleave="handlePointerLeave"
		@focus="isFocused = true"
		@blur="isFocused = false"
	>
		<div v-if="icon" :class="$style.MenuItemIcon">
			<span v-if="item.notification" :class="$style.MenuItemNotification" />
			<N8nText
				v-if="icon.type === 'emoji'"
				:class="{ [$style.MenuItemIconToHide]: $slots.toggle && !collapsed }"
				>{{ icon.value }}</N8nText
			>
			<N8nIcon
				v-else
				:class="{ [$style.MenuItemIconToHide]: $slots.toggle && !collapsed }"
				color="text-base"
				size="large"
				:icon="icon.value"
			/>
			<div
				v-if="$slots.toggle && !collapsed"
				:class="[$style.MenuItemActions, $style.MenuItemActionChevron]"
			>
				<slot name="toggle"></slot>
			</div>
		</div>
		<N8nText v-if="!collapsed" color="text-dark" :class="$style.MenuItemLabel">
			{{ item.label }}
		</N8nText>
		<div v-if="!collapsed" :class="$style.MenuItemIcon">
			<N8nIcon v-if="item.secondaryIcon" :icon="item.secondaryIcon.name" color="text-light" />
		</div>
		<div
			v-if="$slots.actions && !collapsed"
			:class="[$style.MenuItemActions, $style.MenuItemActionsRight]"
		>
			<slot name="actions"></slot>
		</div>
	</Primitive>
</template>

<style module>
.MenuItem {
	background: none;
	border: none;
	display: flex;
	align-items: center;
	height: var(--spacing--xl);
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	gap: var(--spacing--4xs);
	width: 100%;
	position: relative;
}

.MenuItemCollapsed {
	width: var(--spacing--xl);
}

.MenuItem:hover,
.MenuItem:focus-visible,
.MenuItem:has(:focus-visible) {
	background-color: var(--color--background--light-1);
	cursor: pointer;
}

.MenuItem:focus-visible {
	outline: 2px solid var(--color--secondary);
}

.MenuItemIcon {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
}

.MenuItemNotification {
	position: absolute;
	top: 0;
	right: 0;
	width: var(--spacing--4xs);
	height: var(--spacing--4xs);
	background-color: var(--color--primary);
	border-radius: 50%;
}

.MenuItemActions {
	opacity: 0;
}

.MenuItem:hover .MenuItemActions,
.MenuItem:focus-visible .MenuItemActions,
.MenuItem:has(:focus-visible) .MenuItemActions {
	opacity: 1;
}

.MenuItem:hover .MenuItemIconToHide,
.MenuItem:focus-visible .MenuItemIconToHide,
.MenuItem:has(:focus-visible) .MenuItemIconToHide {
	opacity: 0;
}

.MenuItemActionChevron {
	position: absolute;
	left: 1px;
	top: 1px;
}

.MenuItemActionsRight {
	margin-left: auto;
	align-items: center;
	gap: var(--spacing--5xs);
	background-color: var(--color--background--light-1);
	display: none;
}

.MenuItem:hover .MenuItemActionsRight,
.MenuItem:focus-visible .MenuItemActionsRight,
.MenuItem:has(:focus-visible) .MenuItemActionsRight {
	display: flex;
}

.MenuItemLabel {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-align: left;
}

.MenuItemDisabled,
.MenuItemDisabled:disabled {
	opacity: 0.75;
	pointer-events: none;
	cursor: not-allowed;
}

.MenuItemFocused {
	background-color: var(--color--background);
}
</style>
