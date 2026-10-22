<script setup lang="ts">
import { computed, ref, useCssModule, useId, useSlots, useTemplateRef } from 'vue';
import N8nText from '../N8nText';

import type { SliderEmits, SliderProps, SliderValue } from './Slider.types';

const props = withDefaults(defineProps<SliderProps>(), {
	size: 'large',
	maxValue: 100,
	minValue: 0,
	step: 1,
	minDistance: 0,
	hideLabel: false,
	showStepMarkers: true,
	disabled: false,
	hideValue: false,
});

const emit = defineEmits<SliderEmits>();
const styles = useCssModule();
const labelId = useId();
const slots = useSlots();

defineSlots<{
	/** Replaces the visible label text. */
	label?: () => unknown;
}>();

function hasLabel() {
	return Boolean(props.label?.trim() || slots.label);
}

function getAccessibleLabelledBy() {
	return (
		props.ariaLabelledby?.trim() || (!props.ariaLabel?.trim() && hasLabel() ? labelId : undefined)
	);
}

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
	<div :class="[$style.wrapper, sizeClass]">
		<div v-if="hasLabel() || !hideValue" :class="$style.header">
			<N8nText
				v-if="hasLabel()"
				:id="labelId"
				:step="fontSize"
				bold
				color="text-base"
				:class="hideLabel ? $style.hiddenLabel : $style.label"
			>
				<slot name="label">{{ label }}</slot>
			</N8nText>
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
				:tabindex="disabled ? -1 : 0"
				:aria-disabled="disabled"
				:aria-valuenow="value"
				:aria-valuetext="String(formattedValue)"
				:aria-label="ariaLabel"
				:aria-labelledby="getAccessibleLabelledBy()"
				:aria-valuemin="minValue"
				:aria-valuemax="maxValue"
				@keydown="handleKeyDown"
			>
				<div
					:class="[$style.fill, { [$style.animateFill]: animateFill }]"
					:style="fillStyle"
					aria-hidden="true"
				/>
				<div :class="$style.hashmarks" aria-hidden="true">
					<div v-for="marker in markers" :key="marker" :class="$style.hashmark" />
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';
@use '../../css/mixins/focus';

.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--2xs);
}

.slider {
	position: relative;
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--input--padding);
	height: var(--n8n-slider--height, var(--height--lg));
	padding-inline: var(--n8n-slider--padding-inline, var(--spacing--xs));
	border-radius: var(--n8n-slider--radius, var(--radius--3xs));
	border: 1px solid var(--n8n-slider--background, var(--border-color));
	background-color: var(--n8n-slider--background, var(--background--subtle));
	overflow: hidden;

	&:focus-within {
		@include focus.focus-ring-with-border;
	}

	&:not(.disabled):hover .fill::after {
		outline-color: var(--border-color);
	}

	&:not(.disabled):hover .hashmarks {
		opacity: 1;
	}

	&.dragging:not(.disabled) {
		cursor: ew-resize;
	}

	&.disabled {
		cursor: not-allowed;
		background-color: var(--background--disabled);
		border-color: var(--background--disabled);

		.fill {
			background-color: var(--background--brand--disabled);

			&::after {
				background-color: var(--background--subtle);
				box-shadow: none;
			}
		}
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
	container-type: size;
	touch-action: none;
	position: absolute;
	inset: 0;
	z-index: 0;
	border-radius: inherit;
	overflow: hidden;
}
.hashmarks {
	position: absolute;
	inset: 0 5%;
	z-index: 1;
	opacity: 0;
	display: grid;
	grid-template-columns: repeat(9, minmax(0, 1fr));
	place-items: center;
	gap: 0;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
}
.hashmark {
	width: var(--spacing--4xs);
	height: var(--spacing--4xs);
	border-radius: 50%;
	background-color: var(--border-color);
}

.fill {
	isolation: isolate;
	position: relative;
	/** Keep the handle and its outline inside the control at the minimum value. */
	min-width: 100cqh;
	height: 100%;
	background-color: var(
		--n8n-slider--fill,
		color-mix(in oklch, var(--background--subtle), black 8%)
	);
	will-change: width;
	border-top-right-radius: var(--n8n-slider--radius, var(--radius--3xs));
	border-bottom-right-radius: var(--n8n-slider--radius, var(--radius--3xs));
	z-index: 2;

	&::before {
		content: '⋮';
		position: absolute;
		z-index: 2;
		inset-inline-end: 1px;
		inset-block: 1px;
		display: grid;
		aspect-ratio: 1;
		place-items: center;
		font-size: var(--font-size--md);
		font-weight: var(--font-weight--bold);
		text-align: center;
		color: var(--text-color--disabled);
		box-shadow: var(--shadow--xs);
		background-color: transparent;
	}

	&::after {
		content: '';
		position: absolute;
		inset-inline-end: 1px;
		inset-block: 1px;
		border-radius: var(--n8n-slider--radius, var(--radius--3xs));
		opacity: 1;
		transition: all var(--duration--snappy) var(--easing--ease-out);
		aspect-ratio: 1;
		background-color: light-dark(var(--background--surface), var(--color--neutral-700));
		box-shadow: var(--shadow--xs);
		outline: 1px solid transparent;
	}
}

.animateFill {
	@include motion.width-transition;
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
	margin-inline-start: auto;
	font-variant-numeric: tabular-nums;
}
</style>
