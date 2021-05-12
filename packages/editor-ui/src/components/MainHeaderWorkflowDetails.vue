<template>
	<div class="container">
		<InlineTextEdit 
			:value="workflowName"
			:isEditEnabled="isNameEditEnabled"
			:maxLength="MAX_WORKFLOW_NAME_LENGTH"
			@toggle="onNameToggle"
			@submit="onNameSubmit"
			placeholder="Enter workflow name"
			class="name"
		>
			<BreakpointsObserver valueDefault="25" valueLG="50">
				<template v-slot="{ value }">
					<WorkflowNameShort
						:name="workflowName"
						:limit="value"
					/>
				</template>
			</BreakpointsObserver>
		</InlineTextEdit>

		<div
			v-if="isTagsEditEnabled"
			class="tags">
			<TagsDropdown
				:createEnabled="true"
				:currentTagIds="appliedTagIds"
				:eventBus="tagsEditBus"
				@update="onTagsUpdate"
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
			:responsive="true"
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
import mixins from "vue-typed-mixins";
import { mapGetters } from "vuex";
import { MAX_WORKFLOW_NAME_LENGTH } from "@/constants";

import WorkflowNameShort from "@/components/WorkflowNameShort.vue";
import TagsContainer from "@/components/TagsContainer.vue";
import PushConnectionTracker from "@/components/PushConnectionTracker.vue";
import WorkflowActivator from "@/components/WorkflowActivator.vue";
import { workflowHelpers } from "@/components/mixins/workflowHelpers";
import SaveWorkflowButton from "./SaveWorkflowButton.vue";
import TagsDropdown from "./TagsDropdown.vue";
import InlineTextEdit from "./InlineTextEdit.vue";
import BreakpointsObserver from "./BreakpointsObserver.vue";

export default mixins(workflowHelpers).extend({
	name: "WorkflowDetails",
	components: {
		TagsContainer,
		PushConnectionTracker,
		WorkflowNameShort,
		WorkflowActivator,
		SaveWorkflowButton,
		TagsDropdown,
		InlineTextEdit,
		BreakpointsObserver,
	},
	data() {
		return {
			isTagsEditEnabled: false,
			isNameEditEnabled: false,
			appliedTagIds: [],
			tagsEditBus: new Vue(),
			MAX_WORKFLOW_NAME_LENGTH,
		};
	},
	computed: {
		...mapGetters({
			isWorkflowActive: "isActive", 
			workflowName: "workflowName",
			isDirty: "getStateIsDirty",
			currentWorkflowTagIds: "workflowTags",
		}),
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
		async onTagsUpdate(tags: string[]) {
			const prev = this.$data.appliedTagIds;
			this.$data.appliedTagIds = tags;
			const saved = await this.saveCurrentWorkflow({ 
				tags,
				successMessage: 'Workflow tags have been updated',
			});
			if (!saved) { // revert applied changes in case request fails
				this.$data.appliedTagIds = prev;
			}
		},
		onTagsEditCancel() {
			this.$data.isTagsEditEnabled = false;
		},
		onNameToggle() {
			this.$data.isNameEditEnabled = !this.$data.isNameEditEnabled;
			if (this.$data.isNameEditEnabled) {
				// @ts-ignore
				this.onTagsEditCancel();
			}
		},
		async onNameSubmit(name: string, cb: () => void) {
			const newName = name.trim();
			if (!newName) {
				this.$showMessage({
					title: "Name missing",
					message: `No name for the workflow got entered and so could not be saved!`,
					type: "error",
				});

				cb();
				return;
			}

			if (newName === this.workflowName) {
				this.$data.isNameEditEnabled = false;

				cb();
				return;
			}

			const saved = await this.saveCurrentWorkflow({
				name,
				successMessage: 'Workflow name has been updated',
			});
			if (saved) {
				this.$data.isNameEditEnabled = false;
			}
			cb();
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
	white-space: nowrap;

	&:hover {
		color: $--color-primary;
	}
}

.tags {
	flex: 1;
	padding-right: 20px;
	min-width: 100px;
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