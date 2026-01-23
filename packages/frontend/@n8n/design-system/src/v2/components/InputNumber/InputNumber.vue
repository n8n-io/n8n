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

// Map precision to formatOptions - uses Intl.NumberFormatOptions
// When no precision is set, use maximumFractionDigits: 20 (the max allowed by Intl.NumberFormat)
// to preserve full decimal precision and avoid default rounding behavior
const formatOptions = computed<Intl.NumberFormatOptions>(() =>
	props.precision !== undefined
		? { maximumFractionDigits: props.precision, minimumFractionDigits: props.precision }
		: { maximumFractionDigits: 20 },
);

// Forward props to Reka UI via useForwardPropsEmits (including formatOptions)
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
	mini: $style.mini,
	small: $style.small,
	medium: $style.medium,
	large: $style.large,
	xlarge: $style.xlarge,
};

const sizeClass = computed(() => sizes[props.size ?? 'medium']);
</script>

<template>
	<NumberFieldRoot
		v-bind="forwarded"
		:class="[
			$style.inputNumber,
			sizeClass,
			{ [$style.disabled]: props.disabled, [$style.controlsRight]: isControlsRight },
		]"
	>
		<!-- Left decrement button (both mode) -->
		<NumberFieldDecrement v-if="isControlsBoth" :class="[$style.button, $style.buttonDecrement]">
			<slot name="decrement">−</slot>
		</NumberFieldDecrement>

		<NumberFieldInput
			:class="$style.input"
			:placeholder="placeholder"
			@focus="emit('focus', $event)"
			@blur="emit('blur', $event)"
		/>

		<!-- Right increment button (both mode) -->
		<NumberFieldIncrement v-if="isControlsBoth" :class="[$style.button, $style.buttonIncrement]">
			<slot name="increment">+</slot>
		</NumberFieldIncrement>

		<!-- Stacked controls on right (right mode) -->
		<div v-if="isControlsRight" :class="$style.controlsWrapper">
			<NumberFieldIncrement :class="[$style.button, $style.buttonUp]">
				<slot name="increment">
					<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
						<path d="M6 4L9 7H3L6 4Z" />
					</svg>
				</slot>
			</NumberFieldIncrement>
			<NumberFieldDecrement :class="[$style.button, $style.buttonDown]">
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
.inputNumber {
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

.inputNumber:hover:not(.disabled) {
	border-color: var(--color--foreground--shade-1);
}

.inputNumber:focus-within {
	border-color: var(--color--secondary);
	box-shadow: 0 0 0 2px var(--color--secondary--tint-2);
}

.disabled {
	background-color: var(--color--background--light-3);
	cursor: not-allowed;
	opacity: 0.6;
}

.input {
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

.input::placeholder {
	color: var(--color--text--tint-1);
}

.input:disabled {
	cursor: not-allowed;
	color: var(--color--text--tint-1);
}

/* Control buttons */
.button {
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

.button:hover:not(:disabled) {
	color: var(--color--primary);
}

.button:disabled {
	cursor: not-allowed;
	color: var(--color--text--tint-2);
}

.buttonDecrement {
	border-right: var(--border);
	border-radius: calc(var(--radius) - 1px) 0 0 calc(var(--radius) - 1px);
}

.buttonIncrement {
	border-left: var(--border);
	border-radius: 0 calc(var(--radius) - 1px) calc(var(--radius) - 1px) 0;
}

/* No controls - left align text */
.inputNumber:not(:has(.button)) .input {
	text-align: left;
}

/* Controls on right (stacked vertically) */
.controlsRight .input {
	text-align: left;
}

.controlsWrapper {
	display: flex;
	flex-direction: column;
	border-left: var(--border);
}

.buttonUp,
.buttonDown {
	flex: 1;
	border-radius: 0;
}

.buttonUp {
	border-bottom: var(--border);
	border-radius: 0 calc(var(--radius) - 1px) 0 0;
}

.buttonDown {
	border-radius: 0 0 calc(var(--radius) - 1px);
}

/* Size variants */
.mini {
	min-height: 22px;
	font-size: var(--font-size--3xs);

	& .input {
		padding: 0 var(--spacing--3xs);
	}

	& .button {
		width: 22px;
		font-size: 11px;
	}

	& .controlsWrapper {
		width: 22px;
	}

	& .buttonUp svg,
	& .buttonDown svg {
		width: 10px;
		height: 10px;
	}
}

.small {
	min-height: 28px;
	font-size: var(--font-size--2xs);

	& .input {
		padding: 0 var(--spacing--2xs);
	}

	& .button {
		width: 28px;
		font-size: 12px;
	}

	& .controlsWrapper {
		width: 28px;
	}

	& .buttonUp svg,
	& .buttonDown svg {
		width: 10px;
		height: 10px;
	}
}

.medium {
	min-height: 36px;
	font-size: var(--font-size--sm);

	& .input {
		padding: 0 var(--spacing--2xs);
	}

	& .button {
		width: 36px;
	}

	& .controlsWrapper {
		width: 36px;
	}
}

.large {
	min-height: 40px;
	font-size: var(--font-size--sm);

	& .input {
		padding: 0 var(--spacing--xs);
	}

	& .button {
		width: 40px;
	}

	& .controlsWrapper {
		width: 40px;
	}
}

.xlarge {
	min-height: 48px;
	font-size: var(--font-size--md);

	& .input {
		padding: 0 var(--spacing--xs);
	}

	& .button {
		width: 48px;
		font-size: 15px;
	}

	& .controlsWrapper {
		width: 48px;
	}
}
</style>
