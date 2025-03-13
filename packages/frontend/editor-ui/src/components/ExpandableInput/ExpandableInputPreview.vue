<script setup lang="ts">
import ExpandableInputBase from './ExpandableInputBase.vue';

type Props = {
	modelValue: string;
};

defineProps<Props>();
</script>

<template>
	<ExpandableInputBase :model-value="modelValue" :static-size="true">
		<input
			:class="{ 'el-input__inner': true, clickable: true }"
			:value="modelValue"
			:disabled="true"
			size="4"
		/>
	</ExpandableInputBase>
</template>

<style lang="scss" scoped>
input,
input:hover {
	background-color: unset;
	transition: unset;
	pointer-events: none; // fix firefox bug
}

input[disabled] {
	color: $custom-font-black;

	// override safari colors
	-webkit-text-fill-color: $custom-font-black;
	-webkit-opacity: 1;
}
</style>
