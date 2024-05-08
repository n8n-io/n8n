<template>
	<Modal
		:name="modalName"
		:event-bus="modalBus"
		:title="$locale.baseText('duplicateWorkflowDialog.duplicateWorkflow')"
		:center="true"
		width="420px"
		@enter="save"
	>
		<template #content>
			<div :class="$style.content">
				<n8n-input
					ref="nameInput"
					v-model="name"
					:placeholder="$locale.baseText('duplicateWorkflowDialog.enterWorkflowName')"
					:maxlength="MAX_WORKFLOW_NAME_LENGTH"
				/>
				<TagsDropdown
					v-if="settingsStore.areTagsEnabled"
					ref="dropdown"
					v-model="currentTagIds"
					:create-enabled="true"
					:event-bus="dropdownBus"
					:placeholder="$locale.baseText('duplicateWorkflowDialog.chooseOrCreateATag')"
					@blur="onTagsBlur"
					@esc="onTagsEsc"
				/>
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<n8n-button
					:loading="isSaving"
					:label="$locale.baseText('duplicateWorkflowDialog.save')"
					float="right"
					@click="save"
				/>
				<n8n-button
					type="secondary"
					:disabled="isSaving"
					:label="$locale.baseText('duplicateWorkflowDialog.cancel')"
					float="right"
					@click="close"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { MAX_WORKFLOW_NAME_LENGTH, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { useToast } from '@/composables/useToast';
import TagsDropdown from '@/components/TagsDropdown.vue';
import Modal from '@/components/Modal.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IWorkflowDataUpdate } from '@/Interface';
import { useUsersStore } from '@/stores/users.store';
import { createEventBus } from 'n8n-design-system/utils';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRouter } from 'vue-router';

export default defineComponent({
	name: 'DuplicateWorkflow',
	components: { TagsDropdown, Modal },
	props: ['modalName', 'isActive', 'data'],
	setup() {
		const router = useRouter();
		const workflowHelpers = useWorkflowHelpers({ router });

		return {
			...useToast(),
			workflowHelpers,
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
		await this.$nextTick();
		this.focusOnNameInput();
	},
	computed: {
		...mapStores(useCredentialsStore, useUsersStore, useSettingsStore, useWorkflowsStore),
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
			if (inputRef?.focus) {
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
					const {
						createdAt,
						updatedAt,
						usedCredentials,
						id,
						homeProject,
						sharedWithProjects,
						...workflow
					} = await this.workflowsStore.fetchWorkflow(this.data.id);
					workflowToUpdate = workflow;

					this.workflowHelpers.removeForeignCredentialsFromWorkflow(
						workflowToUpdate,
						this.credentialsStore.allCredentials,
					);
				}

				const saved = await this.workflowHelpers.saveAsNewWorkflow({
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
						sharing_role: this.workflowHelpers.getWorkflowProjectRole(this.data.id),
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
