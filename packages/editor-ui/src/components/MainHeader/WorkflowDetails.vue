<template>
	<div class="container" v-if="workflowName">
		<BreakpointsObserver :valueXS="15" :valueSM="25" :valueMD="50" class="name-container">
			<template v-slot="{ value }">
				<ShortenName
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
				</ShortenName>
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
					<WorkflowActivator :workflow-active="isWorkflowActive" :workflow-id="currentWorkflowId" />
				</span>
				<SaveButton
					type="secondary"
					:saved="!this.isDirty && !this.isNewWorkflow"
					:disabled="isWorkflowSaving"
					@click="onSaveButtonClick"
				/>
				<div :class="$style.workflowMenuContainer">
					<input :class="$style.hiddenInput" type="file" ref="importFile" @change="handleFileImport()">
					<n8n-action-dropdown :items="workflowMenuItems" @select="onWorkflowMenuSelect" />
				</div>
			</template>
		</PushConnectionTracker>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import mixins from "vue-typed-mixins";
import { mapGetters } from "vuex";
import {
	DUPLICATE_MODAL_KEY,
	MAX_WORKFLOW_NAME_LENGTH,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	VIEWS, WORKFLOW_MENU_ACTIONS,
	WORKFLOW_SETTINGS_MODAL_KEY,
} from "@/constants";

import ShortenName from "@/components/ShortenName.vue";
import TagsContainer from "@/components/TagsContainer.vue";
import PushConnectionTracker from "@/components/PushConnectionTracker.vue";
import WorkflowActivator from "@/components/WorkflowActivator.vue";
import { workflowHelpers } from "@/components/mixins/workflowHelpers";
import SaveButton from "@/components/SaveButton.vue";
import TagsDropdown from "@/components/TagsDropdown.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";
import BreakpointsObserver from "@/components/BreakpointsObserver.vue";
import { IWorkflowDataUpdate, IWorkflowToShare } from "@/Interface";

import { saveAs } from 'file-saver';
import { titleChange } from "../mixins/titleChange";
import type { MessageBoxInputData } from 'element-ui/types/message-box';

const hasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((accu, val) => accu || !set.has(val), false);
};

export default mixins(workflowHelpers, titleChange).extend({
	name: "WorkflowDetails",
	components: {
		TagsContainer,
		PushConnectionTracker,
		ShortenName,
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
			return !this.currentWorkflowId || (this.currentWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID || this.currentWorkflowId === 'new');
		},
		isWorkflowSaving(): boolean {
			return this.$store.getters.isActionActive("workflowSaving");
		},
		currentWorkflowId(): string {
			return this.$store.getters.workflowId;
		},
		workflowName (): string {
			return this.$store.getters.workflowName;
		},
		onWorkflowPage(): boolean {
			return this.$route.meta && (this.$route.meta.nodeView || this.$route.meta.keepWorkflowAlive === true);
		},
		onExecutionsTab(): boolean {
			return [ VIEWS.EXECUTION_HOME.toString(), VIEWS.EXECUTIONS.toString(), VIEWS.EXECUTION_PREVIEW ].includes(this.$route.name || '');
		},
		workflowMenuItems(): Array<{}> {
			return [
				{
					id: WORKFLOW_MENU_ACTIONS.DUPLICATE,
					label: this.$locale.baseText('menuActions.duplicate'),
					disabled: !this.onWorkflowPage || !this.currentWorkflowId,
				},
				{
					id: WORKFLOW_MENU_ACTIONS.DOWNLOAD,
					label: this.$locale.baseText('menuActions.download'),
					disabled: !this.onWorkflowPage,
				},
				{
					id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL,
					label: this.$locale.baseText('menuActions.importFromUrl'),
					disabled: !this.onWorkflowPage || this.onExecutionsTab,
				},
				{
					id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE,
					label: this.$locale.baseText('menuActions.importFromFile'),
					disabled: !this.onWorkflowPage || this.onExecutionsTab,
				},
				{
					id: WORKFLOW_MENU_ACTIONS.SETTINGS,
					label: this.$locale.baseText('generic.settings'),
					disabled: !this.onWorkflowPage || this.isNewWorkflow,
				},
				{
					id: WORKFLOW_MENU_ACTIONS.DELETE,
					label: this.$locale.baseText('menuActions.delete'),
					disabled: !this.onWorkflowPage || this.isNewWorkflow,
					customClass: this.$style.deleteItem,
					divided: true,
				},
			];
		},
	},
	methods: {
		async onSaveButtonClick () {
			let currentId = undefined;
			if (this.currentWorkflowId !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				currentId = this.currentWorkflowId;
			} else if (this.$route.params.name && this.$route.params.name !== 'new') {
				currentId = this.$route.params.name;
			}
			const saved = await this.saveCurrentWorkflow({ id: currentId, name: this.workflowName, tags: this.currentWorkflowTagIds });
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
		async handleFileImport(): Promise<void> {
			const reader = new FileReader();
			reader.onload = (event: ProgressEvent) => {
				const data = (event.target as FileReader).result;

				let workflowData: IWorkflowDataUpdate;
				try {
					workflowData = JSON.parse(data as string);
				} catch (error) {
					this.$showMessage({
						title: this.$locale.baseText('mainSidebar.showMessage.handleFileImport.title'),
						message: this.$locale.baseText('mainSidebar.showMessage.handleFileImport.message'),
						type: 'error',
					});
					return;
				}

				this.$root.$emit('importWorkflowData', { data: workflowData });
			};

			const input = this.$refs.importFile as HTMLInputElement;
			if (input !== null && input.files !== null && input.files.length !== 0) {
				reader.readAsText(input!.files[0]!);
			}
		},
		async onWorkflowMenuSelect(action: string): Promise<void> {
			switch (action) {
				case WORKFLOW_MENU_ACTIONS.DUPLICATE: {
					await this.$store.dispatch('ui/openModalWithData', {
						name: DUPLICATE_MODAL_KEY,
						data: {
							id: this.$store.getters.workflowId,
							name: this.$store.getters.workflowName,
							tags: this.$store.getters.workflowTags,
						},
					});
					break;
				}
				case WORKFLOW_MENU_ACTIONS.DOWNLOAD: {
					const workflowData = await this.getWorkflowDataToSave();
					const {tags, ...data} = workflowData;
					if (data.id && typeof data.id === 'string') {
						data.id = parseInt(data.id, 10);
					}

					const exportData: IWorkflowToShare = {
						...data,
						meta: {
							instanceId: this.$store.getters.instanceId,
						},
						tags: (tags || []).map(tagId => {
							const {usageCount, ...tag} = this.$store.getters["tags/getTagById"](tagId);

							return tag;
						}),
					};

					const blob = new Blob([JSON.stringify(exportData, null, 2)], {
						type: 'application/json;charset=utf-8',
					});

					let workflowName = this.$store.getters.workflowName || 'unsaved_workflow';
					workflowName = workflowName.replace(/[^a-z0-9]/gi, '_');

					this.$telemetry.track('User exported workflow', { workflow_id: workflowData.id });
					saveAs(blob, workflowName + '.json');
					break;
				}
				case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL: {
					try {
						const promptResponse = await this.$prompt(
						this.$locale.baseText('mainSidebar.prompt.workflowUrl') + ':',
						this.$locale.baseText('mainSidebar.prompt.importWorkflowFromUrl') + ':',
						{
								confirmButtonText: this.$locale.baseText('mainSidebar.prompt.import'),
								cancelButtonText: this.$locale.baseText('mainSidebar.prompt.cancel'),
								inputErrorMessage: this.$locale.baseText('mainSidebar.prompt.invalidUrl'),
								inputPattern: /^http[s]?:\/\/.*\.json$/i,
							},
						) as MessageBoxInputData;

						this.$root.$emit('importWorkflowUrl', { url: promptResponse.value });
					} catch (e) {}
					break;
				}
				case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE: {
					(this.$refs.importFile as HTMLInputElement).click();
					break;
				}
				case WORKFLOW_MENU_ACTIONS.SETTINGS: {
					this.$store.dispatch('ui/openModal', WORKFLOW_SETTINGS_MODAL_KEY);
					break;
				}
				case WORKFLOW_MENU_ACTIONS.DELETE: {
					const deleteConfirmed = await this.confirmMessage(
						this.$locale.baseText(
							'mainSidebar.confirmMessage.workflowDelete.message',
							{ interpolate: { workflowName: this.workflowName } },
						),
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.headline'),
						'warning',
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.confirmButtonText'),
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.cancelButtonText'),
					);

					if (deleteConfirmed === false) {
						return;
					}

					try {
						await this.restApi().deleteWorkflow(this.currentWorkflowId);
					} catch (error) {
						this.$showError(
							error,
							this.$locale.baseText('mainSidebar.showError.stopExecution.title'),
						);
						return;
					}
					this.$store.commit('setStateDirty', false);
					// Reset tab title since workflow is deleted.
					this.$titleReset();
					this.$showMessage({
						title: this.$locale.baseText('mainSidebar.showMessage.handleSelect1.title'),
						type: 'success',
					});

					this.$router.push({ name: VIEWS.NEW_WORKFLOW });
					break;
				}
				default:
					break;
			}
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
	position: relative;
	top: -1px;
	width: 100%;
	display: flex;
	align-items: center;
}

.name-container {
	margin-right: $--header-spacing;
}

.name {
	color: $custom-font-dark;
	font-size: 15px;
}

.activator {
	color: $custom-font-dark;
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
	color: $custom-font-very-light;
	font-weight: 600;
	white-space: nowrap;

	&:hover {
		color: $color-primary;
	}
}

.tags {
	flex: 1;
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

<style module lang="scss">
.workflowMenuContainer {
	margin-left: var(--spacing-2xs);
}

.hiddenInput {
	display: none;
}

.deleteItem {
	color: var(--color-danger);
}
</style>
