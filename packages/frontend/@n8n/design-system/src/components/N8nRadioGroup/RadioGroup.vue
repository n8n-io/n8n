<script lang="ts">
export interface RadioGroupOption<Value extends string = string> {
	value: Value;
	label: string;
	/** Optional helper text rendered under the label. */
	description?: string;
	disabled?: boolean;
	/** Forwarded to the radio item element as `data-test-id`. */
	testId?: string;
}
</script>

<script lang="ts" setup generic="Value extends string">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui';

const props = withDefaults(
	defineProps<{
		modelValue?: Value;
		options: Array<RadioGroupOption<Value>>;
		/** @default vertical */
		orientation?: 'vertical' | 'horizontal';
		disabled?: boolean;
		name?: string;
		/** Accessible name for the radio group. */
		ariaLabel?: string;
	}>(),
	{
		orientation: 'vertical',
		disabled: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: Value];
}>();

defineSlots<{
	/** Override the rendered content of a single option (label + description by default). */
	option?: (props: RadioGroupOption<Value>) => unknown;
}>();

function onValueChange(value: string) {
	const option = props.options.find((o) => o.value === value);
	if (option && !option.disabled) {
		emit('update:modelValue', option.value);
	}
}
</script>

<template>
	<RadioGroupRoot
		:model-value="modelValue"
		:disabled="disabled"
		:orientation="orientation"
		:name="name"
		:aria-label="ariaLabel"
		:class="[$style.root, $style[orientation]]"
		@update:model-value="onValueChange"
	>
		<RadioGroupItem
			v-for="option in options"
			:key="option.value"
			:value="option.value"
			:disabled="disabled || option.disabled"
			:class="$style.item"
			:data-test-id="option.testId"
		>
			<span :class="$style.circle">
				<RadioGroupIndicator :class="$style.dot" />
			</span>
			<span :class="$style.content">
				<slot name="option" v-bind="option">
					<span :class="$style.label">{{ option.label }}</span>
					<span v-if="option.description" :class="$style.description">{{
						option.description
					}}</span>
				</slot>
			</span>
		</RadioGroupItem>
	</RadioGroupRoot>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.root {
	display: flex;
	gap: var(--spacing--4xs);
}

.vertical {
	flex-direction: column;
	align-items: flex-start;
}

.horizontal {
	flex-direction: row;
	align-items: center;
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	margin: 0;
	padding: var(--spacing--4xs) 0;
	background: transparent;
	border: none;
	text-align: left;
	color: var(--color--text);
	font: inherit;
	line-height: 1.3;
	cursor: pointer;
	border-radius: var(--radius--sm);

	&:focus-visible {
		@include focus.focus-ring;
		outline-offset: 2px;
	}

	&[data-disabled] {
		cursor: not-allowed;
		opacity: 0.5;
	}
}

.circle {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	border: 1px solid var(--color--foreground--shade-1);
	border-radius: var(--radius--full);
	transition: border-color 0.15s ease;

	.item:hover:not([data-disabled]) & {
		border-color: var(--color--primary);
	}

	.item[data-state='checked'] & {
		border-color: var(--color--primary);
	}
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: var(--radius--full);
	background-color: var(--color--primary);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.label {
	font-size: var(--font-size--sm);
	color: var(--color--text);
}

.description {
	font-size: var(--font-size--2xs);
	// Use the base text color (not a lighter tint) so the description keeps
	// WCAG AA contrast; the smaller font size provides the visual hierarchy.
	color: var(--color--text);
}
</style>
