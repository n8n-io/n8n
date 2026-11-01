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
.item {
	border-radius: var(--listbox-item--radius, var(--radius));
	outline: none;

	&:not([data-disabled]) {
		cursor: pointer;

		&:not([data-state='checked'])[data-highlighted] {
			background-color: var(--listbox-item--color--background--highlight, var(--background--hover));
		}
	}

	&[data-state='checked'] {
		background-color: var(--listbox-item--color--background--selected, var(--background--active));
	}

	&[data-disabled] {
		color: var(--listbox-item--color--text--disabled, var(--text-color--disabled));
		cursor: not-allowed;
	}
}
</style>
