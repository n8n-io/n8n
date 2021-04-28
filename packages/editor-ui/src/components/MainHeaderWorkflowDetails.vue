<template>
	<div class="workflow-details">
		<span>
			<div>
				<div class="workflow-title">WORKFLOW</div>
				<div class="primary-color clickable">
					<span v-if="currentWorkflow">
						<a @click="openRenameDialog">
							<font-awesome-icon icon="edit" />&nbsp;&nbsp;<WorkflowNameShort
								:name="workflowName"
							/><span v-if="isDirty">*</span>
						</a>
					</span>
					<span v-else>
						<a @click="openSaveDialog">
							<font-awesome-icon icon="edit" />&nbsp;&nbsp;Unsaved workflow
						</a>
					</span>
				</div>
			</div>
		</span>

		<el-divider
			direction="vertical"
			v-if="currentWorkflowTagIds.length > 0"
		></el-divider>

		<TagsContainer :tagIds="currentWorkflowTagIds" />

		<span class="saving-workflow" v-if="isWorkflowSaving">
			<font-awesome-icon icon="spinner" spin />
			Saving...
		</span>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters } from "vuex";
import WorkflowNameShort from "@/components/WorkflowNameShort.vue";
import TagsContainer from "@/components/TagsContainer.vue";

export default Vue.extend({
	name: "WorkflowDetails",
	components: {
		TagsContainer,
		WorkflowNameShort,
	},
	computed: {
		...mapGetters("workflows", ["currentWorkflowTagIds"]),
		isWorkflowSaving(): boolean {
			return this.$store.getters.isActionActive("workflowSaving");
		},
		currentWorkflow(): string {
			return this.$route.params.name;
		},
		workflowName(): string {
			return this.$store.getters.workflowName;
		},
		isDirty(): boolean {
			return this.$store.getters.getStateIsDirty;
		},
	},
	methods: {
		openSaveDialog() {
			this.$store.commit("ui/openSaveAsDialog");
		},
		openRenameDialog() {
			this.$store.commit("ui/openRenameDialog");
		},
	},
});
</script>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
}

.workflow-details {
	display: flex;
	align-items: center;
	margin-left: 16px;

	> * {
		margin-right: 16px;
	}
}

.el-divider {
	min-height: 30px;
}

.saving-workflow {
	display: inline-block;
	padding: 0 15px;
	color: $--color-primary;
	background-color: $--color-primary-light;
	line-height: 30px;
	height: 30px;
	border-radius: 15px;
}

.workflow-title {
	font-size: 9px;
	font-weight: 600;
	letter-spacing: 0.75px;
	color: #5a5e66;
}
</style>