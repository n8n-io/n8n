<template>
	<div class="save-button">
		<el-button v-if="isDirty || isWorkflowSaving" :disabled="isWorkflowSaving"  size="small" @click="save">
			<span v-if="isDirty">
				Save
			</span>
			<font-awesome-icon v-else icon="spinner" spin />
		</el-button>
		<span v-else>Saved</span>
	</div>
</template>


<script lang="ts">
import mixins from "vue-typed-mixins";
import { mapGetters } from "vuex";

import { workflowHelpers } from "@/components/mixins/workflowHelpers";

export default mixins(workflowHelpers).extend({
	name: "SaveWorkflowButton",
	computed: {
		...mapGetters({
			isDirty: "getStateIsDirty",
		}),
		isWorkflowSaving(): boolean {
			return this.$store.getters.isActionActive("workflowSaving");
		},
	},
	methods: {
		save() {
			this.saveCurrentWorkflow();
		},
	},
});
</script>

<style lang="scss" scoped>
.save-button {
	min-width: 60px;

	> span {
	  color: $--custom-font-very-light;
  	font-size: 12px;
  	font-weight: 600;
  	line-height: 12px;
  	text-align: center;
	}
}
</style>