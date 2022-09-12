<template>
	<div role="radiogroup" :class="{'n8n-radio-buttons': true, [$style.radioGroup]: true, [$style.disabled]: disabled}">
		<RadioButton
			v-for="option in options"
			:key="option.value"
			v-bind="option"
			:active="value === option.value"
			:size="size"
			:disabled="disabled"
			@click="(e) => onClick(option.value, e)"
		/>
	</div>
</template>

<script lang="ts">
import RadioButton from './RadioButton.vue';

import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-radio-buttons',
	props: {
		value: {
			type: String,
		},
		options: {
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
		onClick(value: unknown) {
			if (this.disabled) {
				return;
			}
			this.$emit('input', value);
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

