<template>
	<!-- mock el-input element to apply styles -->
	<div class="el-input" :data-value="hiddenValue">
		<slot></slot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	name: "ExpandableInputBase",
	props: ['value', 'placeholder'],
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
});
</script>

<style lang="scss" scoped>
*,
*::after { 
	box-sizing: border-box;
}

input {
	padding: 0 13px; // -2px for borders
}

div

div {
	display: inline-grid;
	font: inherit;
	padding: 10px 0;

	&::after,
	input {
		grid-area: 1 / 2;
		font: inherit;
	}

	&::after {
		content: attr(data-value) ' ';
		visibility: hidden;
		white-space: nowrap;
		overflow: hidden;
		padding: 0 15px;
	}

	&:hover {
		input {
			border: $--custom-input-border-shadow
		}
	}
}
</style>
