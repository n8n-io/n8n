<template>
	<div
		role="radiogroup"
		:class="{ 'n8n-radio-buttons': true, [$style.radioGroup]: true, [$style.disabled]: disabled }"
	>
		<RadioButton
			v-for="option in options"
			:key="option.value"
			v-bind="option"
			:active="value === option.value"
			:size="size"
			:disabled="disabled || option.disabled"
			@click="() => onClick(option)"
		/>
	</div>
</template>

<script lang="ts">
import RadioButton from './RadioButton.vue';

import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export interface RadioOption {
	label: string;
	value: string;
	disabled?: boolean;
}

export default defineComponent({
	name: 'n8n-radio-buttons',
	props: {
		value: {
			type: String,
		},
		options: {
			type: Array as PropType<RadioOption[]>,
			default: (): RadioOption[] => [],
		},
		size: {
			type: String,
		},
		disabled: {
			type: Boolean,
		},
	},
	components: {
		RadioButton,
	},
	methods: {
		onClick(option: { label: string; value: string; disabled?: boolean }) {
			if (this.disabled || option.disabled) {
				return;
			}
			this.$emit('input', option.value);
		},
	},
});
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
