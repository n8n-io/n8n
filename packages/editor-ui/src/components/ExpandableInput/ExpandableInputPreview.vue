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

<script lang="ts">
import { defineComponent } from 'vue';
import ExpandableInputBase from './ExpandableInputBase.vue';

export default defineComponent({
	name: 'ExpandableInputPreview',
	components: { ExpandableInputBase },
	props: ['modelValue'],
});
</script>

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
