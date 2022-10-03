<template>
	<!-- mock el-input element to apply styles -->
	<div :class="{'el-input': true, 'static-size': staticSize}" :data-value="hiddenValue">
		<slot></slot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	name: "ExpandableInputBase",
	props: ['value', 'placeholder', 'staticSize'],
	computed: {
		hiddenValue() {
			let value = (this.value as string).replace(/\s/g, '.'); // force input to expand on space chars
			if (!value) {
				// @ts-ignore
				value = this.$props.placeholder;
			}

			return `${value}`;  // adjust for padding
		},
	},
});
</script>

<style lang="scss" scoped>
$--horiz-padding: 15px;

input {
	border: 1px solid transparent;
	padding: 0 $--horiz-padding - 2px; // -2px for borders
}

div.el-input {
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
		padding: 0 $--horiz-padding;
	}

	&:not(.static-size)::after {
		overflow: hidden;
	}

	&:hover {
		input:not(:focus) {
			border: 1px solid var(--color-text-lighter);
		}
	}
}
</style>
