<template>
	<!-- mock el-input element to apply styles -->
	<div class="el-input" :data-value="hiddenValue">
		<input
			class="el-input__inner"
			:value="value"
			:placeholder="placeholder"
			:maxlength="maxlength"
			@input="onInput"
			@blur="onBlur"
			@keydown.enter="onEnter"
			@keydown.esc="onEscape"
			ref="input"
			size="4"
		/>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	name: "ExpandableInput",
	props: ['value', 'placeholder', 'maxlength', 'autofocus'],
	mounted() {
		const elem = this as Vue;
		if (elem.$props.autofocus && elem.$refs.input) {
			(elem.$refs.input as HTMLInputElement).focus(); // autofocus on input element is not reliable
		}
	},
	computed: {
		hiddenValue() {
			let value = (this.value as string).replace(/\s/g, '.'); // force input to expand on space chars
			if (!value) {
				// @ts-ignore
				value = this.$props.placeholder as string;
			}

			return `${value}`;  // adjust for padding
		},
	},
	methods: {
		onInput() {
			this.$emit('input', (this.$refs.input as HTMLInputElement).value);
		},
		onEnter() {
			this.$emit('enter', (this.$refs.input as HTMLInputElement).value);
		},
		onBlur() {
			this.$emit('blur', (this.$refs.input as HTMLInputElement).value);
		},
		onEscape() {
			this.$emit('esc');
		},
	},
});
</script>

<style lang="scss" scoped>
*,
*::after { 
	box-sizing: border-box;
}

.el-input input.el-input__inner {
	border: 1px solid $--color-primary;
}

div {
	display: inline-grid;
	font: inherit;

	&::after,
	input {
		grid-area: 1 / 2;
		font: inherit;
	}

	input {
		padding: 0 13px; // -2px for borders
	}
	
	&::after {
		content: attr(data-value) ' ';
		visibility: hidden;
		white-space: nowrap;
		overflow: hidden;
		padding: 0 15px;
	}
}
</style>
