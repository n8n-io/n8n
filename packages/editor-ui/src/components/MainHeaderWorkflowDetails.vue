<template>
	<div class="container">
		<InlineTextEdit 
			:value="workflowName"
			:isEditEnabled="true"
			@toggle="onNameToggle"
			@change="onNameChange"
			placeholder="Enter workflow name"
		>
			<WorkflowNameShort
				:name="workflowName"
			/>
		</InlineTextEdit>
		

		<div
			v-if="isTagsEditEnabled"
			class="tags">
			<TagsDropdown
				:createEnabled="true"
				:currentTagIds="appliedTagIds"
				:eventBus="tagsEditBus"
				@onUpdate="onTagsUpdate"
				@blur="onTagsEditCancel"
				placeholder="Choose or create a tag"
				ref="dropdown"
				class="tags-edit"
			/>
		</div>
		<div
			class="add-tag clickable tags"
			@click="onTagsEditEnable"
			v-else-if="currentWorkflowTagIds.length === 0"
		>+ Add tag</div>
		<TagsContainer
			v-else
			:tagIds="currentWorkflowTagIds"
			:clickable="true"
			:limit="MAX_TAGS_TO_PREVIEW"
			@click="onTagsEditEnable"
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
import InlineTextEdit from "./InlineTextEdit.vue";

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
		InlineTextEdit,
	},
	data() {
		return {
			isTagsEditEnabled: false,
			isNameEditEnabled: false,
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
		onTagsEditEnable() {
			this.$data.appliedTagIds = this.currentWorkflowTagIds;
			this.$data.isTagsEditEnabled = true;
			this.$data.isNameEditEnabled = false;
			this.$nextTick(() => {
				this.$data.tagsEditBus.$emit('focus');
			});
		},
		onTagsUpdate(appliedIds: string[]) {
			this.$data.appliedTagIds = appliedIds;
			// todo save
		},
		onTagsEditCancel() {
			this.$data.isTagsEditEnabled = false;
		},
		onNameToggle() {
			this.$data.isNameEditEnabled = !this.$data.isNameEditEnabled;
			if (this.$data.isNameEditEnabled) {
				this.onTagsEditCancel();
			}
		},
		onNameChange() {
			// todo save
		}
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
	white-space: nowrap;

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