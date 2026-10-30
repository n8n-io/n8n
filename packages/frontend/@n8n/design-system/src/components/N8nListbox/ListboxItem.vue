<script setup lang="ts">
import type { ListboxItemEmits, ListboxItemProps, ListboxItemSlots } from './ListboxItem.types';
import { ListboxItem } from './reka-ui';

defineOptions({ name: 'N8nListboxItem' });

defineProps<ListboxItemProps>();
defineSlots<ListboxItemSlots>();

const emit = defineEmits<ListboxItemEmits>();

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
