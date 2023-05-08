<template>
	<Modal
		:name="modalName"
		:eventBus="modalBus"
		@enter="save"
		:title="$locale.baseText('duplicateWorkflowDialog.duplicateWorkflow')"
		:center="true"
		width="420px"
	>
		<template #content>
			<div :class="$style.content">
				<n8n-input
					v-model="name"
					ref="nameInput"
					:placeholder="$locale.baseText('duplicateWorkflowDialog.enterWorkflowName')"
					:maxlength="MAX_WORKFLOW_NAME_LENGTH"
				/>
				<TagsDropdown
					v-if="settingsStore.areTagsEnabled"
					:createEnabled="true"
					:currentTagIds="currentTagIds"
					:eventBus="dropdownBus"
					@blur="onTagsBlur"
					@esc="onTagsEsc"
					@update="onTagsUpdate"
					:placeholder="$locale.baseText('duplicateWorkflowDialog.chooseOrCreateATag')"
					ref="dropdown"
				/>
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<n8n-button
					@click="save"
					:loading="isSaving"
					:label="$locale.baseText('duplicateWorkflowDialog.save')"
					float="right"
				/>
				<n8n-button
					type="secondary"
					@click="close"
					:disabled="isSaving"
					:label="$locale.baseText('duplicateWorkflowDialog.cancel')"
					float="right"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';

import { MAX_WORKFLOW_NAME_LENGTH, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { useToast } from '@/composables';
import TagsDropdown from '@/components/TagsDropdown.vue';
import Modal from '@/components/Modal.vue';
import { mapStores } from 'pinia';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IWorkflowDataUpdate } from '@/Interface';
import type { IPermissions } from '@/permissions';
import { getWorkflowPermissions } from '@/permissions';
import { useUsersStore } from '@/stores/users.store';
import { createEventBus } from '@/event-bus';
import { useCredentialsStore } from '@/stores';

export default mixins(workflowHelpers).extend({
	components: { TagsDropdown, Modal },
	name: 'DuplicateWorkflow',
	props: ['modalName', 'isActive', 'data'],
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		const currentTagIds = this.data.tags;

		return {
			name: '',
			currentTagIds,
			isSaving: false,
			modalBus: createEventBus(),
			dropdownBus: createEventBus(),
			MAX_WORKFLOW_NAME_LENGTH,
			prevTagIds: currentTagIds,
		};
	},
	async mounted() {
		this.name = await this.workflowsStore.getDuplicateCurrentWorkflowName(this.data.name);
		this.$nextTick(() => this.focusOnNameInput());
	},
	computed: {
		...mapStores(useCredentialsStore, useUsersStore, useSettingsStore, useWorkflowsStore),
		workflowPermissions(): IPermissions {
			const isEmptyWorkflow = this.data.id === PLACEHOLDER_EMPTY_WORKFLOW_ID;
			const isCurrentWorkflowEmpty =
				this.workflowsStore.workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID;

			// If the workflow to be duplicated is empty and the current workflow is also empty
			// we need to use the current workflow to get the permissions
			const currentWorkflow =
				isEmptyWorkflow && isCurrentWorkflowEmpty
					? this.workflowsStore.workflow
					: this.workflowsStore.getWorkflowById(this.data.id);

			return getWorkflowPermissions(this.usersStore.currentUser, currentWorkflow);
		},
	},
	watch: {
		isActive(active) {
			if (active) {
				this.focusOnSelect();
			}
		},
	},
	methods: {
		focusOnSelect() {
			this.dropdownBus.emit('focus');
		},
		focusOnNameInput() {
			const inputRef = this.$refs.nameInput as HTMLElement | undefined;
			if (inputRef && inputRef.focus) {
				inputRef.focus();
			}
		},
		onTagsBlur() {
			this.prevTagIds = this.currentTagIds;
		},
		onTagsEsc() {
			// revert last changes
			this.currentTagIds = this.prevTagIds;
		},
		onTagsUpdate(tagIds: string[]) {
			this.currentTagIds = tagIds;
		},
		async save(): Promise<void> {
			const name = this.name.trim();
			if (!name) {
				this.showMessage({
					title: this.$locale.baseText('duplicateWorkflowDialog.errors.missingName.title'),
					message: this.$locale.baseText('duplicateWorkflowDialog.errors.missingName.message'),
					type: 'error',
				});

				return;
			}

			const currentWorkflowId = this.data.id;

			this.isSaving = true;

			try {
				let workflowToUpdate: IWorkflowDataUpdate | undefined;
				if (currentWorkflowId !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
					const { createdAt, updatedAt, usedCredentials, ...workflow } =
						await this.workflowsStore.fetchWorkflow(this.data.id);
					workflowToUpdate = workflow;

					this.removeForeignCredentialsFromWorkflow(
						workflowToUpdate,
						this.credentialsStore.allCredentials,
					);
				}

				const saved = await this.saveAsNewWorkflow({
					name,
					data: workflowToUpdate,
					tags: this.currentTagIds,
					resetWebhookUrls: true,
					openInNewWindow: true,
					resetNodeIds: true,
				});

				if (saved) {
					this.closeDialog();
					this.$telemetry.track('User duplicated workflow', {
						old_workflow_id: currentWorkflowId,
						workflow_id: this.data.id,
						sharing_role: this.workflowPermissions.isOwner ? 'owner' : 'sharee',
					});
				}
			} catch (error) {
				if (error.httpStatusCode === 403) {
					error.message = this.$locale.baseText('duplicateWorkflowDialog.errors.forbidden.message');

					this.showError(
						error,
						this.$locale.baseText('duplicateWorkflowDialog.errors.forbidden.title'),
					);
				} else {
					this.showError(
						error,
						this.$locale.baseText('duplicateWorkflowDialog.errors.generic.title'),
					);
				}
			} finally {
				this.isSaving = false;
			}
		},
		closeDialog(): void {
			this.modalBus.emit('close');
		},
	},
});
</script>

<style lang="scss" module>
.content {
	> *:not(:last-child) {
		margin-bottom: var(--spacing-m);
	}
}

.footer {
	> * {
		margin-left: var(--spacing-3xs);
	}
}
</style>
