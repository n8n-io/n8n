<template>
	<!-- mock el-input element to apply styles -->
	<div class="input-sizer el-input" :data-value="value">
		<input
			class="el-input__inner"
			:value="value"
			:placeholder="placeholder"
			:maxlength="maxlength"
			@input="onInput"
			@change="onChange"
			ref="input"
		/>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	name: "InlineTextEdit",
	props: ['value', 'placeholder', 'maxlength'],
	methods: {
		onInput() {
			this.$emit('input', this.$refs.input.value);
		},
		onChange() {
			this.$emit('change', this.$refs.input.value);
		},
	},
});
</script>

<style lang="scss" scoped>
*,
*::before,
*::after { 
  box-sizing: border-box;
}

.input-sizer {
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
    white-space: pre-wrap;
  }
}
</style>
