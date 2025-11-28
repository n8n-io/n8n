<script setup lang="ts">
import {
	NumberFieldRoot,
	NumberFieldInput,
	NumberFieldIncrement,
	NumberFieldDecrement,
	useForwardPropsEmits,
} from 'reka-ui';
import { computed, useCssModule } from 'vue';

import type { InputNumberProps, InputNumberEmits, InputNumberSlots } from './InputNumber.types';

defineOptions({ name: 'N8nInputNumber2' });

const props = withDefaults(defineProps<InputNumberProps>(), {
	size: 'medium',
	controls: false,
	controlsPosition: 'right',
	step: 1,
});

const isControlsRight = computed(() => props.controls && props.controlsPosition === 'right');
const isControlsBoth = computed(() => props.controls && props.controlsPosition === 'both');

const emit = defineEmits<InputNumberEmits>();
defineSlots<InputNumberSlots>();

const $style = useCssModule();

// Map precision to formatOptions
const formatOptions = computed(() =>
	props.precision !== undefined
		? { maximumFractionDigits: props.precision, minimumFractionDigits: props.precision }
		: undefined,
);

// Forward props to Reka UI
const forwarded = useForwardPropsEmits(
	computed(() => ({
		modelValue: props.modelValue,
		defaultValue: props.defaultValue,
		min: props.min,
		max: props.max,
		step: props.step,
		disabled: props.disabled,
		formatOptions: formatOptions.value,
	})),
	emit,
);

// Size class mapping
const sizes: Record<NonNullable<InputNumberProps['size']>, string> = {
	mini: $style.Mini,
	small: $style.Small,
	medium: $style.Medium,
	large: $style.Large,
	xlarge: $style.XLarge,
};

const sizeClass = computed(() => sizes[props.size ?? 'medium']);
</script>

<template>
	<NumberFieldRoot
		v-bind="forwarded"
		:class="[
			$style.InputNumber,
			sizeClass,
			{ [$style.Disabled]: props.disabled, [$style.ControlsRight]: isControlsRight },
		]"
	>
		<!-- Left decrement button (both mode) -->
		<NumberFieldDecrement v-if="isControlsBoth" :class="[$style.Button, $style.ButtonDecrement]">
			<slot name="decrement">−</slot>
		</NumberFieldDecrement>

		<NumberFieldInput
			:class="$style.Input"
			:placeholder="placeholder"
			@focus="emit('focus', $event)"
			@blur="emit('blur', $event)"
		/>

		<!-- Right increment button (both mode) -->
		<NumberFieldIncrement v-if="isControlsBoth" :class="[$style.Button, $style.ButtonIncrement]">
			<slot name="increment">+</slot>
		</NumberFieldIncrement>

		<!-- Stacked controls on right (right mode) -->
		<div v-if="isControlsRight" :class="$style.ControlsWrapper">
			<NumberFieldIncrement :class="[$style.Button, $style.ButtonUp]">
				<slot name="increment">
					<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
						<path d="M6 4L9 7H3L6 4Z" />
					</svg>
				</slot>
			</NumberFieldIncrement>
			<NumberFieldDecrement :class="[$style.Button, $style.ButtonDown]">
				<slot name="decrement">
					<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
						<path d="M6 8L3 5H9L6 8Z" />
					</svg>
				</slot>
			</NumberFieldDecrement>
		</div>
	</NumberFieldRoot>
</template>

<style module>
.InputNumber {
	position: relative;
	display: inline-flex;
	align-items: stretch;
	width: 100%;
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-2);
	transition:
		border-color 0.2s,
		box-shadow 0.2s;
}

.InputNumber:hover:not(.Disabled) {
	border-color: var(--color--foreground--shade-1);
}

.InputNumber:focus-within {
	border-color: var(--color--secondary);
	box-shadow: 0 0 0 2px var(--color--secondary--tint-2);
}

.Disabled {
	background-color: var(--color--background--light-3);
	cursor: not-allowed;
	opacity: 0.6;
}

.Input {
	flex: 1;
	min-width: 0;
	border: none;
	background: transparent;
	outline: none;
	font-family: inherit;
	font-size: inherit;
	color: var(--color--text--shade-1);
	padding: 0;
	text-align: center;
}

.Input::placeholder {
	color: var(--color--text--tint-1);
}

.Input:disabled {
	cursor: not-allowed;
	color: var(--color--text--tint-1);
}

/* Control buttons - matches Element+ styling */
.Button {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	border: none;
	background: var(--color--background);
	cursor: pointer;
	color: var(--color--text--shade-1);
	font-size: 13px;
	transition:
		color 0.2s,
		background-color 0.2s;
}

.Button:hover:not(:disabled) {
	color: var(--color--primary);
}

.Button:disabled {
	cursor: not-allowed;
	color: var(--color--text--tint-2);
}

/* Decrement button (left side) */
.ButtonDecrement {
	border-right: var(--border);
	border-radius: calc(var(--radius) - 1px) 0 0 calc(var(--radius) - 1px);
}

/* Increment button (right side) */
.ButtonIncrement {
	border-left: var(--border);
	border-radius: 0 calc(var(--radius) - 1px) calc(var(--radius) - 1px) 0;
}

/* Size variants - matches v2 Input component */
.Mini {
	min-height: 22px;
	font-size: var(--font-size--3xs);
}

.Mini .Input {
	padding: 0 var(--spacing--3xs);
}

.Mini .Button {
	width: 22px;
	font-size: 11px;
}

.Small {
	min-height: 28px;
	font-size: var(--font-size--2xs);
}

.Small .Input {
	padding: 0 var(--spacing--2xs);
}

.Small .Button {
	width: 28px;
	font-size: 12px;
}

.Medium {
	min-height: 36px;
	font-size: var(--font-size--sm);
}

.Medium .Input {
	padding: 0 var(--spacing--2xs);
}

.Medium .Button {
	width: 36px;
}

.Large {
	min-height: 40px;
	font-size: var(--font-size--sm);
}

.Large .Input {
	padding: 0 var(--spacing--xs);
}

.Large .Button {
	width: 40px;
}

.XLarge {
	min-height: 48px;
	font-size: var(--font-size--md);
}

.XLarge .Input {
	padding: 0 var(--spacing--xs);
}

.XLarge .Button {
	width: 48px;
	font-size: 15px;
}

/* No controls - left align text */
.InputNumber:not(:has(.Button)) .Input {
	text-align: left;
}

/* Controls on right (stacked vertically) */
.ControlsRight .Input {
	text-align: left;
}

.ControlsWrapper {
	display: flex;
	flex-direction: column;
	border-left: var(--border);
}

.ButtonUp,
.ButtonDown {
	flex: 1;
	border-radius: 0;
}

.ButtonUp {
	border-bottom: var(--border);
	border-radius: 0 calc(var(--radius) - 1px) 0 0;
}

.ButtonDown {
	border-radius: 0 0 calc(var(--radius) - 1px) 0;
}

/* Size variants for stacked controls */
.Mini .ControlsWrapper {
	width: 22px;
}

.Mini .ButtonUp svg,
.Mini .ButtonDown svg {
	width: 10px;
	height: 10px;
}

.Small .ControlsWrapper {
	width: 28px;
}

.Small .ButtonUp svg,
.Small .ButtonDown svg {
	width: 10px;
	height: 10px;
}

.Medium .ControlsWrapper {
	width: 36px;
}

.Large .ControlsWrapper {
	width: 40px;
}

.XLarge .ControlsWrapper {
	width: 48px;
}
</style>
