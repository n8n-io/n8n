<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { FolderPathItem } from '@/Interface';
import { useProjectsStore } from '@/stores/projects.store';
import { ProjectTypes } from '@/types/projects.types';
import type { UserAction } from '@n8n/design-system/types';
import { type PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { computed } from 'vue';
import { useFoldersStore } from '@/stores/folders.store';

type Props = {
	actions: UserAction[];
	breadcrumbs: {
		visibleItems: FolderPathItem[];
		hiddenItems: FolderPathItem[];
	};
	hiddenItemsTrigger?: 'hover' | 'click';
};

const props = withDefaults(defineProps<Props>(), {
	hiddenItemsTrigger: 'click',
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
			v-if="breadcrumbs.visibleItems"
			v-model:drag-active="isDragging"
			:items="breadcrumbs.visibleItems"
			:highlight-last-item="false"
			:path-truncated="breadcrumbs.visibleItems[0].parentFolder"
			:hidden-items="breadcrumbs.hiddenItems"
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
		</n8n-breadcrumbs>
		<n8n-action-toggle
			v-if="breadcrumbs.visibleItems"
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

	&:hover * {
		color: var(--color-text-dark);
	}
}
</style>
