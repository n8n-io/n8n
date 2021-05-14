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
		/>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	name: "InlineTextEdit",
	props: ['value', 'placeholder', 'maxlength', 'autofocus'],
	mounted() {
		const elem = this as Vue;
		if (elem.$props.autofocus && elem.$refs.input) {
			(elem.$refs.input as HTMLInputElement).focus(); // autofocus on input element is not reliable
		}
	},
	computed: {
		hiddenValue() {
			return (this.value as string).replace(/\s/g, '.'); // force input to expand on space chars
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
	min-width: 100px;
	display: inline-grid;

	&::after,
	input {
		grid-area: 1 / 2;
		font: inherit;
		padding: 0 10px;
	}
	
	&::after {
		content: attr(data-value) ' ';
		visibility: hidden;
		white-space: nowrap;
		overflow: hidden;
	}
}
</style>
