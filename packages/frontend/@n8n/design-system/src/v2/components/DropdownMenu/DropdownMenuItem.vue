<script setup lang="ts" generic="T = string">
import { DropdownMenuItem, DropdownMenuSeparator } from 'reka-ui';
import { computed, useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { DropdownMenuItemProps, DropdownMenuItemSlots } from './DropdownMenu.types';

defineOptions({ inheritAttrs: false });

const props = defineProps<DropdownMenuItemProps<T>>();
defineSlots<DropdownMenuItemSlots<T>>();

const emit = defineEmits<{
	select: [value: T];
}>();

const $style = useCssModule();

const leadingProps = computed(() => ({
	class: $style.itemLeading,
}));

const trailingProps = computed(() => ({
	class: $style.itemTrailing,
}));

const handleSelect = () => {
	if (!props.disabled) {
		emit('select', props.id);
	}
};
</script>

<template>
	<div :class="$style.wrapper">
		<DropdownMenuSeparator v-if="divided" :class="$style.separator" />
		<DropdownMenuItem
			:disabled="disabled"
			:class="[$style.item, props.class]"
			@select="handleSelect"
		>
			<slot name="item-leading" :item="props" :ui="leadingProps">
				<Icon v-if="icon" :icon="icon" :class="$style.itemLeading" />
			</slot>

			<span :class="$style.itemLabel">
				<slot name="item-label" :item="props">
					{{ label }}
				</slot>
			</span>

			<slot name="item-trailing" :item="props" :ui="trailingProps" />

			<Icon v-if="checked" icon="check" :class="$style.itemCheck" />
		</DropdownMenuItem>
	</div>
</template>

<style module>
.wrapper {
	display: contents;
}

.item {
	font-size: var(--font-size--2xs);
	line-height: 1;
	border-radius: var(--radius);
	display: flex;
	align-items: center;
	min-height: var(--spacing--lg);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	position: relative;
	user-select: none;
	color: var(--color--text--shade-1);
	gap: var(--spacing--3xs);
	outline: none;

	&:not([data-disabled]) {
		&:hover,
		&[data-highlighted] {
			background-color: var(--color--background--light-1);
			cursor: pointer;
		}
	}

	&[data-disabled] {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}
}

.itemLeading {
	flex-shrink: 0;
}

.itemLabel {
	flex-grow: 1;
}

.itemCheck,
.itemTrailing {
	margin-left: auto;
	flex-shrink: 0;
}

.separator {
	height: 1px;
	background-color: var(--color--foreground);
	margin: var(--spacing--4xs) var(--spacing--2xs);
}
</style>
