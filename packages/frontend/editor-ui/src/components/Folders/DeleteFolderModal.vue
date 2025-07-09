<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useToast } from '@/composables/useToast';
import Modal from '@/components/Modal.vue';
import { createEventBus, type EventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { useFoldersStore } from '@/stores/folders.store';
import { useRoute } from 'vue-router';
import { useProjectsStore } from '@/stores/projects.store';
import { ProjectTypes } from '@/types/projects.types';
import type { ChangeLocationSearchResult } from '@/Interface';

const props = defineProps<{
	modalName: string;
	activeId: string;
	data: {
		workflowListEventBus: EventBus;
		content: {
			workflowCount: number;
			subFolderCount: number;
		};
	};
}>();

const modalBus = createEventBus();
const { showMessage, showError } = useToast();
const i18n = useI18n();
const route = useRoute();

const foldersStore = useFoldersStore();
const projectsStore = useProjectsStore();

const loading = ref(false);
const operation = ref('');
const deleteConfirmText = ref('');
const selectedFolder = ref<ChangeLocationSearchResult | null>(null);

const folderToDelete = computed(() => {
	if (!props.activeId) return null;
	return foldersStore.breadcrumbsCache[props.activeId];
});

const isPending = computed(() => {
	return selectedFolder.value ? !selectedFolder.value.name : false;
});

const title = computed(() => {
	const folderName = folderToDelete.value?.name ?? '';
	return i18n.baseText('folders.delete.confirm.title', { interpolate: { folderName } });
});

const enabled = computed(() => {
	if (isPending.value) {
		return true;
	}
	if (
		operation.value === 'delete' &&
		deleteConfirmText.value ===
			i18n.baseText('folders.delete.typeToConfirm', {
				interpolate: { folderName: folderToDelete.value?.name ?? '' },
			})
	) {
		return true;
	}
	if (operation.value === 'transfer' && selectedFolder.value) {
		return true;
	}
	return false;
});

const currentProjectName = computed(() => {
	const currentProject = projectsStore.currentProject;
	if (currentProject?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return currentProject?.name;
});

const folderContentWarningMessage = computed(() => {
	const folderCount = props.data.content.subFolderCount ?? 0;
	const workflowCount = props.data.content.workflowCount ?? 0;

	let folderText = '';
	let workflowText = '';
	if (folderCount > 0) {
		folderText = i18n.baseText('folder.count', { interpolate: { count: folderCount } });
	}
	if (workflowCount > 0) {
		workflowText = i18n.baseText('workflow.count', { interpolate: { count: workflowCount } });
	}
	if (folderCount > 0 && workflowCount > 0) {
		folderText += ` ${i18n.baseText('folder.and.workflow.separator')} `;
	}
	return i18n.baseText('folder.delete.modal.confirmation', {
		interpolate: {
			folders: folderText,
			workflows: workflowText,
		},
	});
});

async function onSubmit() {
	if (!enabled.value) {
		return;
	}
	try {
		loading.value = true;

		const newParentId =
			selectedFolder.value?.resource === 'project' ? '0' : (selectedFolder.value?.id ?? undefined);

		await foldersStore.deleteFolder(route.params.projectId as string, props.activeId, newParentId);

		let message = '';
		if (selectedFolder.value) {
			message = i18n.baseText('folders.transfer.confirm.message', {
				interpolate: { folderName: selectedFolder.value.name ?? '' },
			});
		}
		showMessage({
			type: 'success',
			title: i18n.baseText('folders.delete.success.message'),
			message,
		});
		props.data.workflowListEventBus.emit('folder-deleted', {
			folderId: props.activeId,
			workflowCount: props.data.content.workflowCount,
			folderCount: props.data.content.subFolderCount,
		});
		modalBus.emit('close');
	} catch (error) {
		showError(error, i18n.baseText('folders.delete.error.message'));
	} finally {
		loading.value = false;
	}
}

const onFolderSelected = (payload: ChangeLocationSearchResult) => {
	selectedFolder.value = payload;
};
</script>

<template>
	<Modal
		:name="modalName"
		:title="title"
		:center="true"
		width="600"
		:event-bus="modalBus"
		@enter="onSubmit"
	>
		<template #content>
			<div>
				<div v-if="isPending">
					<n8n-text color="text-base">{{
						i18n.baseText('folders.delete.confirm.message')
					}}</n8n-text>
				</div>
				<div v-else :class="$style.content">
					<div>
						<n8n-text color="text-base">{{ folderContentWarningMessage }}</n8n-text>
					</div>
					<el-radio
						v-model="operation"
						data-test-id="transfer-content-radio"
						label="transfer"
						@update:model-value="operation = 'transfer'"
					>
						<n8n-text v-if="currentProjectName">{{
							i18n.baseText('folders.transfer.action', {
								interpolate: { projectName: currentProjectName },
							})
						}}</n8n-text>
						<n8n-text v-else color="text-dark">{{
							i18n.baseText('folders.transfer.action.noProject')
						}}</n8n-text>
					</el-radio>
					<div v-if="operation === 'transfer'" :class="$style.optionInput">
						<n8n-text color="text-dark">{{
							i18n.baseText('folders.transfer.selectFolder')
						}}</n8n-text>
						<MoveToFolderDropdown
							v-if="projectsStore.currentProject"
							:selected-location="selectedFolder"
							:selected-project-id="projectsStore.currentProject?.id"
							:current-project-id="projectsStore.currentProject?.id"
							:current-folder-id="props.activeId"
							:parent-folder-id="folderToDelete?.parentFolder"
							@location:selected="onFolderSelected"
						/>
					</div>
					<el-radio
						v-model="operation"
						data-test-id="delete-content-radio"
						label="delete"
						@update:model-value="operation = 'delete'"
					>
						<n8n-text color="text-dark">{{ i18n.baseText('folders.delete.action') }}</n8n-text>
					</el-radio>
					<div
						v-if="operation === 'delete'"
						:class="$style.optionInput"
						data-test-id="delete-data-input"
					>
						<n8n-input-label
							:label="
								i18n.baseText('folders.delete.confirmation.message', {
									interpolate: { folderName: folderToDelete?.name ?? '' },
								})
							"
						>
							<n8n-input
								v-model="deleteConfirmText"
								data-test-id="delete-data-input"
								:placeholder="
									i18n.baseText('folders.delete.typeToConfirm', {
										interpolate: { folderName: folderToDelete?.name ?? '' },
									})
								"
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
				:label="i18n.baseText('generic.delete')"
				float="right"
				data-test-id="confirm-delete-folder-button"
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

.folder-select-item {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
}
</style>
