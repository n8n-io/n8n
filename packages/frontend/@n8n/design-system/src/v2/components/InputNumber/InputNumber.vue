<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import {
	NumberFieldRoot,
	NumberFieldInput,
	NumberFieldIncrement,
	NumberFieldDecrement,
	useForwardPropsEmits,
} from 'reka-ui';
import { computed, useAttrs, useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import { useI18n } from '@n8n/design-system/composables/useI18n';

import type { InputNumberProps, InputNumberEmits, InputNumberSlots } from './InputNumber.types';

defineOptions({ name: 'N8nInputNumber2', inheritAttrs: false });

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));

const $style = useCssModule();
const { t } = useI18n();

const props = withDefaults(defineProps<InputNumberProps>(), {
	size: 'medium',
	controls: false,
	controlsPosition: 'right',
	step: 1,
});

const emit = defineEmits<InputNumberEmits>();
defineSlots<InputNumberSlots>();

const rootProps = useForwardPropsEmits(
	reactivePick(
		props,
		'modelValue',
		'defaultValue',
		'min',
		'max',
		'step',
		'stepSnapping',
		'disabled',
		'readonly',
		'disableWheelChange',
		'invertWheelChange',
		'id',
		'name',
		'required',
		'locale',
	),
	emit,
);

const sizes: Record<NonNullable<InputNumberProps['size']>, string> = {
	mini: $style.mini,
	small: $style.small,
	medium: $style.medium,
	large: $style.large,
	xlarge: $style.xlarge,
};

function sizeClass() {
	return sizes[props.size];
}

function showControlsBoth() {
	return Boolean(props.controls && props.controlsPosition === 'both');
}

function showControlsRight() {
	return Boolean(props.controls && props.controlsPosition === 'right');
}

/** Reka formatOptions from precision; max fraction digits when unset preserves decimals. */
function resolvedFormatOptions(): Intl.NumberFormatOptions {
	if (props.precision !== undefined) {
		return { maximumFractionDigits: props.precision, minimumFractionDigits: props.precision };
	}

	return { maximumFractionDigits: 20 };
}
</script>

<template>
	<NumberFieldRoot
		data-test-id="input-number"
		v-bind="{ ...rootProps, ...rootAttrs, formatOptions: resolvedFormatOptions() }"
		:class="[
			$style.inputNumber,
			sizeClass(),
			rootClass,
			{
				[$style.isDisabled]: props.disabled,
				[$style.isControlsBoth]: showControlsBoth(),
			},
		]"
	>
		<NumberFieldDecrement v-if="showControlsBoth()" as-child>
			<button
				type="button"
				:class="[$style.button, $style.buttonDecrement]"
				:aria-label="t('nds.inputNumber.decrease')"
			>
				<slot name="decrement" :ui="{ class: $style.button }">
					<Icon icon="minus" size="small" />
				</slot>
			</button>
		</NumberFieldDecrement>

		<slot name="input" :class="$style.input" :placeholder="placeholder" :disabled="props.disabled">
			<NumberFieldInput
				:class="$style.input"
				:placeholder="placeholder"
				@focus="emit('focus', $event)"
				@blur="emit('blur', $event)"
			/>
		</slot>

		<NumberFieldIncrement v-if="showControlsBoth()" as-child>
			<button
				type="button"
				:class="[$style.button, $style.buttonIncrement]"
				:aria-label="t('nds.inputNumber.increase')"
			>
				<slot name="increment" :ui="{ class: $style.button }">
					<Icon icon="plus" size="small" />
				</slot>
			</button>
		</NumberFieldIncrement>

		<div v-if="showControlsRight()" :class="$style.controlsWrapper">
			<NumberFieldIncrement as-child>
				<button
					type="button"
					:class="[$style.button, $style.buttonUp]"
					:aria-label="t('nds.inputNumber.increase')"
				>
					<slot name="increment" :ui="{ class: $style.button }">
						<Icon icon="chevron-up" size="xsmall" />
					</slot>
				</button>
			</NumberFieldIncrement>
			<NumberFieldDecrement as-child>
				<button
					type="button"
					:class="[$style.button, $style.buttonDown]"
					:aria-label="t('nds.inputNumber.decrease')"
				>
					<slot name="decrement" :ui="{ class: $style.button }">
						<Icon icon="chevron-down" size="xsmall" />
					</slot>
				</button>
			</NumberFieldDecrement>
		</div>
	</NumberFieldRoot>
</template>

<style lang="scss" module>
@use '../../../css/mixins/focus';
@use '../../../css/mixins/input' as input-mixin;

.inputNumber {
	@include input-mixin.size-variables('medium');
	@include input-mixin.theme-variables(var(--border-color));

	position: relative;
	display: inline-flex;
	align-items: stretch;
	width: 100%;
	min-height: var(--input--height);
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow:
		var(--input--shadow),
		inset var(--input--border--shadow);
	font-size: var(--input--font-size);
	color: var(--input--color--text);

	@include focus.focus-within-ring;

	&:hover:not(.isDisabled):not(:focus-within) {
		box-shadow:
			var(--input--shadow--hover),
			inset var(--input--border--shadow--hover);
	}

	&:focus-within {
		box-shadow:
			var(--input--shadow--focus),
			inset var(--input--border--shadow--focus);
	}
}

.isDisabled {
	background-color: var(--input--color--background--disabled);
	cursor: not-allowed;
	opacity: 0.6;
}

.input {
	flex: 1;
	min-width: 0;
	min-height: var(--input--height);
	border: none;
	background: transparent;
	outline: none;
	font-size: var(--input--font-size);
	color: var(--input--color--text);
	padding: 0 var(--input--padding);
	text-align: left;
}

.input::placeholder {
	color: var(--input--placeholder--color);
}

.input:disabled {
	cursor: not-allowed;
	color: var(--input--color--disabled);
}

.isControlsBoth .input {
	text-align: center;
	padding-inline: var(--spacing--3xs);
}

.button {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	border: none;
	background: transparent;
	cursor: pointer;
	color: var(--color--text--tint-1);

	&:hover:not(:disabled) {
		color: var(--color--text--shade-1);
		background-color: var(--background--hover);
	}

	&:disabled,
	&[data-disabled] {
		cursor: not-allowed;
		color: var(--color--text--tint-2);
	}
}

.buttonDecrement {
	width: var(--input--height);
	border-right: var(--border-width, 1px) solid var(--input--border-color);
	border-radius: var(--input--radius) 0 0 var(--input--radius);
}

.buttonIncrement {
	width: var(--input--height);
	border-left: var(--border-width, 1px) solid var(--input--border-color);
	border-radius: 0 var(--input--radius) var(--input--radius) 0;
}

.controlsWrapper {
	display: flex;
	flex-direction: column;
	width: calc(var(--input--height) * 0.75);
	border-left: var(--border-width, 1px) solid var(--input--border-color);
}

.buttonUp,
.buttonDown {
	flex: 1;
	border-radius: 0;
	min-height: 0;
}

.buttonUp {
	border-bottom: var(--border-width, 1px) solid var(--input--border-color);
	border-radius: 0 var(--input--radius) 0 0;
}

.buttonDown {
	border-radius: 0 0 var(--input--radius);
}

.mini {
	@include input-mixin.size-variables('mini');
}

.small {
	@include input-mixin.size-variables('small');
}

.medium {
	@include input-mixin.size-variables('medium');
}

.large {
	@include input-mixin.size-variables('large');
}

.xlarge {
	@include input-mixin.size-variables('xlarge');
}
</style>
