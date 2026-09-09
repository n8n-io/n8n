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

/**
 * The slot contract is these props and the model — nothing else.
 *
 * Without this, an unknown attribute from a consumer falls through onto
 * `ProjectSharing` and can imitate the prop it misspelled: a `placeholder` typo
 * still reached the input as a bare attribute, so a broken contract rendered
 * correctly. `class` is forwarded explicitly because consumers style the picker
 * for their own layout.
 */
defineOptions({ inheritAttrs: false });

const model = defineModel<SlotProjectSelection>({ required: true });

const i18n = useI18n();
const projectsStore = useProjectsStore();
const searchFn = useAvailableProjectSearch();

// A personal project is named `<email>`, which is not a useful thing to filter by.
const emailPattern = /^<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>$/;
const filterFn = (project: ProjectListItem) =>
	!!project.name && !emailPattern.test(project.name.trim());

const selected = ref<ProjectSharingData | null>(null);

/** The project the model's id refers to, if this caller can already see it. */
const findProject = (id: string) =>
	[...projectsStore.availableProjects, ...projectsStore.myProjects].find(
		(project) => project.id === id,
	) ?? null;

// The model carries an id; the picker needs the whole project to show a label. Keep
// the two in step in both directions, and resolve an id the caller arrived with —
// a consumer that restores its filter from the URL mounts with one already set.
watch(
	model,
	(value) => {
		if (!value) {
			selected.value = null;
			return;
		}
		if (selected.value?.id === value.id) return;
		selected.value = findProject(value.id);
	},
	{ immediate: true },
);

// Guarded against the echo of the sync above, which would otherwise emit an
// identical id straight back at the caller.
watch(selected, (value) => {
	const next = value ? { id: value.id } : null;
	if (next?.id === model.value?.id) return;
	model.value = next;
});

onBeforeMount(async () => {
	// Members filter locally over myProjects — preload them.
	// Admins use remote search, so skip the unpaginated GET /projects call.
	if (!projectsStore.globalProjectPermissions.list) {
		await projectsStore.getAvailableProjects();
	}

	// The preload above may be what makes an arriving id resolvable.
	if (model.value && !selected.value) selected.value = findProject(model.value.id);
});
</script>

<template>
	<ProjectSharing
		v-model="selected"
		:class="$attrs.class"
		:search-fn="searchFn"
		:filter-fn="filterFn"
		:placeholder="placeholder"
		:empty-options-text="i18n.baseText('projects.sharing.noMatchingProjects')"
		:size="size"
		clearable
		@clear="selected = null"
	/>
</template>
