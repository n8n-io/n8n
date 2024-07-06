<template>
	<div
		role="radiogroup"
		:class="{ 'n8n-radio-buttons': true, [$style.radioGroup]: true, [$style.disabled]: disabled }"
	>
		<RadioButton
			v-for="option in options"
			:key="option.value"
			v-bind="option"
			:active="modelValue === option.value"
			:size="size"
			:disabled="disabled || option.disabled"
			@click.prevent.stop="onClick(option, $event)"
		/>
	</div>
</template>

<script lang="ts" setup>
import RadioButton from './RadioButton.vue';

interface RadioOption {
	label: string;
	value: string;
	disabled?: boolean;
}

interface RadioButtonsProps {
	modelValue?: string;
	options?: RadioOption[];
	/** @default medium */
	size?: 'small' | 'medium';
	disabled?: boolean;
}

const props = withDefaults(defineProps<RadioButtonsProps>(), {
	active: false,
	disabled: false,
	size: 'medium',
});

const emit = defineEmits<{
	'update:modelValue': [value: string, e: MouseEvent];
}>();

const onClick = (
	option: { label: string; value: string; disabled?: boolean },
	event: MouseEvent,
) => {
	if (props.disabled || option.disabled) {
		return;
	}
	emit('update:modelValue', option.value, event);
};
</script>

<style lang="scss" module>
.radioGroup {
	display: inline-flex;
	line-height: 1;
	vertical-align: middle;
	font-size: 0;
	background-color: var(--color-foreground-base);
	padding: var(--spacing-5xs);
	border-radius: var(--border-radius-base);
}

.disabled {
	cursor: not-allowed;
}
</style>
