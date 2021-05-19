<template>
	<ExpandableInputBase
		:value="value"
		:staticSize="true"
	>
		<template>
			<input
				:class="{'el-input__inner': true, clickable: true}"
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
	props: ['value'],
});
</script>

<style lang="scss" scoped>
input, input:hover {
	background-color: unset;
	transition: unset;
}

input[disabled] {
   -webkit-text-fill-color: $--custom-font-black; 
   -webkit-opacity: 1; 
   color: $--custom-font-black;
}
</style>
