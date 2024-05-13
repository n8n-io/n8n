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
			<div v-else :class="$style.container">
				<n8n-info-tip
					v-if="!workflowPermissions.share && !isHomeTeamProject"
					:bold="false"
					class="mb-s"
				>
					{{
						$locale.baseText('workflows.shareModal.info.sharee', {
							interpolate: { workflowOwnerName },
						})
					}}
				</n8n-info-tip>
				<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]" :class="$style.content">
					<div>
						<ProjectSharing
							v-model="sharedWithProjects"
							:home-project="workflow.homeProject"
							:projects="projects"
							:roles="workflowRoles"
							:readonly="!workflowPermissions.share"
							:static="isHomeTeamProject || !workflowPermissions.share"
							:placeholder="$locale.baseText('workflows.shareModal.select.placeholder')"
							@project-added="onProjectAdded"
							@project-removed="onProjectRemoved"
						/>
						<n8n-info-tip v-if="isHomeTeamProject" :bold="false" class="mt-s">
							<i18n-t keypath="workflows.shareModal.info.members" tag="span">
								<template #projectName>
									{{ workflow.homeProject?.name }}
								</template>
								<template #members>
									<strong>
										{{
											$locale.baseText('workflows.shareModal.info.members.number', {
												interpolate: {
													number: String(numberOfMembersInHomeTeamProject),
												},
												adjustToNumber: numberOfMembersInHomeTeamProject,
											})
										}}
									</strong>
								</template>
							</i18n-t>
						</n8n-info-tip>
					</div>
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
			<enterprise-edition
				v-else
				:features="[EnterpriseEditionFeature.Sharing]"
				:class="$style.actionButtons"
			>
				<n8n-text v-show="isDirty" color="text-light" size="small" class="mr-xs">
					{{ $locale.baseText('workflows.shareModal.changesHint') }}
				</n8n-text>
				<n8n-button v-if="isHomeTeamProject" type="secondary" @click="modalBus.emit('close')">
					{{ $locale.baseText('generic.close') }}
				</n8n-button>
				<n8n-button
					v-else
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
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import type { BaseTextKey } from '@/plugins/i18n';
import { isNavigationFailure } from 'vue-router';
import ProjectSharing from '@/features/projects/components/ProjectSharing.vue';
import { useProjectsStore } from '@/features/projects/projects.store';
import type {
	ProjectListItem,
	ProjectSharingData,
	Project,
} from '@/features/projects/projects.types';
import { useRolesStore } from '@/stores/roles.store';
import type { RoleMap } from '@/types/roles.types';

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
			teamProject: null as Project | null,
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
			useRolesStore,
		),
		isSharingEnabled(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		modalTitle(): string {
			if (this.isHomeTeamProject) {
				return this.$locale.baseText('workflows.shareModal.title.static', {
					interpolate: { projectName: this.workflow.homeProject?.name ?? '' },
				});
			}

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
			return getWorkflowPermissions(this.workflow);
		},
		workflowOwnerName(): string {
			return this.workflowsEEStore.getWorkflowOwnerName(`${this.workflow.id}`);
		},
		projects(): ProjectListItem[] {
			return this.projectsStore.personalProjects.filter(
				(project) => project.id !== this.workflow.homeProject?.id,
			);
		},
		isHomeTeamProject(): boolean {
			return this.workflow.homeProject?.type === 'team';
		},
		numberOfMembersInHomeTeamProject(): number {
			return this.teamProject?.relations.length ?? 0;
		},
		workflowRoleTranslations(): Record<string, string> {
			return {
				'workflow:editor': this.$locale.baseText('workflows.shareModal.role.editor'),
			};
		},
		workflowRoles(): RoleMap['workflow'] {
			return this.rolesStore.processedWorkflowRoles.map(({ role, scopes, licensed }) => ({
				role,
				name: this.workflowRoleTranslations[role],
				scopes,
				licensed,
			}));
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
	async mounted() {
		await this.initialize();
	},
	methods: {
		onProjectAdded(project: ProjectSharingData) {
			this.trackTelemetry('User selected sharee to add', {
				project_id_sharer: this.workflow.homeProject?.id,
				project_id_sharee: project.id,
			});
		},
		onProjectRemoved(project: ProjectSharingData) {
			this.trackTelemetry('User selected sharee to remove', {
				project_id_sharer: this.workflow.homeProject?.id,
				project_id_sharee: project.id,
			});
		},
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
		trackTelemetry(eventName: string, data: ITelemetryTrackProperties) {
			this.$telemetry.track(eventName, {
				workflow_id: this.workflow.id,
				...data,
			});
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

				if (this.isHomeTeamProject && this.workflow.homeProject) {
					this.teamProject = await this.projectsStore.fetchProject(this.workflow.homeProject.id);
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
