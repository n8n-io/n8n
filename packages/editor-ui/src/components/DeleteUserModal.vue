<template>
	<Modal
		:name="modalName"
		:title="title"
		:center="true"
		width="460px"
		:event-bus="modalBus"
		@enter="onSubmit"
	>
		<template #content>
			<div>
				<div v-if="isPending">
					<n8n-text color="text-base">{{
						$locale.baseText('settings.users.confirmUserDeletion')
					}}</n8n-text>
				</div>
				<div v-else :class="$style.content">
					<div>
						<n8n-text color="text-base">{{
							$locale.baseText('settings.users.confirmDataHandlingAfterDeletion')
						}}</n8n-text>
					</div>
					<el-radio
						v-model="operation"
						label="transfer"
						@update:model-value="operation = 'transfer'"
					>
						<n8n-text color="text-dark">{{
							$locale.baseText('settings.users.transferWorkflowsAndCredentials')
						}}</n8n-text>
					</el-radio>
					<div v-if="operation === 'transfer'" :class="$style.optionInput">
						<n8n-text color="text-dark">{{
							$locale.baseText('settings.users.transferWorkflowsAndCredentials.user')
						}}</n8n-text>
						<ProjectSharing
							v-model="selectedProject"
							class="pt-2xs"
							:projects="projects"
							:placeholder="
								$locale.baseText('settings.users.transferWorkflowsAndCredentials.placeholder')
							"
						/>
					</div>
					<el-radio v-model="operation" label="delete" @update:model-value="operation = 'delete'">
						<n8n-text color="text-dark">{{
							$locale.baseText('settings.users.deleteWorkflowsAndCredentials')
						}}</n8n-text>
					</el-radio>
					<div
						v-if="operation === 'delete'"
						:class="$style.optionInput"
						data-test-id="delete-data-input"
					>
						<n8n-input-label :label="$locale.baseText('settings.users.deleteConfirmationMessage')">
							<n8n-input
								v-model="deleteConfirmText"
								:placeholder="$locale.baseText('settings.users.deleteConfirmationText')"
							/>
						</n8n-input-label>
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<n8n-button
				:loading="loading"
				:disabled="!enabled"
				:label="$locale.baseText('settings.users.delete')"
				float="right"
				data-test-id="confirm-delete-user-button"
				@click="onSubmit"
			/>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useToast } from '@/composables/useToast';
import Modal from '@/components/Modal.vue';
import type { IUser } from '@/Interface';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { createEventBus } from 'n8n-design-system/utils';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectListItem, ProjectSharingData } from '@/types/projects.types';
import ProjectSharing from '@/components/Projects/ProjectSharing.vue';

export default defineComponent({
	name: 'DeleteUserModal',
	components: {
		Modal,
		ProjectSharing,
	},
	props: {
		modalName: {
			type: String,
		},
		activeId: {
			type: String,
		},
	},
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		return {
			modalBus: createEventBus(),
			loading: false,
			operation: '',
			deleteConfirmText: '',
			selectedProject: null as ProjectSharingData | null,
		};
	},
	computed: {
		...mapStores(useUsersStore, useProjectsStore),
		userToDelete(): IUser | null {
			if (!this.activeId) return null;
			return this.usersStore.getUserById(this.activeId);
		},
		isPending(): boolean {
			return this.userToDelete ? this.userToDelete && !this.userToDelete.firstName : false;
		},
		title(): string {
			const user =
				(this.userToDelete && (this.userToDelete.fullName || this.userToDelete.email)) || '';
			return this.$locale.baseText('settings.users.deleteUser', { interpolate: { user } });
		},
		enabled(): boolean {
			if (this.isPending) {
				return true;
			}
			if (
				this.operation === 'delete' &&
				this.deleteConfirmText === this.$locale.baseText('settings.users.deleteConfirmationText')
			) {
				return true;
			}

			if (this.operation === 'transfer' && this.selectedProject) {
				return true;
			}

			return false;
		},
		projects(): ProjectListItem[] {
			return this.projectsStore.personalProjects.filter(
				(project) =>
					project.name !==
					`${this.userToDelete?.firstName} ${this.userToDelete?.lastName} <${this.userToDelete?.email}>`,
			);
		},
	},
	async beforeMount() {
		await this.projectsStore.getAllProjects();
	},
	methods: {
		async onSubmit() {
			try {
				if (!this.enabled) {
					return;
				}

				this.loading = true;

				const params = { id: this.activeId } as { id: string; transferId?: string };
				if (this.operation === 'transfer' && this.selectedProject) {
					params.transferId = this.selectedProject.id;
				}

				await this.usersStore.deleteUser(params);

				let message = '';
				if (params.transferId) {
					const transferProject = this.projects.find((project) => project.id === params.transferId);
					if (transferProject) {
						message = this.$locale.baseText('settings.users.transferredToUser', {
							interpolate: { projectName: transferProject.name ?? '' },
						});
					}
				}

				this.showMessage({
					type: 'success',
					title: this.$locale.baseText('settings.users.userDeleted'),
					message,
				});

				this.modalBus.emit('close');
			} catch (error) {
				this.showError(error, this.$locale.baseText('settings.users.userDeletedError'));
			}
			this.loading = false;
		},
	},
});
</script>

<style lang="scss" module>
.content {
	padding-bottom: var(--spacing-2xs);
	> * {
		margin-bottom: var(--spacing-s);
	}
}

.innerContent {
	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.optionInput {
	padding-left: var(--spacing-l);
}
</style>
