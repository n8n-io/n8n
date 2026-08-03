<script lang="ts" setup>
import type { AcceptableValue } from 'reka-ui';
import { RadioGroupRoot } from 'reka-ui';
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { computed, onMounted, onUnmounted, ref, useAttrs } from 'vue';

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
 * reka-ui selects on arrow keys by listening on `window`. Ancestors that call
 * stopPropagation on keydown (editor keybindings, modals, etc.) block that, so
 * RovingFocus still moves focus but selection never updates. Track arrows in
 * capture phase and complete selection on focusin.
 *
 * Clear via window keyup (not group keyup) so the flag cannot stick when focus
 * leaves before keyup; also clear on focus leave and tab hide.
 */
const arrowKeyPressed = ref(false);
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

function clearArrowKeyPressed() {
	arrowKeyPressed.value = false;
}

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

function onKeyDownCapture(event: KeyboardEvent) {
	if (ARROW_KEYS.includes(event.key)) {
		arrowKeyPressed.value = true;
	}
}

function onKeyDown(event: KeyboardEvent) {
	// Keep arrow keys inside the control so canvas/editor shortcuts (node nav, etc.) don't also fire
	if (ARROW_KEYS.includes(event.key)) {
		event.stopPropagation();
	}
}

function onWindowKeyUpCapture(event: KeyboardEvent) {
	if (!ARROW_KEYS.includes(event.key)) return;
	// Match Reka's setTimeout(0) in RadioGroupItem.handleFocus so selection can finish first
	setTimeout(clearArrowKeyPressed, 0);
}

function onVisibilityChange() {
	if (document.visibilityState !== 'visible') {
		clearArrowKeyPressed();
	}
}

function onGroupFocusOut(event: FocusEvent) {
	const group = event.currentTarget;
	if (!(group instanceof HTMLElement)) return;

	const next = event.relatedTarget;
	if (next instanceof Node && group.contains(next)) return;

	// Defer so intra-group moves with a null relatedTarget can settle first
	requestAnimationFrame(() => {
		if (!group.contains(document.activeElement)) {
			clearArrowKeyPressed();
		}
	});
}

function onItemFocusIn(event: FocusEvent) {
	if (!arrowKeyPressed.value || props.disabled) return;

	const target = event.target;
	if (!(target instanceof HTMLElement) || target.getAttribute('role') !== 'radio') {
		return;
	}
	// Skip if already selected (Reka's window listener may have handled it)
	if (target.getAttribute('data-state') === 'checked') {
		return;
	}
	target.click();
}

onMounted(() => {
	window.addEventListener('keyup', onWindowKeyUpCapture, true);
	document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
	window.removeEventListener('keyup', onWindowKeyUpCapture, true);
	document.removeEventListener('visibilitychange', onVisibilityChange);
	clearArrowKeyPressed();
});

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
			@keydown.capture="onKeyDownCapture"
			@keydown="onKeyDown"
			@focusout="onGroupFocusOut"
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
				@focusin="onItemFocusIn"
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
