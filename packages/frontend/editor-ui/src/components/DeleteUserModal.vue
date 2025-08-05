<script lang="ts" setup>
import { ref, computed, onBeforeMount } from 'vue';
import { useToast } from '@/composables/useToast';
import Modal from '@/components/Modal.vue';
import ProjectSharing from '@/components/Projects/ProjectSharing.vue';
import { useUsersStore } from '@/stores/users.store';
import { useProjectsStore } from '@/stores/projects.store';
import { createEventBus } from '@n8n/utils/event-bus';
import type { ProjectSharingData } from '@/types/projects.types';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	modalName: string;
	data: {
		userId: string;
		afterDelete?: () => Promise<void>;
	};
}>();

const modalBus = createEventBus();
const loading = ref(false);
const operation = ref('');
const deleteConfirmText = ref('');
const selectedProject = ref<ProjectSharingData | null>(null);

const i18n = useI18n();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();

const userToDelete = computed(() => {
	if (!props.data?.userId) return null;

	return usersStore.usersList.state.items.find((user) => user.id === props.data.userId);
});

const isPending = computed(() => !userToDelete.value?.firstName);

const title = computed(() => {
	const user =
		userToDelete.value?.firstName && userToDelete.value.lastName
			? `${userToDelete.value.firstName} ${userToDelete.value.lastName}`
			: (userToDelete.value?.email ?? '');

	return i18n.baseText('settings.users.deleteUser', { interpolate: { user } });
});

const enabled = computed(() => {
	if (isPending.value) {
		return true;
	}

	if (
		operation.value === 'delete' &&
		deleteConfirmText.value === i18n.baseText('settings.users.deleteConfirmationText')
	) {
		return true;
	}

	return !!(operation.value === 'transfer' && selectedProject.value);
});

const projects = computed(() => {
	return projectsStore.projects.filter(
		(project) =>
			project.name !==
			`${userToDelete.value?.firstName} ${userToDelete.value?.lastName} <${userToDelete.value?.email}>`,
	);
});

onBeforeMount(async () => {
	await projectsStore.getAllProjects();
});

const { showMessage, showError } = useToast();

async function onSubmit() {
	if (!enabled.value) {
		return;
	}

	try {
		loading.value = true;

		const params = { id: props.data.userId } as { id: string; transferId?: string };
		if (operation.value === 'transfer' && selectedProject.value) {
			params.transferId = selectedProject.value.id;
		}

		await usersStore.deleteUser(params);

		let message = '';
		if (params.transferId) {
			const transferProject = projects.value.find((project) => project.id === params.transferId);
			if (transferProject) {
				message = i18n.baseText('settings.users.transferredToUser', {
					interpolate: { projectName: transferProject.name ?? '' },
				});
			}
		}

		showMessage({
			type: 'success',
			title: i18n.baseText('settings.users.userDeleted'),
			message,
		});

		await props.data.afterDelete?.();
		modalBus.emit('close');
	} catch (error) {
		showError(error, i18n.baseText('settings.users.userDeletedError'));
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<Modal
		:name="modalName"
		:title="title"
		:center="true"
		width="520"
		:event-bus="modalBus"
		@enter="onSubmit"
	>
		<template #content>
			<div>
				<div v-if="isPending">
					<n8n-text color="text-base">{{
						i18n.baseText('settings.users.confirmUserDeletion')
					}}</n8n-text>
				</div>
				<div v-else :class="$style.content">
					<div>
						<n8n-text color="text-base">{{
							i18n.baseText('settings.users.confirmDataHandlingAfterDeletion')
						}}</n8n-text>
					</div>
					<el-radio
						v-model="operation"
						label="transfer"
						@update:model-value="operation = 'transfer'"
					>
						<n8n-text color="text-dark">{{
							i18n.baseText('settings.users.transferWorkflowsAndCredentials')
						}}</n8n-text>
					</el-radio>
					<div v-if="operation === 'transfer'" :class="$style.optionInput">
						<n8n-text color="text-dark">{{
							i18n.baseText('settings.users.transferWorkflowsAndCredentials.user')
						}}</n8n-text>
						<ProjectSharing
							v-model="selectedProject"
							class="pt-2xs"
							:projects="projects"
							:placeholder="
								i18n.baseText('settings.users.transferWorkflowsAndCredentials.placeholder')
							"
						/>
					</div>
					<el-radio v-model="operation" label="delete" @update:model-value="operation = 'delete'">
						<n8n-text color="text-dark">{{
							i18n.baseText('settings.users.deleteWorkflowsAndCredentials')
						}}</n8n-text>
					</el-radio>
					<div
						v-if="operation === 'delete'"
						:class="$style.optionInput"
						data-test-id="delete-data-input"
					>
						<n8n-input-label :label="i18n.baseText('settings.users.deleteConfirmationMessage')">
							<n8n-input
								v-model="deleteConfirmText"
								:placeholder="i18n.baseText('settings.users.deleteConfirmationText')"
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
				:label="i18n.baseText('settings.users.delete')"
				float="right"
				data-test-id="confirm-delete-user-button"
				@click="onSubmit"
			/>
		</template>
	</Modal>
</template>

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
