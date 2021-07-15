<template>
	<el-button :disabled="isWorkflowSaving" :class="{saved: isSaved}" size="small" @click="save">
		<font-awesome-icon v-if="isWorkflowSaving" icon="spinner" spin />
		<span v-else-if="isDirty || isNewWorkflow">
			Save
		</span>
		<span v-else>Saved</span>
	</el-button>
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
		isSaved(): boolean {
			return !this.isWorkflowSaving && !this.isDirty && !this.isNewWorkflow;
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
.el-button {
	width: 65px;

	// override disabled colors
	color: white;
	background-color: $--color-primary;

	&:hover:not(.saved) {
		color: white;
		background-color: $--color-primary;
	}

	&.saved {
		color: $--custom-font-very-light;
		font-size: 12px;
		font-weight: 600;
		line-height: 12px;
		text-align: center;
		background-color: unset;
		pointer-events: none;
	}
}
</style>