<template>
	<div class="container">
		<div class="details">
			<span>
				<div>
					<div class="clickable">
						<WorkflowNameShort
							:name="workflowName"
						/>
					</div>
				</div>
			</span>

			<span class="hidden-xs-only tags" >
				<span
					direction="vertical"
					v-if="currentWorkflowTagIds.length === 0"
				>+ Add tag</span>

				<TagsContainerResponsive :tagIds="currentWorkflowTagIds" :limit="1000" />
			</span>
		</div>

		<PushConnectionTracker class="actions">
			<template>
				<span>
					Active:
					<WorkflowActivator :workflow-active="isWorkflowActive" :workflow-id="currentWorkflowId" :disabled="!currentWorkflowId"/>
				</span>
				<SaveWorkflowButton />
			</template>
		</PushConnectionTracker>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters } from "vuex";
import WorkflowNameShort from "@/components/WorkflowNameShort.vue";
import TagsContainerResponsive from "@/components/TagsContainerResponsive.vue";
import PushConnectionTracker from "@/components/PushConnectionTracker.vue";
import WorkflowActivator from "@/components/WorkflowActivator.vue";
import SaveWorkflowButton from "./SaveWorkflowButton.vue";
import TagsContainer from "./TagsContainer.vue";

export default Vue.extend({
	name: "WorkflowDetails",
	components: {
		TagsContainerResponsive,
		PushConnectionTracker,
		WorkflowNameShort,
		WorkflowActivator,
		SaveWorkflowButton,
	},
	computed: {
		...mapGetters({
			isWorkflowActive: "isActive", 
			workflowName: "workflowName",
			isDirty: "getStateIsDirty",
		}),
		...mapGetters("workflows", ["currentWorkflowTagIds"]),
		isWorkflowSaving(): boolean {
			return this.$store.getters.isActionActive("workflowSaving");
		},
		currentWorkflowId() {
			return this.$route.params.name;
		},
	},
});
</script>

<style scoped lang="scss">
.container {
	width: 100%;
	display: flex;
}

.details {
	margin-left: $--header-spacing;
	flex: 1;
}

.actions,.details {
	display: flex;
	align-items: center;

	> * {
		margin-right: $--header-spacing;	
	}
}
</style>