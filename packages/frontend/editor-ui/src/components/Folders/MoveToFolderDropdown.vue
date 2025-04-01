<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { ChangeLocationSearchResult } from '@/Interface';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';
import { type ProjectIcon as ItemProjectIcon, ProjectTypes } from '@/types/projects.types';
import { N8nSelect } from '@n8n/design-system';
import { computed, ref } from 'vue';

/**
 * This component is used to select a folder to move a resource (folder or workflow) to.
 * Based on the provided resource type, it fetches the available folders and displays them in a dropdown.
 * For folders, it filters out current folder parent and all off it's children (done in the back-end)
 * For workflows, it only filters out the current workflows's folder.
 */

type Props = {
	currentProjectId: string;
	currentFolderId?: string;
	parentFolderId?: string;
};

const props = withDefaults(defineProps<Props>(), {
	currentFolderId: '',
	parentFolderId: '',
});

const emit = defineEmits<{
	'location:selected': [value: { id: string; name: string; type: 'folder' | 'project' }];
}>();

const i18n = useI18n();

const foldersStore = useFoldersStore();
const projectsStore = useProjectsStore();

const moveFolderDropdown = ref<InstanceType<typeof N8nSelect>>();
const selectedFolderId = ref<string | null>(null);
const availableLocations = ref<ChangeLocationSearchResult[]>([]);
const loading = ref(false);

const currentProject = computed(() => {
	return projectsStore.currentProject;
});

const projectName = computed(() => {
	if (currentProject.value?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return currentProject.value?.name;
});

const projectIcon = computed<ItemProjectIcon>(() => {
	const defaultIcon: ItemProjectIcon = { type: 'icon', value: 'layer-group' };
	if (currentProject.value?.type === ProjectTypes.Personal) {
		return { type: 'icon', value: 'user' };
	} else if (currentProject.value?.type === ProjectTypes.Team) {
		return currentProject.value.icon ?? defaultIcon;
	}
	return defaultIcon;
});

const fetchAvailableLocations = async (query?: string) => {
	if (!query) {
		availableLocations.value = [];
		return;
	}
	loading.value = true;
	const folders = await foldersStore.fetchFoldersAvailableForMove(
		props.currentProjectId,
		props.currentFolderId,
		{ name: query ?? undefined },
	);
	if (!props.parentFolderId) {
		availableLocations.value = folders;
	} else {
		availableLocations.value = folders.filter((folder) => folder.id !== props.parentFolderId);
	}
	// Finally add project root if project name contains query (only if folder is not already in root)
	if (
		projectName.value &&
		projectName.value.toLowerCase().includes(query.toLowerCase()) &&
		props.parentFolderId !== ''
	) {
		availableLocations.value.unshift({
			id: props.currentProjectId,
			name: i18n.baseText('folders.move.project.root.name', {
				interpolate: { projectName: projectName.value },
			}),
			resource: 'project',
			createdAt: '',
			updatedAt: '',
			workflowCount: 0,
			subFolderCount: 0,
		});
	}
	loading.value = false;
};

const onFolderSelected = (folderId: string) => {
	const selectedFolder = availableLocations.value.find((folder) => folder.id === folderId);
	if (!selectedFolder) {
		return;
	}
	emit('location:selected', {
		id: folderId,
		name: selectedFolder.name,
		type: selectedFolder.resource,
	});
};
</script>

<template>
	<div :class="$style['move-folder-dropdown']" data-test-id="move-to-folder-dropdown">
		<N8nSelect
			ref="moveFolderDropdown"
			v-model="selectedFolderId"
			:filterable="true"
			:remote="true"
			:remote-method="fetchAvailableLocations"
			:loading="loading"
			:placeholder="i18n.baseText('folders.move.modal.select.placeholder')"
			:no-data-text="i18n.baseText('folders.move.modal.no.data.label')"
			option-label="name"
			option-value="id"
			@update:model-value="onFolderSelected"
		>
			<template #prefix>
				<N8nIcon icon="search" />
			</template>
			<N8nOption
				v-for="location in availableLocations"
				:key="location.id"
				:value="location.id"
				:label="location.name"
				data-test-id="move-to-folder-option"
			>
				<div :class="$style['folder-select-item']">
					<ProjectIcon
						v-if="location.resource === 'project' && currentProject"
						:class="$style['folder-icon']"
						:icon="projectIcon"
						:border-less="true"
						size="mini"
						color="text-dark"
					/>
					<n8n-icon v-else :class="$style['folder-icon']" icon="folder" />
					<span :class="$style['folder-name']"> {{ location.name }}</span>
				</div>
			</N8nOption>
		</N8nSelect>
	</div>
</template>

<style module lang="scss">
.move-folder-dropdown {
	display: flex;
}

.folder-select-item {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
	max-width: 90%;
	overflow: hidden;
	white-space: nowrap;

	.folder-name {
		text-overflow: ellipsis;
		overflow: hidden;
	}
}
</style>
