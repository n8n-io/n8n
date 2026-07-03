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
			<span :class="$style.circle">
				<RadioGroupIndicator :class="$style.dot" />
			</span>
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

	&:has(.description) {
		align-items: flex-start;
	}

	&:has(.control[data-disabled]) {
		cursor: not-allowed;
	}
}

.control {
	display: inline-flex;
	flex: 0 0 auto;
	padding: 0;
	border: none;
	background: transparent;
	cursor: pointer;
	line-height: 0;

	&:focus-visible {
		outline: none;

		.circle {
			@include focus.focus-ring-gap;
		}
	}

	&[data-disabled] {
		cursor: not-allowed;
	}
}

.circle {
	position: relative;
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--full);

	.item:has(.description) & {
		margin-top: 1px;
	}

	.control:hover:not([data-disabled]):not([data-state='checked']) & {
		border-color: var(--color--primary);
	}

	.control[data-state='checked']:not([data-disabled]) & {
		background-color: var(--background--brand);
		border-color: var(--color--orange-600);
	}

	.control[data-disabled]:not([data-state='checked']) & {
		border-color: var(--border-color--subtle);
	}

	.control[data-disabled][data-state='checked'] & {
		background-color: var(--background--disabled);
		border-color: var(--background--disabled);
	}
}

.dot {
	position: absolute;
	top: 50%;
	left: 50%;
	display: block;
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
	cursor: pointer;
	font: inherit;
	color: var(--text-color);

	.item:has(.control[data-disabled]) & {
		cursor: not-allowed;
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

	.item:has(.control[data-disabled]) & {
		color: var(--text-color--disabled);
	}
}
</style>
