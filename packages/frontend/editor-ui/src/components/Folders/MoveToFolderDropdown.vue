<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { ChangeLocationSearchResult } from '@/Interface';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';
import { ProjectTypes } from '@/types/projects.types';
import { N8nSelect } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';

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
	onOpen: () => {},
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

const fetchAvailableLocations = async (query?: string) => {
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
	// Finally always add project root to the results (if folder is not already in root)
	if (projectName.value && props.parentFolderId !== '') {
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
			path: [],
		});
	}
	loading.value = false;
};

watch(
	() => [props.currentProjectId, props.currentFolderId, props.parentFolderId],
	() => {
		availableLocations.value = [];
		void fetchAvailableLocations();
	},
	{ immediate: true },
);

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

function focusOnInput() {
	// To make the dropdown automatically open focused and positioned correctly
	// we must wait till the modal opening animation is done. ElModal triggers an 'opened' event
	// when the animation is done, and once that happens, we can focus on the input.
	moveFolderDropdown.value?.focusOnInput();
}

defineExpose({
	focusOnInput,
});

const separator = computed(() => {
	return '/';
});
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
			:placeholder="i18n.baseText('folders.move.modal.folder.placeholder')"
			:no-data-text="i18n.baseText('folders.move.modal.folder.noData.label')"
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
					<ul :class="$style.list">
						<li v-if="location.resource === 'project'" :class="$style.current">
							{{ location.name }}
						</li>
						<li v-if="location.path.length" :class="$style.separator">
							{{ separator }}
						</li>
						<template v-for="(fragment, index) in location.path" :key="`${location.id}-${index}`">
							<li
								:class="{
									[$style.item]: true,
									[$style.current]: index === location.path.length - 1,
								}"
								:title="fragment"
								:data-resourceid="fragment"
								data-test-id="breadcrumbs-item"
								data-target="folder-breadcrumb-item"
							>
								<n8n-text>{{ fragment }}</n8n-text>
							</li>
							<li v-if="index !== location.path.length - 1" :class="$style.separator">
								{{ separator }}
							</li>
						</template>
					</ul>
				</div>
			</N8nOption>
		</N8nSelect>
	</div>
</template>

<style module lang="scss">
.move-folder-dropdown {
	display: flex;
	padding-top: var(--spacing-2xs) !important;
}

.folder-select-item {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
	max-width: 90%;
	overflow: hidden;
	white-space: nowrap;
}

.list {
	display: flex;
	list-style: none;
	align-items: center;
}

li {
	padding: var(--spacing-4xs) var(--spacing-5xs) var(--spacing-5xs);
}

.item,
.item * {
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	color: var(--color-text-light);
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-xsmall);
}

.item {
	max-width: var(--spacing-4xl);
}

.item.current span {
	color: var(--color-text-dark);
}

.separator {
	font-size: var(--font-size-s);
	color: var(--color-foreground-light);
}
</style>
