<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from '@/composables/useToast';
import Modal from '@/components/Modal.vue';
import { createEventBus, type EventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@/composables/useI18n';
import { useFoldersStore } from '@/stores/folders.store';
import { useRoute } from 'vue-router';
import type { FolderListItem } from '@/Interface';

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

const loading = ref(false);
const operation = ref('');
const deleteConfirmText = ref('');
const selectedFolderId = ref<string | null>(null);
const projectFolders = ref<FolderListItem[]>([]);

const currentFolder = computed(() => {
	return projectFolders.value.find((folder) => folder.id === props.activeId);
});

// Available folders to transfer are all folders except the current folder, it's parent and its children
const availableFolders = computed(() => {
	return projectFolders.value.filter(
		(folder) =>
			folder.id !== props.activeId &&
			folder.parentFolder?.id !== props.activeId &&
			folder.id !== currentFolder.value?.parentFolder?.id,
	);
});

const folderToDelete = computed(() => {
	if (!props.activeId) return null;
	return foldersStore.breadcrumbsCache[props.activeId];
});

const isPending = computed(() => {
	return folderToDelete.value ? !folderToDelete.value.name : false;
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
	if (operation.value === 'transfer' && selectedFolderId.value) {
		return true;
	}
	return false;
});

async function onSubmit() {
	if (!enabled.value) {
		return;
	}
	try {
		loading.value = true;

		await foldersStore.deleteFolder(
			route.params.projectId as string,
			props.activeId,
			selectedFolderId.value ?? undefined,
		);

		let message = '';
		if (selectedFolderId.value) {
			const selectedFolder = availableFolders.value.find(
				(folder) => folder.id === selectedFolderId.value,
			);
			message = i18n.baseText('folders.transfer.confirm.message', {
				interpolate: { folderName: selectedFolder?.name ?? '' },
			});
		}
		showMessage({
			type: 'success',
			title: i18n.baseText('folders.delete.success.message'),
			message,
		});
		props.data.workflowListEventBus.emit('folder-deleted', { folderId: props.activeId });
		modalBus.emit('close');
	} catch (error) {
		showError(error, i18n.baseText('folders.delete.error.message'));
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	projectFolders.value = await foldersStore.fetchProjectFolders(route.params.projectId as string);
});
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
						i18n.baseText('folders.delete.confirm.message')
					}}</n8n-text>
				</div>
				<div v-else :class="$style.content">
					<div>
						<n8n-text color="text-base">{{
							i18n.baseText('folder.delete.modal.confirmation')
						}}</n8n-text>
					</div>
					<el-radio
						v-model="operation"
						data-test-id="transfer-content-radio"
						label="transfer"
						@update:model-value="operation = 'transfer'"
					>
						<n8n-text color="text-dark">{{ i18n.baseText('folders.transfer.action') }}</n8n-text>
					</el-radio>
					<div v-if="operation === 'transfer'" :class="$style.optionInput">
						<n8n-text color="text-dark">{{
							i18n.baseText('folders.transfer.selectFolder')
						}}</n8n-text>
						<N8nSelect
							v-model="selectedFolderId"
							option-label="name"
							option-value="id"
							:placeholder="i18n.baseText('folders.transfer.selectFolder')"
						>
							<N8nOption
								v-for="folder in availableFolders"
								:key="folder.id"
								:value="folder.id"
								:label="folder.name"
							>
								<div :class="$style['folder-select-item']">
									<n8n-icon icon="folder" />
									<span> {{ folder.name }}</span>
								</div>
							</N8nOption>
						</N8nSelect>
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
