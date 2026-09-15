<script setup lang="ts">
import { reactiveOmit, reactivePick, unrefElement } from '@vueuse/core';
import {
	NumberFieldRoot,
	NumberFieldInput,
	NumberFieldIncrement,
	NumberFieldDecrement,
	useForwardPropsEmits,
} from 'reka-ui';
import { computed, useAttrs, useCssModule, useTemplateRef } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import { useI18n } from '@n8n/design-system/composables/useI18n';

import type {
	InputNumberProps,
	InputNumberEmits,
	InputNumberSlots,
	InputNumberExposed,
} from './InputNumber.types';

defineOptions({ name: 'N8nInputNumber', inheritAttrs: false });

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));

const $style = useCssModule();
const { t } = useI18n();

const props = withDefaults(defineProps<InputNumberProps>(), {
	size: 'medium',
	controls: true,
	controlsPosition: 'right',
	step: 1,
	stepSnapping: false,
});

const isControlsRight = computed(() => props.controls && props.controlsPosition === 'right');
const isControlsBoth = computed(() => props.controls && props.controlsPosition === 'both');

const emit = defineEmits<InputNumberEmits>();
defineSlots<InputNumberSlots>();

const inputRef = useTemplateRef('inputRef');

function getInput(): HTMLInputElement | null {
	const el = unrefElement(inputRef);
	return el instanceof HTMLInputElement ? el : null;
}

const focus = () => getInput()?.focus();
const blur = () => getInput()?.blur();
const select = () => getInput()?.select();

defineExpose<InputNumberExposed>({ focus, blur, select });

// Map precision to formatOptions - uses Intl.NumberFormatOptions
// When no precision is set, use maximumFractionDigits: 20 (the max allowed by Intl.NumberFormat)
// to preserve full decimal precision and avoid default rounding behavior
const formatOptions = computed<Intl.NumberFormatOptions>(() =>
	props.precision !== undefined
		? { maximumFractionDigits: props.precision, minimumFractionDigits: props.precision }
		: { maximumFractionDigits: 20 },
);

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

function onFocus(event: FocusEvent) {
	emit('focus', event);
}

/** Select all only on direct input click — not when controls focus the field. */
function onInputClick(event: MouseEvent) {
	const target = event.target;
	if (target instanceof HTMLInputElement) {
		target.select();
	}
}

function nextInputValue(target: HTMLInputElement, inserted: string) {
	return (
		target.value.slice(0, target.selectionStart ?? 0) +
		inserted +
		target.value.slice(target.selectionEnd ?? 0)
	);
}

function exceedsMax(value: string) {
	if (props.max === undefined) return false;
	const parsed = Number(value);
	return !Number.isNaN(parsed) && parsed > props.max;
}

/**
 * Reka's beforeinput validator only checks that characters form a number, not min/max.
 * Reject complete values above max while typing; below-min values still clamp on blur
 * so the user can type a larger number (e.g. 1 → 15 when min is 10).
 *
 * Paste is handled separately: `insertFromPaste` often has `event.data === null`.
 */
function onBeforeInput(event: InputEvent) {
	if (event.defaultPrevented || props.max === undefined) return;
	if (event.inputType.startsWith('delete') || event.inputType.startsWith('history')) return;

	const target = event.target;
	if (!(target instanceof HTMLInputElement)) return;

	if (exceedsMax(nextInputValue(target, event.data ?? ''))) {
		event.preventDefault();
	}
}

/**
 * Paste `beforeinput` may not include the clipboard text (`event.data` is null).
 * Read `clipboardData` here and reject over-max values before they land in the field.
 * Do not stop the event — consumers (e.g. expression paste) still need the bubble.
 */
function onPaste(event: ClipboardEvent) {
	if (event.defaultPrevented || props.max === undefined) return;

	const target = event.target;
	if (!(target instanceof HTMLInputElement)) return;

	const inserted = event.clipboardData?.getData('text') ?? '';
	if (exceedsMax(nextInputValue(target, inserted))) {
		event.preventDefault();
	}
}

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
		data-test-id="input-number"
		v-bind="{ ...rootProps, ...rootAttrs, formatOptions }"
		:min="props.min"
		:max="props.max"
		:class="[
			$style.inputNumber,
			sizeClass,
			rootClass,
			{
				[$style.isDisabled]: props.disabled,
				[$style.isControlsBoth]: isControlsBoth,
			},
		]"
	>
		<NumberFieldDecrement v-if="isControlsBoth" as-child>
			<slot name="decrement" :ui="{ class: [$style.button, $style.buttonDecrement].join(' ') }">
				<button
					type="button"
					:class="[$style.button, $style.buttonDecrement]"
					:aria-label="t('nds.inputNumber.decrease')"
				>
					<Icon icon="minus" size="small" />
				</button>
			</slot>
		</NumberFieldDecrement>

		<NumberFieldInput
			ref="inputRef"
			:class="$style.input"
			:placeholder="placeholder"
			@focus="onFocus"
			@click="onInputClick"
			@beforeinput="onBeforeInput"
			@paste="onPaste"
			@blur="emit('blur', $event)"
		/>

		<NumberFieldIncrement v-if="isControlsBoth" as-child>
			<slot name="increment" :ui="{ class: [$style.button, $style.buttonIncrement].join(' ') }">
				<button
					type="button"
					:class="[$style.button, $style.buttonIncrement]"
					:aria-label="t('nds.inputNumber.increase')"
				>
					<Icon icon="plus" size="small" />
				</button>
			</slot>
		</NumberFieldIncrement>

		<div v-if="isControlsRight" :class="$style.controlsWrapper">
			<NumberFieldIncrement as-child>
				<slot name="increment" :ui="{ class: [$style.button, $style.buttonUp].join(' ') }">
					<button
						type="button"
						:class="[$style.button, $style.buttonUp]"
						:aria-label="t('nds.inputNumber.increase')"
					>
						<Icon icon="chevron-up" size="xsmall" />
					</button>
				</slot>
			</NumberFieldIncrement>
			<NumberFieldDecrement as-child>
				<slot name="decrement" :ui="{ class: [$style.button, $style.buttonDown].join(' ') }">
					<button
						type="button"
						:class="[$style.button, $style.buttonDown]"
						:aria-label="t('nds.inputNumber.decrease')"
					>
						<Icon icon="chevron-down" size="xsmall" />
					</button>
				</slot>
			</NumberFieldDecrement>
		</div>
	</NumberFieldRoot>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';
@use '../../css/mixins/input' as input-mixin;

.inputNumber {
	@include input-mixin.size-variables('medium');
	@include input-mixin.theme-variables(var(--border-color));

	display: inline-flex;
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

	&::placeholder {
		color: var(--input--placeholder--color);
	}

	&:disabled {
		cursor: not-allowed;
		color: var(--input--color--disabled);
	}
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
	color: var(--icon-color);

	&:hover:not(:disabled) {
		color: var(--icon-color--strong);
		background-color: var(--background--hover);
	}

	&:disabled,
	&[data-disabled] {
		cursor: not-allowed;
		color: var(--icon-color--subtle);
	}
}

.buttonDecrement {
	width: var(--input--height);
	border-right: var(--border-width, 1px) solid var(--input--border-color);
	border-radius: var(--input--radius) 0 0 var(--input--radius);

	&:hover:not(:disabled):not([data-disabled]) {
		border-right-color: var(--input--border-color--hover);
	}
}

.buttonIncrement {
	width: var(--input--height);
	border-left: var(--border-width, 1px) solid var(--input--border-color);
	border-radius: 0 var(--input--radius) var(--input--radius) 0;

	&:hover:not(:disabled):not([data-disabled]) {
		border-left-color: var(--input--border-color--hover);
	}
}

.controlsWrapper {
	display: flex;
	flex-direction: column;
	border-left: var(--border-width, 1px) solid var(--input--border-color);

	&:hover:has(button:not(:disabled):not([data-disabled])) {
		border-left-color: var(--input--border-color--hover);

		.buttonUp {
			border-bottom-color: var(--input--border-color--hover);
		}
	}
}

.buttonUp,
.buttonDown {
	flex: 1;
}

.buttonUp {
	border-bottom: var(--border-width, 1px) solid var(--input--border-color);
	border-radius: 0 var(--input--radius) 0 0;
}

.buttonDown {
	border-radius: 0 0 var(--input--radius) 0;
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
