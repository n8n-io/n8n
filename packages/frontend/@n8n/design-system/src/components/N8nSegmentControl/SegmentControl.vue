<script lang="ts" setup generic="Value extends string | boolean = string | boolean">
import { reactiveOmit } from '@vueuse/core';
import { RadioGroupRoot, type AcceptableValue } from 'reka-ui';
import { computed, nextTick, ref, useAttrs } from 'vue';

import type { SegmentControlProps, SegmentOption } from './SegmentControl.types';
import SegmentControlItem from './SegmentControlItem.vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SegmentControlProps<Value>>(), {
	disabled: false,
	size: 'default',
	squareButtons: false,
	loop: true,
});

const emit = defineEmits<{
	'update:modelValue': [value: Value, e: MouseEvent];
}>();

defineSlots<{ option?: (props: SegmentOption<Value>) => unknown }>();

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, 'class'));

/** Last pointer event, so consumers can read ctrl/meta (e.g. open-in-new-tab). */
const lastPointerEvent = ref<MouseEvent>();

/**
 * reka-ui selects on arrow keys via a window keydown listener. That is blocked
 * when keydown doesn't reach window — e.g. our stopPropagation below (so canvas
 * node-nav / editor shortcuts don't also fire), or an ancestor @keydown.stop
 * (modals, keybinding wrappers). RovingFocus still moves focus; we click the
 * focused radio after nextTick to complete selection.
 *
 * Stop all arrows (canvas also binds Up/Down). Only Left/Right drive selection
 * in this horizontal control.
 */
const ARROW_KEYS_STOP = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const ARROW_KEYS_SELECT = ['ArrowLeft', 'ArrowRight'];

function optionKey(value: Value): string {
	return `${typeof value}:${String(value)}`;
}

function toRadioValue(value: Value | undefined): string | undefined {
	if (value === undefined || !props.options?.some((option) => option.value === value)) {
		return undefined;
	}
	return optionKey(value);
}

function findOptionByRadioValue(raw: AcceptableValue): SegmentOption<Value> | undefined {
	if (typeof raw !== 'string') {
		return undefined;
	}
	return props.options?.find((option) => optionKey(option.value) === raw);
}

function onKeyDown(event: KeyboardEvent) {
	if (!ARROW_KEYS_STOP.includes(event.key)) return;

	// Keep arrow keys inside the control so canvas/editor shortcuts don't also fire
	event.stopPropagation();
	if (props.disabled || !ARROW_KEYS_SELECT.includes(event.key)) return;

	const group = event.currentTarget;
	if (!(group instanceof HTMLElement)) return;

	// RovingFocus moves focus in nextTick; wait for that before selecting
	void nextTick(() => {
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
	});
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
			v-bind="rootAttrs"
			:name="name"
			:required="required"
			:loop="loop"
			:dir="dir"
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
	background-color: var(--background--disabled);
}
</style>
