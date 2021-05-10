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

		<div
			v-if="isTagsEditEnabled"
			class="tags">
			<TagsDropdown
				:createEnabled="true"
				:currentTagIds="appliedTagIds"
				:eventBus="tagsEditBus"
				@onUpdate="onTagsUpdate"
				@blur="onTagsEditBlur"
				placeholder="Choose or create a tag"
				ref="dropdown"
				class="tags-edit"
			/>
		</div>
		<div
			class="add-tag clickable tags"
			@click="onTagsPreviewClick"
			v-else-if="currentWorkflowTagIds.length === 0"
		>+ Add tag</div>
		<TagsContainer
			v-else
			:tagIds="currentWorkflowTagIds"
			:clickable="true"
			:limit="MAX_TAGS_TO_PREVIEW"
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

const MAX_TAGS_TO_PREVIEW = 10; // random upper limit to minimize performance impact of observers

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
			appliedTagIds: [],
			MAX_TAGS_TO_PREVIEW,
			tagsEditBus: new Vue(),
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
		onTagsPreviewClick() {
			this.$data.appliedTagIds = this.currentWorkflowTagIds;
			this.$data.isTagsEditEnabled = !this.$data.isTagsEditEnabled;
			this.$nextTick(() => {
				this.$data.tagsEditBus.$emit('focus');
			});
		},
		onTagsUpdate(appliedIds: string[]) {
			this.$data.appliedTagIds = appliedIds;
		},
		onTagsEditBlur() {
			this.$data.isTagsEditEnabled = false; //todo save
		},
	},
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

.add-tag {
	font-size: 12px;
	color: $--custom-font-very-light;
	font-weight: 600;

	&:hover {
		color: $--color-primary;
	}
}

.tags {
	flex: 1;
}

.tags-edit {
	max-width: 400px;
}

.actions,.container {
	display: flex;
	align-items: center;

	> * {
		margin-right: $--header-spacing;	
	}
}
</style>