<script lang="ts" setup>
import type { SelectSize } from '@n8n/design-system';
import type { SlotProjectSelection } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { onBeforeMount, ref, watch } from 'vue';

import { useProjectsStore } from '../projects.store';
import type { ProjectListItem, ProjectSharingData } from '../projects.types';
import { useAvailableProjectSearch } from '../projects.utils';
import ProjectSharing from './ProjectSharing.vue';

/**
 * The `project-filter` component slot (see `@n8n/frontend-module-sdk`): a project
 * picker for callers that must not import this feature. It owns the store access,
 * the search strategy and the personal-project filter, and hands the caller back
 * only the chosen project id.
 */
defineProps<{
	placeholder?: string;
	size?: SelectSize;
}>();

const model = defineModel<SlotProjectSelection>({ required: true });

const i18n = useI18n();
const projectsStore = useProjectsStore();
const searchFn = useAvailableProjectSearch();

// A personal project is named `<email>`, which is not a useful thing to filter by.
const emailPattern = /^<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>$/;
const filterFn = (project: ProjectListItem) =>
	!!project.name && !emailPattern.test(project.name.trim());

const selected = ref<ProjectSharingData | null>(null);

// Every non-null selection originates here, so only the clear direction is mirrored
// inward — a caller reverting to "all projects" (e.g. after a 403) writes `null`.
watch(model, (value) => {
	if (!value) selected.value = null;
});
watch(selected, (value) => {
	model.value = value ? { id: value.id } : null;
});

onBeforeMount(async () => {
	// Members filter locally over myProjects — preload them.
	// Admins use remote search, so skip the unpaginated GET /projects call.
	if (!projectsStore.globalProjectPermissions.list) {
		await projectsStore.getAvailableProjects();
	}
});
</script>

<template>
	<ProjectSharing
		v-model="selected"
		:search-fn="searchFn"
		:filter-fn="filterFn"
		:placeholder="placeholder"
		:empty-options-text="i18n.baseText('projects.sharing.noMatchingProjects')"
		:size="size"
		clearable
		@clear="selected = null"
	/>
</template>
