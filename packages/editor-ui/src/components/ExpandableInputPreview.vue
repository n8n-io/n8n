<template>
	<ExpandableInputBase
		:value="value"
	>
		<template>
			<input
				class="el-input__inner"
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
}
</style>
