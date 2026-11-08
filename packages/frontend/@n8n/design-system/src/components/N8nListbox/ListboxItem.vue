<script setup lang="ts">
import N8nIcon from '../N8nIcon';
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
		<span v-if="icon || $slots.leading" :class="$style.leading">
			<slot name="leading">
				<N8nIcon v-if="icon" :icon="icon" size="large" />
			</slot>
		</span>
		<span :class="$style.content">
			<slot />
		</span>
		<span v-if="$slots.trailing" :class="$style.trailing">
			<slot name="trailing" />
		</span>
	</ListboxItem>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/floating-item' as floating-item;

.item {
	@include floating-item.floating-item;

	gap: var(--n8n-listbox-item--gap, var(--spacing--2xs));
	min-height: var(--n8n-listbox-item--min-height, var(--spacing--xl));
	padding: var(--n8n-listbox-item--padding, var(--spacing--2xs));
	border-radius: var(--n8n-listbox-item--radius, var(--radius));

	&:not([data-disabled]) {
		cursor: pointer;

		&:not([data-state='checked'])[data-highlighted] {
			background-color: var(
				--n8n-listbox-item--color--background--highlight,
				var(--background--hover)
			);
		}
	}

	&[data-state='checked'] {
		background-color: var(
			--n8n-listbox-item--color--background--selected,
			var(--background--active)
		);
	}

	&[data-disabled] {
		color: var(--n8n-listbox-item--color--text--disabled, var(--text-color--disabled));
		cursor: not-allowed;
	}
}

.leading,
.trailing {
	display: inline-flex;
	flex: none;
	align-items: center;
}

.content {
	flex: 1;
	min-width: 0;
}
</style>
