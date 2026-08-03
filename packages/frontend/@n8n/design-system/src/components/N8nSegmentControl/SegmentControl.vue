<script lang="ts" setup>
import type { AcceptableValue } from 'reka-ui';
import { RadioGroupRoot } from 'reka-ui';
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { computed, ref, useAttrs } from 'vue';

import type { SegmentControlProps, SegmentOption } from './SegmentControl.types';
import SegmentControlItem from './SegmentControlItem.vue';

defineOptions({ inheritAttrs: false });

type SegmentValue = string | boolean;

const props = withDefaults(defineProps<SegmentControlProps<SegmentValue>>(), {
	disabled: false,
	size: 'default',
	squareButtons: false,
	loop: true,
});

const emit = defineEmits<{
	'update:modelValue': [value: SegmentValue, e: MouseEvent];
}>();

defineSlots<{ option?: (props: SegmentOption<SegmentValue>) => unknown }>();

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, 'class'));
const rootProps = reactivePick(props, 'name', 'required', 'loop', 'dir');

/** Last pointer event, so consumers can read ctrl/meta (e.g. open-in-new-tab). */
const lastPointerEvent = ref<MouseEvent>();

/**
 * reka-ui selects on arrow keys via a window keydown listener. Ancestors (and
 * our own stopPropagation below) block that, so RovingFocus still moves focus
 * but selection never updates. After keydown, click the focused radio.
 */
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

function optionKey(value: SegmentValue): string {
	return `${typeof value}:${String(value)}`;
}

function toRadioValue(value: SegmentValue | undefined): string | undefined {
	if (value === undefined || !props.options?.some((option) => option.value === value)) {
		return undefined;
	}
	return optionKey(value);
}

function findOptionByRadioValue(raw: AcceptableValue): SegmentOption<SegmentValue> | undefined {
	if (typeof raw !== 'string') {
		return undefined;
	}
	return props.options?.find((option) => optionKey(option.value) === raw);
}

function onKeyDown(event: KeyboardEvent) {
	if (!ARROW_KEYS.includes(event.key)) return;

	// Keep arrow keys inside the control so canvas/editor shortcuts don't also fire
	event.stopPropagation();
	if (props.disabled) return;

	const group = event.currentTarget;
	if (!(group instanceof HTMLElement)) return;

	// RovingFocus has already moved focus by the time this timeout runs
	setTimeout(() => {
		const active = document.activeElement;
		if (!(active instanceof HTMLElement) || !group.contains(active)) {
			return;
		}
		if (active.getAttribute('role') !== 'radio') {
			return;
		}
		if (active.getAttribute('data-state') === 'checked') {
			return;
		}
		active.click();
	}, 0);
}

function onItemClickCapture(event: MouseEvent) {
	const target = event.target;
	if (!(target instanceof HTMLElement)) return;
	if (target.closest('[role="radio"]')) {
		lastPointerEvent.value = event;
	}
}

function onUpdate(raw: AcceptableValue) {
	const option = findOptionByRadioValue(raw);
	if (!option || props.disabled || option.disabled) {
		return;
	}

	const event = lastPointerEvent.value ?? new MouseEvent('click');
	lastPointerEvent.value = undefined;
	emit('update:modelValue', option.value, event);
}
</script>

<template>
	<div
		:class="[
			'n8n-segment-control',
			$style.segmentControl,
			$style[size],
			disabled && $style.isDisabled,
			rootClass,
		]"
	>
		<RadioGroupRoot
			v-bind="{ ...rootProps, ...rootAttrs }"
			:model-value="toRadioValue(modelValue)"
			:default-value="toRadioValue(defaultValue)"
			:disabled="disabled"
			orientation="horizontal"
			:class="$style.group"
			@update:model-value="onUpdate"
			@keydown="onKeyDown"
			@click.capture="onItemClickCapture"
		>
			<SegmentControlItem
				v-for="option in options"
				:key="optionKey(option.value)"
				:label="option.label"
				:value="optionKey(option.value)"
				:data-test-id="`radio-button-${option.value}`"
				:disabled="disabled || option.disabled"
				:square="squareButtons"
			>
				<slot name="option" v-bind="option">
					{{ option.label }}
				</slot>
			</SegmentControlItem>
		</RadioGroupRoot>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/input' as input-mixin;

.segmentControl {
	@include input-mixin.size-variables('medium');

	--segment-control--padding: var(--spacing--5xs);
	--segment-control--font-size: var(--font-size--2xs);
	--segment-control--item-padding: 0 var(--spacing--xs);

	display: inline-flex;
	align-items: stretch;
	height: var(--input--height);
	line-height: 1;
	vertical-align: middle;
	background-color: var(--color--foreground);
	padding: var(--segment-control--padding);
	border-radius: var(--radius--2xs);
}

.mini {
	@include input-mixin.size-variables('mini');

	--segment-control--font-size: var(--font-size--3xs);
	--segment-control--item-padding: 0 var(--spacing--2xs);
}

.small {
	@include input-mixin.size-variables('small');

	--segment-control--font-size: var(--font-size--3xs);
	--segment-control--item-padding: 0 var(--spacing--2xs);
}

.default {
	@include input-mixin.size-variables('medium');

	--segment-control--font-size: var(--font-size--2xs);
	--segment-control--item-padding: 0 var(--spacing--xs);
}

.large {
	@include input-mixin.size-variables('large');

	--segment-control--font-size: var(--font-size--xs);
	--segment-control--item-padding: 0 var(--spacing--xs);
}

.xlarge {
	@include input-mixin.size-variables('xlarge');

	--segment-control--font-size: var(--font-size--sm);
	--segment-control--item-padding: 0 var(--spacing--sm);
}

.group {
	display: flex;
	align-items: stretch;
	flex: 1;
	width: 100%;
	gap: var(--spacing--5xs);
}

.isDisabled {
	cursor: not-allowed;
	opacity: 0.7;
}
</style>
