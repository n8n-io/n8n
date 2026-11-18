<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { N8nBreadcrumbs, N8nDropdownMenu, N8nIconButton, type PathItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { PROJECT_ROOT } from 'n8n-workflow';
import ProjectBreadcrumb from '@/features/core/folders/components/ProjectBreadcrumb.vue';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { PROJECT_AGENTS } from '../constants';

const props = defineProps<{
	project?: Project;
	items: PathItem[];
	folderId: string | null;
	canCreate: boolean;
	dragActive: boolean;
}>();

const emit = defineEmits<{
	navigate: [id: string];
	drop: [id: string];
	create: [];
}>();

const i18n = useI18n();

const projectRoute = computed<RouteLocationRaw | undefined>(() =>
	props.project ? { name: PROJECT_AGENTS, params: { projectId: props.project.id } } : undefined,
);

const menuItems = computed(() =>
	props.canCreate ? [{ id: 'create', label: i18n.baseText('folders.actions.create') }] : [],
);

// A drop on a breadcrumb moves the item to that folder. A drop on the rest
// of the toolbar moves the item to the open folder.
function onDrop(event: DragEvent) {
	const target = event.target;
	const item = target instanceof Element ? target.closest<HTMLElement>('[data-resourceid]') : null;

	emit('drop', item?.dataset.resourceid ?? props.folderId ?? PROJECT_ROOT);
}
</script>

<template>
	<div
		:class="$style.toolbar"
		data-test-id="agent-folder-breadcrumbs"
		@dragover.prevent
		@drop.prevent="onDrop"
	>
		<N8nBreadcrumbs
			v-if="items.length"
			:items="items"
			:drag-active="dragActive"
			@item-selected="emit('navigate', $event.id)"
		>
			<template #prepend>
				<span :data-resourceid="PROJECT_ROOT">
					<ProjectBreadcrumb :current-project="project" :to="projectRoute" />
				</span>
			</template>
		</N8nBreadcrumbs>
		<span v-else :data-resourceid="PROJECT_ROOT">
			<ProjectBreadcrumb :current-project="project" :to="projectRoute" />
		</span>

		<N8nDropdownMenu
			v-if="menuItems.length"
			:items="menuItems"
			placement="bottom-end"
			@select="emit('create')"
		>
			<template #trigger>
				<N8nIconButton
					class="action-toggle"
					variant="ghost"
					icon="ellipsis-12"
					size="small"
					icon-size="medium"
					:aria-label="i18n.baseText('generic.more')"
					data-test-id="agent-folder-breadcrumbs-actions"
				/>
			</template>
		</N8nDropdownMenu>
	</div>
</template>

<style module lang="scss">
.toolbar {
	display: flex;
	align-items: center;
	align-self: flex-end;
}
</style>
