<template>
	<!-- mock el-input element to apply styles -->
	<div :class="{ 'el-input': true, 'static-size': staticSize }" :data-value="hiddenValue">
		<slot></slot>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'ExpandableInputBase',
	props: ['modelValue', 'placeholder', 'staticSize'],
	computed: {
		hiddenValue() {
			let value = (this.modelValue as string).replace(/\s/g, '.'); // force input to expand on space chars
			if (!value) {
				// @ts-ignore
				value = this.placeholder;
			}

			return `${value}`; // adjust for padding
		},
	},
});
</script>

<style lang="scss" scoped>
$--horiz-padding: 15px;

.el-input {
	display: inline-grid;
	font: inherit;
	padding: 10px 0;

	:deep(input) {
		border: 1px solid transparent;
		padding: 0 $--horiz-padding - 2px; // -2px for borders
		width: 100%;
		grid-area: 1 / 2;
		font: inherit;
	}

	&::after {
		grid-area: 1 / 2;
		font: inherit;
		content: attr(data-value) ' ';
		visibility: hidden;
		white-space: nowrap;
		padding: 0 $--horiz-padding;
	}

	&:not(.static-size)::after {
		overflow: hidden;
	}

	&:hover {
		:deep(input):not(:focus) {
			border: 1px solid var(--color-text-lighter);
		}
	}

	:deep(input):focus {
		border: 1px solid var(--color-secondary);
	}
}
</style>
