<script setup lang="ts">
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import {
	N8nDropdownMenu,
	N8nIcon,
	N8nTooltip,
	N8nButton,
	TOOLTIP_DELAY_MS,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { useMenuTriggerTooltip } from '../composables/useMenuTriggerTooltip';

const PERSONAL_PROJECT_ICON: IconOrEmoji = { type: 'icon', value: 'user' };
const FALLBACK_PROJECT_ICON: IconOrEmoji = { type: 'icon', value: 'layers' };

const i18n = useI18n();
const projectsStore = useProjectsStore();
const model = defineModel<string | null>();
const open = ref(false);
const searchTerm = ref('');
const { isTooltipDisabled } = useMenuTriggerTooltip(open);

const selectedProject = computed(() =>
	projectsStore.myProjects.find((project) => project.id === model.value),
);
const showSearch = computed(() => projectsStore.myProjects.length > 5);
const selectedProjectName = computed(() =>
	selectedProject.value
		? getProjectName(selectedProject.value)
		: i18n.baseText('instanceAi.projectSelect.placeholder'),
);
const selectedProjectIcon = computed(() => getProjectIcon(selectedProject.value));
// N8nDropdownMenu only emits `search`, so the items are filtered here.
const filteredProjects = computed(() => {
	const term = searchTerm.value.trim().toLowerCase();
	if (!term) return projectsStore.myProjects;

	return projectsStore.myProjects.filter((project) =>
		getProjectName(project).toLowerCase().includes(term),
	);
});
const menuItems = computed<Array<DropdownMenuItemProps<string>>>(() =>
	filteredProjects.value.map((project) => ({
		id: project.id,
		label: getProjectName(project),
		icon: getProjectIcon(project),
		checkbox: true,
		checked: selectedProject.value?.id === project.id,
	})),
);

// The search field clears its term only when the menu closes, not when the field is removed.
watch(showSearch, (isSearchShown) => {
	if (!isSearchShown) searchTerm.value = '';
});

function getProjectName(project: ProjectListItem) {
	return project.type === 'personal'
		? i18n.baseText('instanceAi.projectSelect.personalSpace')
		: (project.name ?? '');
}

function getProjectIcon(project?: ProjectListItem): IconOrEmoji {
	if (project?.type === 'personal') return PERSONAL_PROJECT_ICON;

	return project?.icon && isIconOrEmoji(project.icon) ? project.icon : FALLBACK_PROJECT_ICON;
}

function selectProject(projectId: string) {
	model.value = projectId;
}

function onSearch(term: string) {
	searchTerm.value = term;
}
</script>

<template>
	<N8nDropdownMenu
		v-model="open"
		:items="menuItems"
		:searchable="showSearch"
		:search-placeholder="i18n.baseText('instanceAi.projectSelect.search')"
		:empty-text="i18n.baseText('instanceAi.projectSelect.noResults')"
		:extra-popper-class="$style.content"
		placement="bottom-start"
		max-height="320px"
		width="320px"
		@select="selectProject"
		@search="onSearch"
	>
		<template #trigger>
			<N8nTooltip
				placement="bottom"
				as-child
				:content-class="$style.tooltip"
				:disabled="isTooltipDisabled"
				:show-after="TOOLTIP_DELAY_MS"
			>
				<N8nButton variant="ghost" size="small" :class="$style.select">
					<template #icon>
						<ProjectIcon
							:icon="selectedProjectIcon"
							size="small"
							border-less
							:class="$style.triggerProjectIcon"
						/>
					</template>
					<span :class="$style.triggerLabel">{{ selectedProjectName }}</span>
					<N8nIcon icon="chevron-down" size="small" :class="$style.trailingIcon" />
				</N8nButton>

				<template #content>
					<span style="white-space: nowrap">{{
						i18n.baseText('instanceAi.projectSelect.tooltip')
					}}</span>
				</template>
			</N8nTooltip>
		</template>

		<template #item-leading="{ item }">
			<ProjectIcon v-if="item.icon" :icon="item.icon" size="small" border-less />
		</template>
		<template #item-trailing="{ item }">
			<N8nIcon v-if="item.checked" icon="check" size="small" />
		</template>
	</N8nDropdownMenu>
</template>

<style module lang="scss">
.select {
	max-width: 190px;
	padding-inline: var(--spacing--3xs);
	height: var(--spacing--lg);
	gap: var(--spacing--4xs);
	margin-inline-start: calc(var(--spacing--5xs) * -1);
}

.content {
	min-width: 190px;
}

.triggerContent {
	display: inline-flex;
	align-items: center;
	min-width: 0;
	gap: var(--spacing--3xs);
}

.trailingIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.triggerLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tooltip {
	max-width: none;
}
</style>
