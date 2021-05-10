<template>
	<div class="container">
		<div>
			<div>
				<div class="clickable name">
					<WorkflowNameShort
						:name="workflowName"
					/>
				</div>
			</div>
		</div>

		<TagsDropdown
			v-if="isTagsEditEnabled"
			:createEnabled="true"
			:currentTagIds="currentWorkflowTagIds"
			@onUpdate="onTagsUpdate"
			placeholder="Choose or create a tag"
			ref="dropdown"
			class="clickable tags"
		/>
		<div
			class="add-tag clickable tags"
			direction="vertical"
			v-else-if="currentWorkflowTagIds.length === 0"
		>+ Add tag</div>
		<TagsContainer
			v-else
			:tagIds="currentWorkflowTagIds"
			:clickable="true"
			@click="onTagsPreviewClick"
			class="tags"
		/>

		<PushConnectionTracker class="actions">
			<template>
				<span class="activator">
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
import TagsContainer from "@/components/TagsContainer.vue";
import PushConnectionTracker from "@/components/PushConnectionTracker.vue";
import WorkflowActivator from "@/components/WorkflowActivator.vue";
import SaveWorkflowButton from "./SaveWorkflowButton.vue";
import TagsDropdown from "./TagsDropdown.vue";

export default Vue.extend({
	name: "WorkflowDetails",
	components: {
		TagsContainer,
		PushConnectionTracker,
		WorkflowNameShort,
		WorkflowActivator,
		SaveWorkflowButton,
		TagsDropdown,
	},
	data() {
		return {
			isTagsEditEnabled: false,
		};
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
	methods: {
		onTagsPreviewClick: function() {
			this.$data.isTagsEditEnabled = !this.$data.isTagsEditEnabled;
		},
		onTagsUpdate: function() {
			// todo
		},
	}
});
</script>

<style scoped lang="scss">
.container {
	width: 100%;
	display: flex;
	margin-left: $--header-spacing;
}

.name {
	color: $--custom-font-dark;
	font-size: 15px;
}

.activator {
	color: $--custom-font-dark;
	font-weight: 400;
	font-size: 13px;
}

.tags {
	flex: 1;
}

.actions,.container {
	display: flex;
	align-items: center;

	> * {
		margin-right: $--header-spacing;	
	}
}
</style>