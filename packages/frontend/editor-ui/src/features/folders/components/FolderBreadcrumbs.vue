<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '@/features/projects/projects.store';
import { ProjectTypes } from '@/features/projects/projects.types';
import type { UserAction } from '@n8n/design-system/types';
import { type PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useFoldersStore } from '../folders.store';
import type { FolderPathItem, FolderShortInfo } from '../folders.types';
import type { IUser } from 'n8n-workflow';
import ProjectBreadcrumb from '@/features/folders/components/ProjectBreadcrumb.vue';

import { N8nActionToggle, N8nBreadcrumbs } from '@n8n/design-system';
type Props = {
	// Current folder can be null when showing breadcrumbs for workflows in project root
	currentFolder?: FolderShortInfo | null;
	actions?: Array<UserAction<IUser>>;
	hiddenItemsTrigger?: 'hover' | 'click';
	currentFolderAsLink?: boolean;
	visibleLevels?: 1 | 2;
};

const props = withDefaults(defineProps<Props>(), {
	currentFolder: null,
	actions: () => [],
	hiddenItemsTrigger: 'click',
	currentFolderAsLink: false,
	visibleLevels: 1,
});

const emit = defineEmits<{
	itemSelected: [item: PathItem];
	action: [action: string];
	itemDrop: [item: PathItem];
	projectDrop: [id: string, name: string];
}>();

const i18n = useI18n();

const projectsStore = useProjectsStore();
const foldersStore = useFoldersStore();

const hiddenBreadcrumbsItemsAsync = ref<Promise<PathItem[]>>(new Promise(() => {}));

// This will be used to filter out items that are already visible in the breadcrumbs
const visibleIds = ref<Set<string>>(new Set());

// For shared context we do not show any folder breadcrumbs, only project badge
const isSharedContext = computed(() => projectsStore.projectNavActiveId === 'shared');

const currentProject = computed(() => {
	// For shared context, return undefined to show "Shared with you"
	if (isSharedContext.value) {
		return undefined;
	}
	// Otherwise, fallback to personal project for new workflows
	return projectsStore.currentProject ?? projectsStore.personalProject ?? undefined;
});

const projectName = computed(() => {
	if (!currentProject.value) {
		return isSharedContext.value ? i18n.baseText('projects.menu.shared') : '';
	}

	if (currentProject.value.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}

	return currentProject.value.name;
});

const isDragging = computed(() => {
	return foldersStore.draggedElement !== null;
});

const hasMoreItems = computed(() => {
	return visibleBreadcrumbsItems.value[0]?.parentFolder !== undefined;
});

const visibleBreadcrumbsItems = computed<FolderPathItem[]>(() => {
	visibleIds.value.clear();
	if (!props.currentFolder || isSharedContext.value) return [];

	const items: FolderPathItem[] = [];
	// Only show parent folder if we are showing 2 levels of visible breadcrumbs
	const parent =
		props.visibleLevels === 2
			? foldersStore.getCachedFolder(props.currentFolder.parentFolder ?? '')
			: null;

	if (parent) {
		items.push({
			id: parent.id,
			label: parent.name,
			href: `/projects/${currentProject.value?.id}/folders/${parent.id}/workflows`,
			parentFolder: parent.parentFolder,
		});
		visibleIds.value.add(parent.id);
	}
	items.push({
		id: props.currentFolder.id,
		label: props.currentFolder.name,
		parentFolder: props.currentFolder.parentFolder,
		href: props.currentFolderAsLink
			? `/projects/${currentProject.value?.id}/folders/${props.currentFolder.id}/workflows`
			: undefined,
	});
	if (currentProject.value) {
		visibleIds.value.add(currentProject.value.id);
	}
	visibleIds.value.add(props.currentFolder.id);

	return items;
});

const fetchHiddenBreadCrumbsItems = async () => {
	if (
		!projectName.value ||
		!props.currentFolder?.parentFolder ||
		isSharedContext.value ||
		!currentProject.value
	) {
		hiddenBreadcrumbsItemsAsync.value = Promise.resolve([]);
	} else {
		try {
			const loadedItems = foldersStore.getHiddenBreadcrumbsItems(
				{ id: currentProject.value.id, name: projectName.value },
				props.currentFolder.parentFolder,
				{ addLinks: true },
			);
			const filtered = (await loadedItems).filter((item) => !visibleIds.value.has(item.id));
			hiddenBreadcrumbsItemsAsync.value = Promise.resolve(filtered);
		} catch (error) {
			hiddenBreadcrumbsItemsAsync.value = Promise.resolve([]);
		}
	}
};

const onItemSelect = (item: PathItem) => {
	emit('itemSelected', item);
};

const onAction = (action: string) => {
	emit('action', action);
};

const onProjectDrop = () => {
	if (!currentProject.value?.name) {
		return;
	}
	emit('projectDrop', currentProject.value.id, currentProject.value.name);
};

const onProjectHover = () => {
	if (!isDragging.value || !currentProject.value?.name) {
		return;
	}
	foldersStore.activeDropTarget = {
		type: 'project',
		id: currentProject.value?.id,
		name: currentProject.value?.name,
	};
};

const onItemHover = (item: PathItem) => {
	if (!isDragging.value) {
		return;
	}
	foldersStore.activeDropTarget = {
		type: 'folder',
		id: item.id,
		name: item.label,
	};
};

// Watch for changes in the current folder to fetch hidden breadcrumbs items
watch(
	() => props.currentFolder?.parentFolder,
	() => {
		// Updating the promise will invalidate breadcrumbs component internal cache
		hiddenBreadcrumbsItemsAsync.value = new Promise(() => {});
	},
	{ immediate: true },
);

// Resolve the promise to an empty array when the component is unmounted
// to avoid having dangling promises
onBeforeUnmount(() => {
	hiddenBreadcrumbsItemsAsync.value = Promise.resolve([]);
});
</script>
<template>
	<div
		:class="{ [$style.container]: true, [$style['dragging']]: isDragging }"
		data-test-id="folder-breadcrumbs"
	>
		<N8nBreadcrumbs
			v-if="visibleBreadcrumbsItems.length"
			v-model:drag-active="isDragging"
			:items="visibleBreadcrumbsItems"
			:highlight-last-item="false"
			:path-truncated="hasMoreItems"
			:hidden-items="hasMoreItems ? hiddenBreadcrumbsItemsAsync : undefined"
			:hidden-items-trigger="props.hiddenItemsTrigger"
			@tooltip-opened="fetchHiddenBreadCrumbsItems"
			@item-selected="onItemSelect"
			@item-hover="onItemHover"
			@item-drop="emit('itemDrop', $event)"
		>
			<template v-if="currentProject" #prepend>
				<ProjectBreadcrumb
					:current-project="currentProject"
					:is-dragging="isDragging"
					@project-drop="onProjectDrop"
					@project-hover="onProjectHover"
				/>
			</template>
			<template #append>
				<slot name="append"></slot>
			</template>
		</N8nBreadcrumbs>
		<!-- If there is no current folder, just show project badge -->
		<div v-else-if="currentProject || isSharedContext" :class="$style['home-project']">
			<ProjectBreadcrumb
				:current-project="currentProject"
				:is-shared="isSharedContext"
				:is-dragging="isDragging"
				@project-drop="onProjectDrop"
				@project-hover="onProjectHover"
			/>
			<slot name="append"></slot>
		</div>
		<div v-else>
			<slot name="append"></slot>
		</div>
		<N8nActionToggle
			v-if="visibleBreadcrumbsItems && actions?.length"
			:actions="actions"
			:class="$style['action-toggle']"
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
}

.action-toggle {
	span[role='button'] {
		color: var(--color--text);
	}
}
</style>
