<template>
	<div class="container" v-if="workflowName">
		<BreakpointsObserver :valueXS="15" :valueSM="25" :valueMD="50" class="name-container">
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

		<span v-if="areTagsEnabled" class="tags">
			<div
				v-if="isTagsEditEnabled">
				<TagsDropdown
					:createEnabled="true"
					:currentTagIds="appliedTagIds"
					:eventBus="tagsEditBus"
					@blur="onTagsBlur"
					@update="onTagsUpdate"
					@esc="onTagsEditEsc"
					:placeholder="$locale.baseText('workflowDetails.chooseOrCreateATag')"
					ref="dropdown"
					class="tags-edit"
				/>
			</div>
			<div
				v-else-if="currentWorkflowTagIds.length === 0"
			>
				<span
					class="add-tag clickable"
					@click="onTagsEditEnable"
				>
					+ {{ $locale.baseText('workflowDetails.addTag') }}
				</span>
			</div>
			<TagsContainer
				v-else
				:tagIds="currentWorkflowTagIds"
				:clickable="true"
				:responsive="true"
				:key="currentWorkflowId"
				@click="onTagsEditEnable"
			/>
		</span>
		<span v-else class="tags"></span>

		<PushConnectionTracker class="actions">
			<template>
				<span class="activator">
					<span>{{ $locale.baseText('workflowDetails.active') + ':' }}</span>
					<WorkflowActivator :workflow-active="isWorkflowActive" :workflow-id="currentWorkflowId"/>
				</span>
				<SaveButton
					:saved="!this.isDirty && !this.isNewWorkflow"
					:disabled="isWorkflowSaving"
					@click="onSaveButtonClick"
				/>
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
import SaveButton from "@/components/SaveButton.vue";
import TagsDropdown from "@/components/TagsDropdown.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";
import BreakpointsObserver from "@/components/BreakpointsObserver.vue";

const hasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((accu, val) => accu || !set.has(val), false);
};

export default mixins(workflowHelpers).extend({
	name: "WorkflowDetails",
	components: {
		TagsContainer,
		PushConnectionTracker,
		WorkflowNameShort,
		WorkflowActivator,
		SaveButton,
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
			tagsSaving: false,
		};
	},
	computed: {
		...mapGetters({
			isWorkflowActive: "isActive",
			workflowName: "workflowName",
			isDirty: "getStateIsDirty",
			currentWorkflowTagIds: "workflowTags",
		}),
		...mapGetters('settings', ['areTagsEnabled']),
		isNewWorkflow(): boolean {
			return !this.$route.params.name;
		},
		isWorkflowSaving(): boolean {
			return this.$store.getters.isActionActive("workflowSaving");
		},
		currentWorkflowId(): string {
			return this.$route.params.name;
		},
	},
	methods: {
		async onSaveButtonClick () {
			const saved = await this.saveCurrentWorkflow();
			if (saved) this.$store.dispatch('settings/fetchPromptsData');
		},
		onTagsEditEnable() {
			this.$data.appliedTagIds = this.currentWorkflowTagIds;
			this.$data.isTagsEditEnabled = true;

			setTimeout(() => {
				// allow name update to occur before disabling name edit
				this.$data.isNameEditEnabled = false;
				this.$data.tagsEditBus.$emit('focus');
			}, 0);
		},
		async onTagsUpdate(tags: string[]) {
			this.$data.appliedTagIds = tags;
		},

		async onTagsBlur() {
			const current = this.currentWorkflowTagIds;
			const tags = this.$data.appliedTagIds;
			if (!hasChanged(current, tags)) {
				this.$data.isTagsEditEnabled = false;

				return;
			}
			if (this.$data.tagsSaving) {
				return;
			}
			this.$data.tagsSaving = true;

			const saved = await this.saveCurrentWorkflow({ tags });
			this.$telemetry.track('User edited workflow tags', { workflow_id: this.currentWorkflowId as string, new_tag_count: tags.length });

			this.$data.tagsSaving = false;
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
				if (this.$data.isTagsEditEnabled) {
					// @ts-ignore
					this.onTagsBlur();
				}

				this.$data.isTagsEditEnabled = false;
			}
		},
		async onNameSubmit(name: string, cb: (saved: boolean) => void) {
			const newName = name.trim();
			if (!newName) {
				this.$showMessage({
					title: this.$locale.baseText('workflowDetails.showMessage.title'),
					message: this.$locale.baseText('workflowDetails.showMessage.message'),
					type: "error",
				});

				cb(false);
				return;
			}

			if (newName === this.workflowName) {
				this.$data.isNameEditEnabled = false;

				cb(true);
				return;
			}

			const saved = await this.saveCurrentWorkflow({ name });
			if (saved) {
				this.$data.isNameEditEnabled = false;
			}
			cb(saved);
		},
	},
	watch: {
		currentWorkflowId() {
			this.$data.isTagsEditEnabled = false;
			this.$data.isNameEditEnabled = false;
		},
	},
});
</script>

<style scoped lang="scss">
$--text-line-height: 24px;
$--header-spacing: 20px;

.container {
	width: 100%;
	display: flex;
	align-items: center;
}

.name-container {
	margin-right: $--header-spacing;
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
	margin-right: 30px;

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
	margin-right: $--header-spacing;
}

.tags-edit {
	min-width: 100px;
	max-width: 460px;
}

.actions {
	display: flex;
	align-items: center;
}
</style>
