<template>
	<ExpandableInputBase :value="value" :placeholder="placeholder">
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
	</ExpandableInputBase>
</template>

<script lang="ts">
import Vue from "vue";
import ExpandableInputBase from "./ExpandableInputBase.vue";

export default Vue.extend({
	components: { ExpandableInputBase },
	name: "ExpandableInputEdit",
	props: ['value', 'placeholder', 'maxlength', 'autofocus'],
	mounted() {
		const elem = this as Vue;
		if (elem.$props.autofocus && elem.$refs.input) {
			(elem.$refs.input as HTMLInputElement).focus(); // autofocus on input element is not reliable
		}
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
.el-input input.el-input__inner {
	border: 1px solid $--color-primary;

	&:hover {
		border: 1px solid $--color-primary;
	}
}
</style>
