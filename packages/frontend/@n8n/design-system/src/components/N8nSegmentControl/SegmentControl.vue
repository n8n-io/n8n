<script lang="ts" setup generic="Value extends string | boolean">
import type { AcceptableValue } from 'reka-ui';
import { RadioGroupRoot } from 'reka-ui';
import { reactiveOmit } from '@vueuse/core';
import { computed, ref, useAttrs } from 'vue';

import type { SegmentControlSize } from './SegmentControl.types';
import SegmentControlItem from './SegmentControlItem.vue';

export type { SegmentControlSize };

defineOptions({ inheritAttrs: false });

interface SegmentOption {
	label: string;
	value: Value;
	disabled?: boolean;
	data?: Record<string, string | number | boolean | undefined>;
}

interface SegmentControlProps {
	modelValue?: Value;
	options?: SegmentOption[];
	/** @default medium */
	size?: SegmentControlSize;
	disabled?: boolean;
	squareButtons?: boolean;
}

const props = withDefaults(defineProps<SegmentControlProps>(), {
	disabled: false,
	size: 'medium',
	squareButtons: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: Value, e: MouseEvent];
}>();

defineSlots<{ option?: ((props: SegmentOption) => {}) | undefined }>();

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, 'class'));

/** Reka values are compared by identity; stringify so boolean options work. */
const serializedModelValue = computed(() =>
	props.modelValue === undefined ? undefined : String(props.modelValue),
);

/**
 * reka-ui selects on arrow keys by listening on window. Parent containers that
 * call stopPropagation on keydown (e.g. modals) can block that, so we track
 * arrow keys in capture phase and complete selection on focusin in the item.
 */
const arrowKeyPressed = ref(false);
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/**
 * After keyboard selection the cursor may still sit over a segment, leaving a
 * sticky :hover. Suppress hover until the pointer moves again.
 */
const suppressHover = ref(false);
/** Ignore synthetic pointer events fired when focus/layout shifts under the cursor. */
const canClearHover = ref(false);

/** Last pointer event, so consumers like TabBar can read ctrl/meta for open-in-new-tab. */
const lastPointerEvent = ref<MouseEvent>();

function onKeyDownCapture(event: KeyboardEvent) {
	if (ARROW_KEYS.includes(event.key)) {
		arrowKeyPressed.value = true;
		suppressHover.value = true;
		canClearHover.value = false;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				canClearHover.value = true;
			});
		});
	}
}

function onKeyUp() {
	arrowKeyPressed.value = false;
}

function onPointerInteract() {
	if (!canClearHover.value) return;
	suppressHover.value = false;
}

function onItemClickCapture(event: MouseEvent) {
	const target = event.target;
	if (!(target instanceof HTMLElement)) return;
	if (target.closest('[role="radio"]')) {
		lastPointerEvent.value = event;
	}
}

function onItemFocusIn(event: FocusEvent) {
	if (!arrowKeyPressed.value) return;

	const target = event.target;
	if (target instanceof HTMLElement && target.getAttribute('role') === 'radio') {
		target.click();
	}
}

function findOption(raw: AcceptableValue): SegmentOption | undefined {
	return props.options?.find((option) => String(option.value) === String(raw));
}

function onUpdate(raw: AcceptableValue) {
	const option = findOption(raw);
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
			disabled && $style.disabled,
			rootClass,
		]"
		:data-suppress-hover="suppressHover || undefined"
		@pointermove="onPointerInteract"
		@pointerdown="onPointerInteract"
	>
		<RadioGroupRoot
			v-bind="rootAttrs"
			:model-value="serializedModelValue"
			:disabled="disabled"
			orientation="horizontal"
			:loop="true"
			:class="$style.group"
			@update:model-value="onUpdate"
			@keydown.capture="onKeyDownCapture"
			@keyup="onKeyUp"
			@click.capture="onItemClickCapture"
		>
			<SegmentControlItem
				v-for="option in options"
				:key="`${option.value}`"
				:label="option.label"
				:value="`${option.value}`"
				:disabled="disabled || option.disabled"
				:square="squareButtons"
				@focusin="onItemFocusIn"
			>
				<slot name="option" v-bind="option" />
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

.medium {
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

.disabled {
	cursor: not-allowed;
	opacity: 0.7;
}
</style>
