<template>
	<div class="save-button">
		<el-button v-if="isDirty || isNewWorkflow || isWorkflowSaving" :disabled="isWorkflowSaving"  size="small" @click="save">
			<font-awesome-icon v-if="isWorkflowSaving" icon="spinner" spin />
			<span v-else>
				Save
			</span>
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
		isNewWorkflow(): boolean {
			return !this.$route.params.name;
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
$--button-width: 65px;

.save-button {
	min-width: $--button-width;

	> button {
		width: $--button-width;

		// override disabled colors
		color: white;
		background-color: $--color-primary;

		&:hover {
			color: white;
			background-color: $--color-primary;
		}
	}

	> span {
		color: $--custom-font-very-light;
		font-size: 12px;
		font-weight: 600;
		line-height: 12px;
		text-align: center;
	}
}
</style>