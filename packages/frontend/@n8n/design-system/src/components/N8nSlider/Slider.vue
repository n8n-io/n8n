<script setup lang="ts">
import { computed, ref, useCssModule, useId, useTemplateRef } from 'vue';
import N8nText from '../N8nText';

import type { SliderEmits, SliderProps, SliderValue } from './Slider.types';

const props = withDefaults(defineProps<SliderProps>(), {
	size: 'large',
	maxValue: 100,
	minValue: 0,
	step: 1,
	minDistance: 0,
	hideLabel: false,
	showStepMarkers: false,
	disabled: false,
	hideValue: false,
});

const emit = defineEmits<SliderEmits>();
const styles = useCssModule();
const labelId = useId();
const isDragging = ref(false);
const animateFill = ref(false);
const control = useTemplateRef<HTMLDivElement>('control');
const localValue = ref(props.defaultValue?.[0] ?? props.minValue);
const value = computed(() => props.modelValue?.[0] ?? localValue.value);
let dragPointerId: number | undefined;
let dragValue = 0;

const sizeClass = computed(() => styles[props.size]);

const fontSize = computed(() => {
	switch (props.size) {
		case 'mini':
			return '2xs';
		case 'xlarge':
			return 'sm';
		default:
			return 'xs';
	}
});

const formattedValue = computed(() => props.formatValue?.(value.value) ?? value.value);

const markers = computed(() =>
	props.showStepMarkers && props.maxValue > props.minValue
		? [10, 20, 30, 40, 50, 60, 70, 80, 90]
		: [],
);

const fillStyle = computed(() => {
	const range = props.maxValue - props.minValue;
	const percentage = range > 0 ? ((value.value - props.minValue) / range) * 100 : 0;
	return { width: `${Math.min(100, Math.max(0, percentage))}%` };
});

/** Allows slider to be controllable with key events whilst focused */
function handleKeyDown(event: KeyboardEvent) {
	if (props.disabled || isDragging.value) {
		return;
	}

	const step = props.step > 0 ? props.step : 1;
	const arrowStep = event.shiftKey ? step * 10 : step;
	let nextValue: number;
	switch (event.key) {
		case 'ArrowUp':
		case 'ArrowRight':
			nextValue = value.value + arrowStep;
			break;
		case 'ArrowDown':
		case 'ArrowLeft':
			nextValue = value.value - arrowStep;
			break;
		case 'Home':
			nextValue = props.minValue;
			break;
		case 'End':
			nextValue = props.maxValue;
			break;
		case 'PageUp':
			nextValue = value.value + step * 10;
			break;
		case 'PageDown':
			nextValue = value.value - step * 10;
			break;
		default:
			return;
	}

	event.preventDefault();
	const clampedValue = Math.min(
		props.maxValue,
		Math.max(props.minValue, Number(nextValue.toPrecision(15))),
	);
	if (clampedValue === value.value) {
		return;
	}

	localValue.value = clampedValue;
	emit('update:modelValue', [clampedValue]);
	emit('valueCommit', [clampedValue]);
}

function handleDragStart(event: PointerEvent) {
	if (props.disabled || isDragging.value || event.button !== 0 || !control.value) {
		return;
	}

	dragPointerId = event.pointerId;
	dragValue = value.value;
	control.value.setPointerCapture(event.pointerId);
	isDragging.value = true;
	animateFill.value = true;
	control.value.focus();
	handleDrag(event);
	event.preventDefault();
}

function handleDrag(event: PointerEvent) {
	if (props.disabled || !isDragging.value || event.pointerId !== dragPointerId) {
		return;
	}

	if (event.type === 'pointermove') {
		animateFill.value = false;
	}

	const bounds = control.value?.getBoundingClientRect();
	if (!bounds || bounds.width <= 0 || props.maxValue <= props.minValue) {
		return;
	}

	const nextValue =
		props.minValue +
		((event.clientX - bounds.left) / bounds.width) * (props.maxValue - props.minValue);
	const step = props.step ?? 1;
	const steppedValue =
		step > 0 ? props.minValue + Math.round((nextValue - props.minValue) / step) * step : nextValue;
	const clampedValue = Math.min(
		props.maxValue,
		Math.max(props.minValue, Number(steppedValue.toPrecision(15))),
	);
	if (clampedValue === dragValue) {
		return;
	}

	dragValue = clampedValue;
	localValue.value = clampedValue;
	const nextModelValue: SliderValue = [clampedValue];
	emit('update:modelValue', nextModelValue);
}

function handleDragEnd(event: PointerEvent) {
	if (!isDragging.value || event.pointerId !== dragPointerId) {
		return;
	}

	if (event.type === 'pointerup') {
		handleDrag(event);
	}
	isDragging.value = false;
	dragPointerId = undefined;
	if (control.value?.hasPointerCapture(event.pointerId)) {
		control.value.releasePointerCapture(event.pointerId);
	}
	if (!props.disabled && event.type === 'pointerup') {
		emit('valueCommit', [dragValue]);
	}
}
</script>

<template>
	<div
		:class="[
			$style.slider,
			sizeClass,
			{ [$style.disabled]: disabled, [$style.dragging]: isDragging },
		]"
		@pointerdown="handleDragStart"
		@pointermove="handleDrag"
		@pointerup="handleDragEnd"
		@pointercancel="handleDragEnd"
		@lostpointercapture="handleDragEnd"
	>
		<div
			ref="control"
			:class="$style.control"
			role="slider"
			@keydown="handleKeyDown"
			:tabindex="disabled ? -1 : 0"
			:aria-disabled="disabled"
			:aria-valuenow="value"
			:aria-valuetext="String(formattedValue)"
			:aria-labelledby="labelId"
			:aria-valuemin="minValue"
			:aria-valuemax="maxValue"
		>
			<div :class="$style.hashmarks" aria-hidden="true">
				<div
					v-for="marker in markers"
					:key="marker"
					:class="$style.hashmark"
					:style="{ left: `${marker}%` }"
				/>
			</div>
			<div
				:class="[$style.fill, { [$style.animateFill]: animateFill }]"
				:style="fillStyle"
				aria-hidden="true"
			/>
		</div>
		<N8nText
			:step="fontSize"
			bold
			color="text-base"
			:id="labelId"
			:class="hideLabel ? $style.hiddenLabel : $style.label"
			>{{ label }}</N8nText
		>
		<N8nText
			v-if="!hideValue"
			:step="fontSize"
			bold
			color="text-dark"
			:class="$style.value"
			aria-hidden="true"
			>{{ formattedValue }}</N8nText
		>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';
@use '../../css/mixins/focus';

.slider {
	position: relative;
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--input--padding);
	height: var(--n8n-slider--height, var(--height--lg));
	padding-inline: var(--n8n-slider--padding-inline, var(--spacing--xs));
	border-radius: var(--n8n-slider--radius, var(--radius--3xs));
	border: 1px solid var(--n8n-slider--background, var(--background--subtle));
	background-color: var(--n8n-slider--background, var(--background--subtle));
	overflow: hidden;

	&:focus-within {
		@include focus.focus-ring-with-border;
	}

	&:hover .fill::after {
		opacity: 1;
		inset-block: min(var(--spacing--2xs), calc(100% / 5));
	}

	&:hover .hashmarks {
		opacity: 1;
	}

	&.dragging .fill::after {
		background-color: var(--text-color);
	}

	&.mini {
		height: var(--n8n-slider--height, var(--height--xs));
		padding-inline: var(--n8n-slider--padding-inline, var(--spacing--3xs));
	}

	&.small {
		height: var(--n8n-slider--height, var(--height--sm));
		padding-inline: var(--n8n-slider--padding-inline, var(--spacing--2xs));
	}

	&.medium {
		height: var(--n8n-slider--height, var(--height--md));
	}

	&.large {
		border-radius: var(--n8n-slider--radius, var(--radius--2xs));
	}

	&.xlarge {
		height: var(--n8n-slider--height, var(--height--xl));
		padding-inline: var(--n8n-slider--padding-inline, var(--spacing--sm));
		border-radius: var(--n8n-slider--radius, var(--radius--2xs));
	}
}
.control {
	touch-action: none;
	position: absolute;
	inset: 0;
	z-index: 0;
	border-radius: inherit;
	overflow: hidden;
}
.hashmarks {
	position: absolute;
	inset: 0;
	z-index: 1;
	opacity: 0;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
}
.hashmark {
	position: absolute;
	inset-block: 35%;
	width: 1px;
	transform: translateX(-50%);
	background-color: var(--border-color);
}

.fill {
	position: relative;
	height: 100%;
	background-color: var(--n8n-slider--fill, var(--background--active));
	will-change: width;

	&::after {
		content: '';
		position: absolute;
		inset-inline-start: max(var(--spacing--4xs), calc(100% - var(--spacing--4xs) - 3px));
		inset-block: min(var(--spacing--2xs), calc(100% / 2));
		border-radius: var(--radius--full);
		opacity: 0;
		transition: all var(--duration--snappy) var(--easing--ease-out);
		width: 3px;
		background-color: var(--text-color--subtler);
	}
}

.animateFill {
	@include motion.width-transition;
}

.label,
.value {
	position: relative;
	z-index: 2;
}

.hiddenLabel {
	position: absolute;
	width: var(--spacing--5xs);
	height: var(--spacing--5xs);
	padding: 0;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

.value {
	font-variant-numeric: tabular-nums;
}
</style>
