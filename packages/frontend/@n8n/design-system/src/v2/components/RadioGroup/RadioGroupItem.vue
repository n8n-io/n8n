<script setup lang="ts">
import { Label, RadioGroupIndicator, RadioGroupItem as RekaRadioGroupItem } from 'reka-ui';
import { useId } from 'vue';

import type { RadioGroupItemProps, RadioGroupItemSlots } from './RadioGroupItem.types';

defineProps<RadioGroupItemProps>();
defineSlots<RadioGroupItemSlots>();

const id = useId();
</script>

<template>
	<div :class="$style.item">
		<RekaRadioGroupItem :id="id" :value="value" :disabled="disabled" :class="$style.control">
			<RadioGroupIndicator :class="$style.dot" />
		</RekaRadioGroupItem>
		<Label v-if="label || description || !!$slots.default" :for="id" :class="$style.content">
			<slot>
				<span :class="$style.label">{{ label }}</span>
				<span v-if="description" :class="$style.description">{{ description }}</span>
			</slot>
		</Label>
	</div>
</template>

<style lang="scss" module>
@use '../../../css/mixins/focus';

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	cursor: pointer;

	&:has(.description) {
		align-items: flex-start;
	}

	&:has(.control[data-disabled]) {
		cursor: not-allowed;
	}
}

.control {
	position: relative;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--full);

	.item:has(.description) & {
		margin-top: 1px;
	}

	&:hover:not([data-disabled]):not([data-state='checked']) {
		border-color: var(--background--brand);
	}

	&[data-state='checked']:not([data-disabled]) {
		background-color: var(--background--brand);
		border-color: var(--background--brand--hover);
	}

	&[data-disabled]:not([data-state='checked']) {
		border-color: var(--border-color--subtle);
	}

	&[data-disabled][data-state='checked'] {
		background-color: var(--background--disabled);
		border-color: var(--background--disabled);
	}

	&:focus-visible {
		outline: none;
		@include focus.focus-ring-gap;
	}
}

.dot {
	position: absolute;
	top: 50%;
	left: 50%;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
	background-color: var(--background--surface);
	transform: translate(-50%, -50%);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	color: var(--text-color);

	.item:has(.control[data-disabled]) & {
		color: var(--text-color--disabled);
	}
}

.label {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	font-weight: var(--font-weight--regular);
}

.description {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}
</style>
