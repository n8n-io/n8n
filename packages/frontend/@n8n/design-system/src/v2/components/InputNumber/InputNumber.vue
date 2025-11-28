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
	step: 1,
});

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
		:class="[$style.InputNumber, sizeClass, { [$style.Disabled]: props.disabled }]"
	>
		<NumberFieldDecrement v-if="controls" :class="$style.Button">
			<slot name="decrement">−</slot>
		</NumberFieldDecrement>

		<NumberFieldInput
			:class="$style.Input"
			:placeholder="placeholder"
			@focus="emit('focus', $event)"
			@blur="emit('blur', $event)"
		/>

		<NumberFieldIncrement v-if="controls" :class="$style.Button">
			<slot name="increment">+</slot>
		</NumberFieldIncrement>
	</NumberFieldRoot>
</template>

<style module>
.InputNumber {
	display: inline-flex;
	align-items: center;
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
	text-align: left;
}

.Input::placeholder {
	color: var(--color--text--tint-1);
}

.Input:disabled {
	cursor: not-allowed;
	color: var(--color--text--tint-1);
}

.Button {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	border: none;
	background: transparent;
	cursor: pointer;
	color: var(--color--text--tint-1);
	transition: color 0.2s;
}

.Button:hover {
	color: var(--color--text--shade-1);
}

.Button:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}

/* Size variants - matches v2 Input component */
.Mini {
	min-height: 22px;
	padding: 0 var(--spacing--3xs);
	font-size: var(--font-size--3xs);
}

.Mini .Button {
	width: 22px;
}

.Small {
	min-height: 28px;
	padding: 0 var(--spacing--2xs);
	font-size: var(--font-size--2xs);
}

.Small .Button {
	width: 28px;
}

.Medium {
	min-height: 36px;
	padding: 0 var(--spacing--2xs);
	font-size: var(--font-size--sm);
}

.Medium .Button {
	width: 36px;
}

.Large {
	min-height: 40px;
	padding: 0 var(--spacing--xs);
	font-size: var(--font-size--sm);
}

.Large .Button {
	width: 40px;
}

.XLarge {
	min-height: 48px;
	padding: 0 var(--spacing--xs);
	font-size: var(--font-size--md);
}

.XLarge .Button {
	width: 48px;
}
</style>
