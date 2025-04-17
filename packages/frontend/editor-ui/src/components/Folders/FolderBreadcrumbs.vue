<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useProjectsStore } from '@/stores/projects.store';
import { ProjectTypes } from '@/types/projects.types';
import type { UserAction } from '@n8n/design-system/types';
import { type PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { computed } from 'vue';
import { useFoldersStore } from '@/stores/folders.store';
import type { FolderPathItem, FolderShortInfo } from '@/Interface';
import { useRoute } from 'vue-router';

type Props = {
	// Current folder can be null when showing breadcrumbs for workflows in project root
	currentFolder?: FolderShortInfo | null;
	actions?: UserAction[];
	hiddenItemsTrigger?: 'hover' | 'click';
};

const props = withDefaults(defineProps<Props>(), {
	currentFolder: null,
	actions: () => [],
	hiddenItemsTrigger: 'click',
});

const emit = defineEmits<{
	itemSelected: [item: PathItem];
	action: [action: string];
	itemDrop: [item: PathItem];
	projectDrop: [id: string, name: string];
}>();

const i18n = useI18n();
const route = useRoute();

const projectsStore = useProjectsStore();
const foldersStore = useFoldersStore();

const currentProject = computed(() => projectsStore.currentProject);

const projectName = computed(() => {
	if (currentProject.value?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return currentProject.value?.name;
});

const isDragging = computed(() => {
	return foldersStore.draggedElement !== null;
});

const visibleBreadcrumbsItems = computed<FolderPathItem[]>(() => {
	if (!props.currentFolder) return [];

	const items: FolderPathItem[] = [];
	const parent = foldersStore.getCachedFolder(props.currentFolder.parentFolder ?? '');

	if (parent) {
		items.push({
			id: parent.id,
			label: parent.name,
			href: `/projects/${route.params.projectId}/folders/${parent.id}/workflows`,
			parentFolder: parent.parentFolder,
		});
	}
	items.push({
		id: props.currentFolder.id,
		label: props.currentFolder.name,
		parentFolder: props.currentFolder.parentFolder,
	});
	return items;
});

const hiddenBreadcrumbsItems = computed<FolderPathItem[]>(() => {
	const lastVisibleParent: FolderPathItem =
		visibleBreadcrumbsItems.value[visibleBreadcrumbsItems.value.length - 1];
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

const onProjectMouseUp = () => {
	if (!isDragging.value || !currentProject.value?.name) {
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
</script>
<template>
	<div
		:class="{ [$style.container]: true, [$style['dragging']]: isDragging }"
		data-test-id="folder-breadcrumbs"
	>
		<n8n-breadcrumbs
			v-if="visibleBreadcrumbsItems.length"
			v-model:drag-active="isDragging"
			:items="visibleBreadcrumbsItems"
			:highlight-last-item="false"
			:path-truncated="visibleBreadcrumbsItems[0]?.parentFolder"
			:hidden-items="hiddenBreadcrumbsItems"
			:hidden-items-trigger="props.hiddenItemsTrigger"
			data-test-id="folder-list-breadcrumbs"
			@item-selected="onItemSelect"
			@item-hover="onItemHover"
			@item-drop="emit('itemDrop', $event)"
		>
			<template v-if="currentProject" #prepend>
				<div
					:class="{ [$style['home-project']]: true, [$style.dragging]: isDragging }"
					data-test-id="home-project"
					@mouseenter="onProjectHover"
					@mouseup="isDragging ? onProjectMouseUp() : null"
				>
					<n8n-link :to="`/projects/${currentProject.id}`">
						<N8nText size="medium" color="text-base">{{ projectName }}</N8nText>
					</n8n-link>
				</div>
			</template>
			<template #append>
				<slot name="append"></slot>
			</template>
		</n8n-breadcrumbs>
		<!-- If there is no current folder, just show project badge -->
		<div
			v-else-if="currentProject"
			:class="{ [$style['home-project']]: true, [$style.dragging]: isDragging }"
			data-test-id="home-project"
			@mouseenter="onProjectHover"
			@mouseup="isDragging ? onProjectMouseUp() : null"
		>
			<n8n-link :to="`/projects/${currentProject.id}`">
				<N8nText size="medium" color="text-base">{{ projectName }}</N8nText>
			</n8n-link>
			<slot name="append"></slot>
		</div>
		<n8n-action-toggle
			v-if="visibleBreadcrumbsItems"
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

.action-toggle {
	span[role='button'] {
		color: var(--color-text-base);
	}
}

.home-project {
	display: flex;
	align-items: center;
	padding: var(--spacing-4xs);
	border: var(--border-width-base) var(--border-style-base) transparent;

	&.dragging:hover {
		border: var(--border-width-base) var(--border-style-base) var(--color-secondary);
		border-radius: var(--border-radius-base);
		background-color: var(--color-callout-secondary-background);
		* {
			cursor: grabbing;
			color: var(--color-text-base);
		}
	}

	&:hover :global(.n8n-text) {
		color: var(--color-text-dark);
	}
}
</style>
