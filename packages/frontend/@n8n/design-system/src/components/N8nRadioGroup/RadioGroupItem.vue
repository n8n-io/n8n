<script setup lang="ts">
import { computed, inject, useAttrs, useId } from 'vue';

import { radioGroupArrowKeyPressedKey } from './radio-group-context';
import type { RadioGroupItemProps, RadioGroupItemSlots } from './RadioGroupItem.types';
import {
	injectRadioGroupRootContext,
	Label,
	RadioGroupIndicator,
	RadioGroupItem as RekaRadioGroupItem,
} from './reka-ui';

defineOptions({ inheritAttrs: false });

const props = defineProps<RadioGroupItemProps>();
const slots = defineSlots<RadioGroupItemSlots>();
const attrs = useAttrs();
const generatedId = useId();
const uuid = computed(() => props.id ?? generatedId);
const groupContext = injectRadioGroupRootContext(null);
const arrowKeyPressed = inject(radioGroupArrowKeyPressedKey, null);
const isVertical = computed(() => (groupContext?.orientation.value ?? 'vertical') === 'vertical');

function hasLabel() {
	return Boolean(props.label || props.description || slots.label);
}

// Completes arrow-key selection when a parent stops keydown propagation — see RadioGroup.vue.
function onItemFocusIn(event: FocusEvent) {
	if (!arrowKeyPressed?.value) return;

	const target = event.target;
	if (target instanceof HTMLElement && target.getAttribute('role') === 'radio') {
		target.click();
	}
}
</script>

<template>
	<div :class="[$style.item, isVertical && $style.itemVertical]" @focusin="onItemFocusIn">
		<RekaRadioGroupItem
			:id="uuid"
			v-bind="attrs"
			:value="value"
			:disabled="disabled"
			:class="$style.control"
		>
			<RadioGroupIndicator :class="$style.dot" />
		</RekaRadioGroupItem>
		<div v-if="hasLabel() || slots.content" :class="$style.body">
			<Label
				v-if="hasLabel()"
				:for="uuid"
				:class="$style.content"
				:data-disabled="disabled ? '' : undefined"
			>
				<slot name="label" :label="label" :description="description">
					<span :class="$style.label">{{ label }}</span>
					<span v-if="description" :class="$style.description">{{ description }}</span>
				</slot>
			</Label>
			<div v-if="slots.content" :class="$style.followUp">
				<slot name="content" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;

	// Top-align the control only when the label column is taller than the control.
	// A label-only option stays centered.
	&:has(.description),
	&:has(.followUp > *) {
		align-items: flex-start;
	}

	&:has(.control[data-disabled]) {
		cursor: not-allowed;
	}
}

.itemVertical {
	width: 100%;
}

.control {
	position: relative;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--full);
	cursor: inherit;
	flex-shrink: 0;

	&[data-disabled] {
		cursor: not-allowed;
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

	@include focus.focus-visible-ring-offset;
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

.body {
	display: flex;
	flex-direction: column;
	min-width: 0;

	.itemVertical & {
		flex: 1;
	}
}

.followUp {
	cursor: auto;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	cursor: inherit;
	color: var(--text-color);

	.item:has(.control[data-disabled]) & {
		cursor: not-allowed;
		color: var(--text-color--disabled);
	}
}

.label {
	font-size: var(--radio-group-item--label--font-size, var(--font-size--sm));
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
}

.description {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
}
</style>
