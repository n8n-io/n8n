<template>
	<div class="container" v-if="workflowName">
		<BreakpointsObserver :valueXS="15" :valueSM="25" :valueMD="50" :valueLG="100">
			<template v-slot="{ value }">
				<WorkflowNameShort
					:name="workflowName"
					:limit="value"
					:custom="true"
				>
					<template v-slot="{ shortenedName }">
						<InlineTextEdit 
							:value="workflowName"
							:previewValue="shortenedName"
							:isEditEnabled="isNameEditEnabled"
							:maxLength="MAX_WORKFLOW_NAME_LENGTH"
							@toggle="onNameToggle"
							@submit="onNameSubmit"
							placeholder="Enter workflow name"
							class="name"
						/>
					</template>
				</WorkflowNameShort>
			</template>
		</BreakpointsObserver>

		<div
			v-if="isTagsEditEnabled"
			v-click-outside="onTagsBlur"
			class="tags">
			<TagsDropdown
				:createEnabled="true"
				:currentTagIds="appliedTagIds"
				:eventBus="tagsEditBus"
				@update="onTagsUpdate"
				@blur="onTagsBlur"
				@esc="onTagsEditEsc"
				placeholder="Choose or create a tag"
				ref="dropdown"
				class="tags-edit"
			/>
		</div>
		<div
			class="tags"
			v-else-if="currentWorkflowTagIds.length === 0"
		>
			<span
				class="add-tag clickable"
				@click="onTagsEditEnable"
			>	
				+ Add tag
			</span>
		</div>
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
					<span>Active:</span>
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
import SaveWorkflowButton from "@/components/SaveWorkflowButton.vue";
import TagsDropdown from "@/components/TagsDropdown.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";
import BreakpointsObserver from "@/components/BreakpointsObserver.vue";

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
			this.$data.appliedTagIds = tags;
		},

		async onTagsBlur() {
			const tags = this.$data.appliedTagIds;
			const saved = await this.saveCurrentWorkflow({ tags });
			if (saved) {
				this.$data.isTagsEditEnabled = false;
			}
		},
		onTagsEditEsc() {
			this.$data.isTagsEditEnabled = false;
		},
		onNameToggle() {
			this.$data.isNameEditEnabled = !this.$data.isNameEditEnabled;
			if (this.$data.isNameEditEnabled) {
				this.$data.isTagsEditEnabled = false;
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

			const saved = await this.saveCurrentWorkflow({ name });
			if (saved) {
				this.$data.isNameEditEnabled = false;
			}
			cb();
		},
	},
});
</script>

<style scoped lang="scss">
$--text-line-height: 24px;

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
	line-height: $--text-line-height;
	display: flex;
	align-items: center;

	> span {
		margin-right: 5px;
	}
}

.add-tag {
	font-size: 12px;
	padding: 20px 0; // to be more clickable
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
}

.tags-edit {
	min-width: 100px;
	max-width: 460px;
}

.actions,.container {
	display: flex;
	align-items: center;

	> * {
		margin-right: $--header-spacing;	
	}
}
</style>