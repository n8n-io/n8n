<template>
	<div role="radiogroup" :class="$style.radioGroup">
		<RadioButton
			v-for="option in options"
			:key="option.value"
			v-bind="option"
			:active="value === option.value"
			@click="(e) => onClick(option.value, e)"
		/>
	</div>
</template>

<script lang="ts">
import RadioButton from './RadioButton';

export default {
	name: 'n8n-radio-buttons',
	props: {
		value: {
			type: String,
		},
		options: {
		},
	},
	components: {
		RadioButton,
	},
	methods: {
		onClick(value) {
			this.$emit('input', value);
		},
	},
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

</style>

