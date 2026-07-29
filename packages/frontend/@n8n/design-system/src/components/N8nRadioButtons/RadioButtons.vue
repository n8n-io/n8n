<script lang="ts" setup generic="Value extends string | boolean">
import RadioButton from './RadioButton.vue';

interface RadioOption {
	label: string;
	value: Value;
	disabled?: boolean;
	data?: Record<string, string | number | boolean | undefined>;
}

interface RadioButtonsProps {
	modelValue?: Value;
	options?: RadioOption[];
	/** @default medium */
	size?: 'small' | 'small-medium' | 'medium';
	disabled?: boolean;
	squareButtons?: boolean;
}

const props = withDefaults(defineProps<RadioButtonsProps>(), {
	active: false,
	disabled: false,
	size: 'medium',
	squareButtons: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: Value, e: MouseEvent];
}>();

const slots = defineSlots<{ option?: ((props: RadioOption) => {}) | undefined }>();

const onClick = (
	option: { label: string; value: Value; disabled?: boolean },
	event: MouseEvent,
) => {
	if (props.disabled || option.disabled) {
		return;
	}
	emit('update:modelValue', option.value, event);
};
</script>

<template>
	<div
		role="radiogroup"
		:class="{ 'n8n-radio-buttons': true, [$style.radioGroup]: true, [$style.disabled]: disabled }"
	>
		<RadioButton
			v-for="option in options"
			:key="`${option.value}`"
			v-bind="option"
			:value="`${option.value}`"
			:active="modelValue === option.value"
			:size="size"
			:disabled="disabled || option.disabled"
			:square="squareButtons"
			@click.prevent.stop="onClick(option, $event)"
		>
			<slot name="option" v-bind="option" />
		</RadioButton>
	</div>
</template>

<style lang="scss" module>
.radioGroup {
	display: inline-flex;
	line-height: 1;
	vertical-align: middle;
	font-size: 0;
	background-color: var(--color--foreground);
	padding: var(--spacing--5xs);
	border-radius: var(--radius);
}

.disabled {
	cursor: not-allowed;
}
</style>
