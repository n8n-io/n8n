<script setup lang="ts">
import { getCurrentInstance, onBeforeUnmount, onMounted, onUpdated, useAttrs } from 'vue';

import type { ListboxItemEmits, ListboxItemProps, ListboxItemSlots } from './ListboxItem.types';
import { ListboxItem } from './reka-ui';

defineOptions({ name: 'N8nListboxItem' });

defineProps<ListboxItemProps>();
defineSlots<ListboxItemSlots>();

const emit = defineEmits<ListboxItemEmits>();
const attrs = useAttrs();
const instance = getCurrentInstance();

// Reka memos the option and keeps the first attributes.
// Copy the latest attributes after each render.
function applyAttrs() {
	const el = instance?.vnode.el;
	if (!(el instanceof HTMLElement)) return;

	for (const [key, value] of Object.entries(attrs)) {
		if (key === 'class' || key === 'style' || key.startsWith('on')) continue;
		if (value === undefined || value === null) {
			el.removeAttribute(key);
			continue;
		}
		if (value === false) {
			if (key.startsWith('aria-') || key.startsWith('data-')) el.setAttribute(key, 'false');
			else el.removeAttribute(key);
			continue;
		}
		if (value === true) {
			el.setAttribute(key, 'true');
			continue;
		}
		if (typeof value === 'string' || typeof value === 'number') {
			el.setAttribute(key, String(value));
		}
	}
}

// Up and Down move between items. They leave a button or an open menu alone.
function onItemKeydown(event: KeyboardEvent) {
	if (event.target === event.currentTarget || event.key === 'Tab') return;
	event.stopPropagation();
}

function itemElement() {
	const el = instance?.vnode.el;
	return el instanceof HTMLElement ? el : null;
}

onMounted(() => {
	applyAttrs();
	itemElement()?.addEventListener('keydown', onItemKeydown);
});

onUpdated(applyAttrs);

onBeforeUnmount(() => {
	itemElement()?.removeEventListener('keydown', onItemKeydown);
});

function onSelect(event: Event) {
	emit('select', event);
}
</script>

<template>
	<ListboxItem
		:value="value"
		:disabled="disabled"
		:aria-disabled="disabled ? 'true' : undefined"
		:data-value="value"
		:class="$style.item"
		@select="onSelect"
	>
		<slot />
	</ListboxItem>
</template>

<style lang="scss" module>
@use '../../css/mixins/_focus.scss';

.item {
	box-sizing: border-box;
	width: 100%;
	min-width: 0;
	border-radius: var(--listbox-item--radius, var(--radius));
	outline: none;
	cursor: pointer;
	text-align: start;

	// The fill follows data-highlighted. :not([data-state='checked']) keeps this
	// rule from beating the selected fill when both states are on one row.
	&:not([data-disabled]):not([data-state='checked'])[data-highlighted] {
		background-color: var(
			--listbox-item--color--background--highlight,
			var(--color--background--light-1)
		);
	}

	&[data-state='checked'] {
		background-color: var(--listbox-item--color--background--selected, var(--background--active));
	}

	&:focus-visible,
	&[data-highlighted]:focus {
		position: relative;
		z-index: 1;
		// A positioned track paints over an outline. Draw the ring above it.
		outline: none;

		&::after {
			content: '';
			position: absolute;
			z-index: 1;
			inset: 0;
			border-radius: inherit;
			pointer-events: none;
			@include focus.focus-ring;
		}
	}

	&[data-disabled] {
		color: var(--listbox-item--color--text--disabled, var(--text-color--disabled));
		cursor: not-allowed;
	}
}
</style>
