<template>
	<ExpandableInputBase :value="value" :staticSize="true">
		<template>
			<input
				:class="{ 'el-input__inner': true, clickable: true }"
				:value="value"
				:disabled="true"
				size="4"
			/>
		</template>
	</ExpandableInputBase>
</template>

<script lang="ts">
import Vue from "vue";
import ExpandableInputBase from "./ExpandableInputBase.vue";

export default Vue.extend({
	components: { ExpandableInputBase },
	name: "ExpandableInputPreview",
	props: ["value"],
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
	color: $--custom-font-black;

	// override safari colors
	-webkit-text-fill-color: $--custom-font-black;
	-webkit-opacity: 1;
}
</style>
