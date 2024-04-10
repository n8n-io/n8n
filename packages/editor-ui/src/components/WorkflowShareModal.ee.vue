<template>
	<Modal
		width="460px"
		max-height="75%"
		:title="modalTitle"
		:event-bus="modalBus"
		:name="WORKFLOW_SHARE_MODAL_KEY"
		:center="true"
		:before-close="onCloseModal"
	>
		<template #content>
			<div v-if="!isSharingEnabled" :class="$style.container">
				<n8n-text>
					{{
						$locale.baseText(
							uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.description.modal,
						)
					}}
				</n8n-text>
			</div>
			<div v-else-if="isDefaultUser" :class="$style.container">
				<n8n-text>
					{{ $locale.baseText('workflows.shareModal.isDefaultUser.description') }}
				</n8n-text>
			</div>
			<div v-else :class="$style.container">
				<n8n-info-tip v-if="!workflowPermissions.share" :bold="false" class="mb-s">
					{{
						$locale.baseText('workflows.shareModal.info.sharee', {
							interpolate: { workflowOwnerName },
						})
					}}
				</n8n-info-tip>
				<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]" :class="$style.content">
					<ProjectSharing
						v-model="sharedWithProjects"
						:projects="projects"
						:readonly="!workflowPermissions.share"
					/>
					<template #fallback>
						<n8n-text>
							<i18n-t
								:keypath="
									uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.description
								"
								tag="span"
							>
								<template #action />
							</i18n-t>
						</n8n-text>
					</template>
				</enterprise-edition>
			</div>
		</template>

		<template #footer>
			<div v-if="!isSharingEnabled" :class="$style.actionButtons">
				<n8n-button @click="goToUpgrade">
					{{
						$locale.baseText(
							uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.button,
						)
					}}
				</n8n-button>
			</div>
			<div v-else-if="isDefaultUser" :class="$style.actionButtons">
				<n8n-button @click="goToUsersSettings">
					{{ $locale.baseText('workflows.shareModal.isDefaultUser.button') }}
				</n8n-button>
			</div>
			<enterprise-edition
				v-else
				:features="[EnterpriseEditionFeature.Sharing]"
				:class="$style.actionButtons"
			>
				<n8n-text v-show="isDirty" color="text-light" size="small" class="mr-xs">
					{{ $locale.baseText('workflows.shareModal.changesHint') }}
				</n8n-text>
				<n8n-button
					v-show="workflowPermissions.share"
					:loading="loading"
					:disabled="!isDirty"
					data-test-id="workflow-sharing-modal-save-button"
					@click="onSave"
				>
					{{ $locale.baseText('workflows.shareModal.save') }}
				</n8n-button>
			</enterprise-edition>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { createEventBus } from 'n8n-design-system/utils';

import Modal from './Modal.vue';
import {
	EnterpriseEditionFeature,
	MODAL_CONFIRM,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	VIEWS,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/constants';
import type { IUser, IWorkflowDb } from '@/Interface';
import type { PermissionsMap } from '@/permissions';
import type { WorkflowScope } from '@n8n/permissions';
import { getWorkflowPermissions } from '@/permissions';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { nodeViewEventBus } from '@/event-bus';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowsEEStore } from '@/stores/workflows.ee.store';
import type { BaseTextKey } from '@/plugins/i18n';
import { isNavigationFailure } from 'vue-router';
import ProjectSharing from '@/features/projects/components/ProjectSharing.vue';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { ProjectListItem, ProjectSharingData } from '@/features/projects/projects.types';

export default defineComponent({
	name: 'WorkflowShareModal',
	components: {
		Modal,
		ProjectSharing,
	},
	props: {
		data: {
			type: Object,
			default: () => ({}),
		},
	},
	setup() {
		return {
			...useToast(),
			...useMessage(),
		};
	},
	data() {
		const workflowsStore = useWorkflowsStore();
		const workflow =
			this.data.id === PLACEHOLDER_EMPTY_WORKFLOW_ID
				? workflowsStore.workflow
				: workflowsStore.workflowsById[this.data.id];

		return {
			WORKFLOW_SHARE_MODAL_KEY,
			loading: true,
			isDirty: false,
			modalBus: createEventBus(),
			sharedWithProjects: [...(workflow.sharedWithProjects || [])] as ProjectSharingData[],
			EnterpriseEditionFeature,
		};
	},
	computed: {
		...mapStores(
			useSettingsStore,
			useUIStore,
			useUsersStore,
			useWorkflowsStore,
			useWorkflowsEEStore,
			useProjectsStore,
		),
		isDefaultUser(): boolean {
			return this.usersStore.isDefaultUser;
		},
		isSharingEnabled(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		modalTitle(): string {
			return this.$locale.baseText(
				this.isSharingEnabled
					? (this.uiStore.contextBasedTranslationKeys.workflows.sharing.title as BaseTextKey)
					: (this.uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable
							.title as BaseTextKey),
				{
					interpolate: { name: this.workflow.name },
				},
			);
		},
		workflow(): IWorkflowDb {
			return this.data.id === PLACEHOLDER_EMPTY_WORKFLOW_ID
				? this.workflowsStore.workflow
				: this.workflowsStore.workflowsById[this.data.id];
		},
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		workflowPermissions(): PermissionsMap<WorkflowScope> {
			return getWorkflowPermissions(
				this.usersStore.currentUser,
				this.projectsStore.currentProject,
				this.workflow,
			);
		},
		workflowOwnerName(): string {
			return this.workflowsEEStore.getWorkflowOwnerName(`${this.workflow.id}`);
		},
		projects(): ProjectListItem[] {
			return this.projectsStore.personalProjects.filter(
				(project) => project.id !== this.workflow.homeProject?.id,
			);
		},
	},
	watch: {
		sharedWithProjects: {
			handler() {
				this.isDirty = true;
			},
			deep: true,
		},
	},
	mounted() {
		void this.initialize();
	},
	methods: {
		async onSave() {
			if (this.loading) {
				return;
			}

			this.loading = true;

			const saveWorkflowPromise = async () => {
				return await new Promise<string>((resolve) => {
					if (this.workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
						nodeViewEventBus.emit('saveWorkflow', () => {
							resolve(this.workflow.id);
						});
					} else {
						resolve(this.workflow.id);
					}
				});
			};

			try {
				const workflowId = await saveWorkflowPromise();
				await this.workflowsEEStore.saveWorkflowSharedWith({
					workflowId,
					sharedWithProjects: this.sharedWithProjects,
				});

				this.showMessage({
					title: this.$locale.baseText('workflows.shareModal.onSave.success.title'),
					type: 'success',
				});
				this.isDirty = false;
			} catch (error) {
				this.showError(error, this.$locale.baseText('workflows.shareModal.onSave.error.title'));
			} finally {
				this.modalBus.emit('close');
				this.loading = false;
			}
		},
		async onCloseModal() {
			if (this.isDirty) {
				const shouldSave = await this.confirm(
					this.$locale.baseText('workflows.shareModal.saveBeforeClose.message'),
					this.$locale.baseText('workflows.shareModal.saveBeforeClose.title'),
					{
						type: 'warning',
						confirmButtonText: this.$locale.baseText(
							'workflows.shareModal.saveBeforeClose.confirmButtonText',
						),
						cancelButtonText: this.$locale.baseText(
							'workflows.shareModal.saveBeforeClose.cancelButtonText',
						),
					},
				);

				if (shouldSave === MODAL_CONFIRM) {
					return await this.onSave();
				}
			}

			return true;
		},
		goToUsersSettings() {
			this.$router.push({ name: VIEWS.USERS_SETTINGS }).catch((failure) => {
				if (!isNavigationFailure(failure)) {
					console.error(failure);
				}
			});
			this.modalBus.emit('close');
		},
		goToUpgrade() {
			void this.uiStore.goToUpgrade('workflow_sharing', 'upgrade-workflow-sharing');
		},
		async initialize() {
			if (this.isSharingEnabled) {
				await Promise.all([this.usersStore.fetchUsers(), this.projectsStore.getAllProjects()]);

				if (this.workflow.id !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
					await this.workflowsStore.fetchWorkflow(this.workflow.id);
				}
			}

			this.loading = false;
		},
	},
});
</script>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.container > * {
	overflow-wrap: break-word;
}

.content {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow-y: auto;
}

.usersList {
	height: 100%;
	overflow-y: auto;
}

.actionButtons {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}

.roleSelect {
	max-width: 100px;
}

.roleSelectRemoveOption {
	border-top: 1px solid var(--color-foreground-base);
}
</style>
