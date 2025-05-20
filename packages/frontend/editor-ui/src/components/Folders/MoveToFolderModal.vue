<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { MOVE_FOLDER_MODAL_KEY } from '@/constants';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useUIStore } from '@/stores/ui.store';
import { type EventBus, createEventBus } from '@n8n/utils/event-bus';
import type { ProjectListItem, ProjectSharingData } from '@/types/projects.types';
import { computed, ref, watch } from 'vue';
import MoveToFolderDropdown from './MoveToFolderDropdown.vue';

/**
 * This modal is used to move a resource (folder or workflow) to a different folder.
 */

type Props = {
	modalName: string;
	data: {
		resourceType: 'folder' | 'workflow';
		resource: {
			id: string;
			name: string;
			parentFolderId?: string;
		};
		workflowListEventBus: EventBus;
	};
};

const props = defineProps<Props>();

const i18n = useI18n();
const modalBus = createEventBus();
const moveToFolderDropdown = ref<InstanceType<typeof MoveToFolderDropdown>>();

const foldersStore = useFoldersStore();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();

const selectedFolder = ref<{ id: string; name: string } | null>(null);
const selectedProject = ref<ProjectSharingData | null>(projectsStore.currentProject ?? null);
const workflowCount = ref(0);
const subFolderCount = ref(0);

const projects = computed<ProjectListItem[]>(() => {
	return projectsStore.projects;
});

const title = computed(() => {
	return i18n.baseText('folders.move.modal.title', {
		interpolate: { folderName: props.data.resource.name },
	});
});

const currentFolder = computed(() => {
	if (props.data.resourceType === 'workflow') {
		return;
	}
	return {
		id: props.data.resource.id,
		name: props.data.resource.name,
	};
});

const fetchCurrentFolderContents = async () => {
	if (!currentFolder.value || !projectsStore.currentProject) {
		return;
	}

	const { totalWorkflows, totalSubFolders } = await foldersStore.fetchFolderContent(
		projectsStore.currentProject.id,
		currentFolder.value.id,
	);

	workflowCount.value = totalWorkflows;
	subFolderCount.value = totalSubFolders;
};

watch(
	() => [currentFolder, selectedProject],
	() => {
		void fetchCurrentFolderContents();
	},
	{ immediate: true },
);

const onFolderSelected = (payload: { id: string; name: string; type: string }) => {
	selectedFolder.value = payload;
};

const onSubmit = () => {
	if (props.data.resourceType === 'folder') {
		props.data.workflowListEventBus.emit('folder-moved', {
			newParent: selectedFolder.value,
			folder: { id: props.data.resource.id, name: props.data.resource.name },
		});
	} else {
		props.data.workflowListEventBus.emit('workflow-moved', {
			newParent: selectedFolder.value,
			workflow: {
				id: props.data.resource.id,
				name: props.data.resource.name,
				oldParentId: props.data.resource.parentFolderId,
			},
		});
	}
	uiStore.closeModal(MOVE_FOLDER_MODAL_KEY);
};

modalBus.on('opened', () => {
	moveToFolderDropdown.value?.focusOnInput();
});

const descriptionMessage = computed(() => {
	let folderText = '';
	let workflowText = '';
	if (subFolderCount.value > 0) {
		folderText = i18n.baseText('folders.move.modal.folder.count', {
			interpolate: { count: subFolderCount.value },
		});
	}
	if (workflowCount.value > 0) {
		workflowText = i18n.baseText('folders.move.modal.workflow.count', {
			interpolate: { count: workflowCount.value },
		});
	}
	if (subFolderCount.value > 0 && workflowCount.value > 0) {
		folderText += ` ${i18n.baseText('folder.and.workflow.separator')} `;
	}
	return i18n.baseText('folders.move.modal.description', {
		interpolate: {
			folders: folderText,
			workflows: workflowText,
		},
	});
});

// const projectIcon = computed<ItemProjectIcon>(() => {
// 	const defaultIcon: ItemProjectIcon = { type: 'icon', value: 'layer-group' };
// 	if (currentProject.value?.type === ProjectTypes.Personal) {
// 		return { type: 'icon', value: 'user' };
// 	} else if (currentProject.value?.type === ProjectTypes.Team) {
// 		return currentProject.value.icon ?? defaultIcon;
// 	}
// 	return defaultIcon;
// });
</script>

<template>
	<Modal
		:name="modalName"
		:title="title"
		width="500"
		:class="$style.container"
		:event-bus="modalBus"
	>
		<template #content>
			<p
				v-if="props.data.resourceType === 'folder' && (workflowCount > 0 || subFolderCount > 0)"
				:class="$style.description"
				data-test-id="move-folder-description"
			>
				{{ descriptionMessage }}
			</p>
			<div :class="$style.project">
				<n8n-text color="text-dark">
					{{ i18n.baseText('folders.move.modal.project.label') }}
				</n8n-text>
				<ProjectSharing
					v-model="selectedProject"
					class="pt-2xs"
					:projects="projects"
					:placeholder="i18n.baseText('folders.move.modal.project.placeholder')"
				/>
			</div>
			<div>
				<n8n-text color="text-dark">{{
					i18n.baseText('folders.move.modal.folder.label')
				}}</n8n-text>
				<MoveToFolderDropdown
					v-if="selectedProject"
					ref="moveToFolderDropdown"
					:current-folder-id="currentFolder?.id"
					:current-project-id="selectedProject.id"
					:parent-folder-id="props.data.resource.parentFolderId"
					:exclude-only-parent="props.data.resourceType === 'workflow'"
					@location:selected="onFolderSelected"
				/>
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<n8n-button
					type="secondary"
					:label="i18n.baseText('generic.cancel')"
					float="right"
					data-test-id="cancel-move-folder-button"
					@click="close"
				/>
				<n8n-button
					:disabled="!selectedFolder"
					:label="i18n.baseText('folders.move.modal.confirm')"
					float="right"
					data-test-id="confirm-move-folder-button"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	h1 {
		max-width: 90%;
	}
}

.description {
	font-size: var(--font-size-s);
	margin: var(--spacing-s) 0;
}

.project {
	margin-bottom: var(--spacing-s);
}

.footer {
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: flex-end;
}
</style>
