<template>
	<div class="workflow-details">
		<span>
			<div>
				<div class="workflow-title">WORKFLOW</div>
				<div class="primary-color clickable">
					<span v-if="currentWorkflow">
						<a @click="openRenameDialog">
							<font-awesome-icon icon="edit" /><WorkflowNameShort
								:name="workflowName"
							/><span v-if="isDirty">*</span>
						</a>
					</span>
					<span v-else>
						<a @click="openSaveDialog">
							<font-awesome-icon icon="edit" />&nbsp;Unsaved workflow
						</a>
					</span>
				</div>
			</div>
		</span>

		<div class="hidden-xs-only tags" >
			<el-divider
				direction="vertical"
				v-if="currentWorkflowTagIds.length > 0"
			></el-divider>

			<TagsContainerResponsive :tagIds="currentWorkflowTagIds" :limit="1" :limitSM="2" :limitMD="3" :limitLG="4" :limitXL="5" />
		</div>

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
import TagsContainerResponsive from "@/components/TagsContainerResponsive.vue";

export default Vue.extend({
	name: "WorkflowDetails",
	components: {
		TagsContainerResponsive,
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
			this.$store.dispatch('ui/openSaveAsModal');
		},
		openRenameDialog() {
			this.$store.dispatch('ui/openRenameModal');
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

.tags {
	display: flex;
}

.workflow-title {
	font-size: 9px;
	font-weight: 600;
	letter-spacing: 0.75px;
	color: $--custom-font-light;
}
</style>