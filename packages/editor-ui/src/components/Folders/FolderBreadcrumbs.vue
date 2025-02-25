<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';
import { ProjectTypes } from '@/types/projects.types';
import { type UserAction } from 'n8n-design-system';
import { type PathItem } from 'n8n-design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export type FolderPathItem = PathItem & { parentFolder?: string };

type Props = {
	actions: UserAction[];
};

defineProps<Props>();

const emit = defineEmits<{
	itemSelected: [item: PathItem];
	action: [action: string];
}>();

const route = useRoute();
const i18n = useI18n();

const foldersStore = useFoldersStore();
const projectsStore = useProjectsStore();

const currentFolder = computed(() => foldersStore.currentFolderInfo);

const currentProject = computed(() => projectsStore.currentProject);

const projectName = computed(() => {
	if (currentProject.value?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return currentProject.value?.name;
});

const visibleItems = computed<FolderPathItem[]>(() => {
	if (!currentFolder.value) return [];
	const items: FolderPathItem[] = [];
	const parent = foldersStore.getCachedFolder(currentFolder.value.parentFolder ?? '');
	if (parent) {
		items.push({
			id: parent.id,
			label: parent.name,
			href: `/projects/${route.params.projectId}/folders/${parent.id}/workflows`,
			parentFolder: parent.parentFolder,
		});
	}
	items.push({
		id: currentFolder.value.id,
		label: currentFolder.value.name,
		parentFolder: parent?.parentFolder,
	});
	return items;
});

const hiddenItems = computed<FolderPathItem[]>(() => {
	const lastVisibleParent: FolderPathItem = visibleItems.value[visibleItems.value.length - 1];
	if (!lastVisibleParent) return [];
	const items: FolderPathItem[] = [];
	// Go through all the parent folders and add them to the hidden items
	let parentFolder = lastVisibleParent.parentFolder;
	while (parentFolder) {
		const parent = foldersStore.getCachedFolder(parentFolder);

		if (!parent) break;
		items.unshift({
			id: parent.id,
			label: parent.name,
			href: `/projects/${route.params.projectId}/folders/${parent.id}/workflows`,
			parentFolder: parent.parentFolder,
		});
		parentFolder = parent.parentFolder;
	}
	return items;
});

const onItemSelect = (item: PathItem) => {
	emit('itemSelected', item);
};

const onAction = (action: string) => {
	emit('action', action);
};
</script>
<template>
	<div :class="$style.container">
		<n8n-breadcrumbs
			v-if="visibleItems"
			:items="visibleItems"
			:highlight-last-item="false"
			:path-truncated="visibleItems[0].parentFolder"
			:hidden-items="hiddenItems"
			data-test-id="folder-card-breadcrumbs"
			@item-selected="onItemSelect"
		>
			<template v-if="currentProject" #prepend>
				<div :class="$style['home-project']">
					<n8n-link :to="`/projects/${currentProject.id}`">
						<N8nText size="large" color="text-base">{{ projectName }}</N8nText>
					</n8n-link>
				</div>
			</template>
		</n8n-breadcrumbs>
		<n8n-action-toggle
			v-if="visibleItems"
			:actions="actions"
			theme="dark"
			data-test-id="folder-breadcrumbs-actions"
			@action="onAction"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: center;
}

.home-project {
	display: flex;
	align-items: center;

	&:hover * {
		color: var(--color-text-dark);
	}
}
</style>
