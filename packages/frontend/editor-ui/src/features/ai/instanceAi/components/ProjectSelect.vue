<script setup lang="ts">
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import {
	N8nInput,
	N8nSelect2,
	N8nSelect2Item,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import type {
	SelectItemProps,
	SelectValue,
} from '@n8n/design-system/v2/components/Select/Select.types';
import { computed, nextTick, ref, watch } from 'vue';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

interface ProjectSelectItem extends SelectItemProps {
	project: ProjectListItem;
}

const PERSONAL_PROJECT_ICON: IconOrEmoji = { type: 'icon', value: 'user' };
const FALLBACK_PROJECT_ICON: IconOrEmoji = { type: 'icon', value: 'layers' };

const projectsStore = useProjectsStore();
const model = defineModel<string | null>();
const open = ref(false);
const search = ref('');
const activeProjectId = ref<string | null>(null);
const searchInputRef = ref<InstanceType<typeof N8nInput> | null>(null);
let searchFocusTimeout: ReturnType<typeof setTimeout> | undefined;

const selectedProject = computed(() =>
	projectsStore.myProjects.find((project) => project.id === model.value),
);
const showSearch = computed(() => projectsStore.myProjects.length > 5);
const filteredProjects = computed(() => {
	const query = search.value.trim().toLowerCase();

	if (!query) return projectsStore.myProjects;

	return projectsStore.myProjects.filter((project) =>
		getProjectName(project).toLowerCase().includes(query),
	);
});
const projectItems = computed<ProjectSelectItem[]>(() =>
	filteredProjects.value.map((project) => ({
		value: project.id,
		label: getProjectName(project),
		project,
	})),
);
const selectedProjectName = computed(() =>
	selectedProject.value ? getProjectName(selectedProject.value) : 'Select a project',
);
const selectedProjectIcon = computed(() => getProjectIcon(selectedProject.value));

watch(open, async (isOpen) => {
	clearTimeout(searchFocusTimeout);

	if (!isOpen) {
		search.value = '';
		return;
	}

	if (showSearch.value) {
		activeProjectId.value = model.value;
		await nextTick();
		searchFocusTimeout = setTimeout(() => searchInputRef.value?.focus(), 0);
	}
});

watch(projectItems, (items) => {
	if (!open.value) return;

	if (items.length === 0) {
		activeProjectId.value = null;
		return;
	}

	if (!items.some((item) => item.value === activeProjectId.value)) {
		activeProjectId.value = typeof items[0]?.value === 'string' ? items[0].value : null;
	}
});

function getProjectName(project: ProjectListItem) {
	return project.type === 'personal' ? 'Personal space' : (project.name ?? '');
}

function getProjectIcon(project?: ProjectListItem): IconOrEmoji {
	if (project?.type === 'personal') return PERSONAL_PROJECT_ICON;

	return project?.icon && isIconOrEmoji(project.icon) ? project.icon : FALLBACK_PROJECT_ICON;
}

function onSelect(value: SelectValue | undefined) {
	if (typeof value !== 'string') return;

	model.value = value;
}

function moveActiveProject(delta: 1 | -1) {
	if (projectItems.value.length === 0) return;

	const currentIndex = projectItems.value.findIndex((item) => item.value === activeProjectId.value);
	const nextIndex =
		currentIndex === -1
			? 0
			: (currentIndex + delta + projectItems.value.length) % projectItems.value.length;
	const nextValue = projectItems.value[nextIndex]?.value;

	activeProjectId.value = typeof nextValue === 'string' ? nextValue : null;
}

function selectActiveProject() {
	if (!activeProjectId.value) return;

	model.value = activeProjectId.value;
	open.value = false;
}

function onSearchKeydown(event: KeyboardEvent) {
	event.stopPropagation();

	if (event.key === 'ArrowDown') {
		event.preventDefault();
		moveActiveProject(1);
		return;
	}

	if (event.key === 'ArrowUp') {
		event.preventDefault();
		moveActiveProject(-1);
		return;
	}

	if (event.key === 'Enter') {
		event.preventDefault();
		selectActiveProject();
		return;
	}

	if (event.key === 'Escape') {
		event.preventDefault();
		open.value = false;
	}
}
</script>

<template>
	<N8nSelect2
		v-model:open="open"
		:items="projectItems"
		:model-value="model"
		variant="ghost"
		size="xsmall"
		position="popper"
		:content-class="$style.content"
		:class="$style.select"
		@update:model-value="onSelect"
	>
		<template #default>
			<N8nTooltip
				placement="bottom"
				as-child
				:content-class="$style.tooltip"
				:disabled="open"
				:show-after="TOOLTIP_DELAY_MS"
			>
				<span :class="$style.triggerContent">
					<ProjectIcon
						:icon="selectedProjectIcon"
						size="small"
						border-less
						:class="$style.triggerProjectIcon"
					/>
					<span :class="$style.triggerLabel">{{ selectedProjectName }}</span>
				</span>
				<template #content>
					<span style="white-space: nowrap">Where AI assistant creates automations</span>
				</template>
			</N8nTooltip>
		</template>

		<template v-if="showSearch" #header>
			<N8nInput
				ref="searchInputRef"
				v-model="search"
				placeholder="Search projects"
				size="medium"
				:class="$style.input"
				@click.stop
				@keydown="onSearchKeydown"
			/>
		</template>

		<template #item="{ item }">
			<N8nSelect2Item
				v-bind="item"
				:class="[$style.item, { [$style.activeItem]: item.value === activeProjectId }]"
			>
				<template #item-leading>
					<ProjectIcon
						:icon="getProjectIcon((item as ProjectSelectItem).project)"
						size="small"
						border-less
					/>
				</template>
				<template #item-label>
					<span :class="$style.label">{{ item.label }}</span>
				</template>
			</N8nSelect2Item>
		</template>

		<template v-if="showSearch && projectItems.length === 0" #footer>
			<div :class="$style.empty">No results</div>
		</template>
	</N8nSelect2>
</template>

<style module lang="scss">
.select {
	max-width: 190px;
	font-size: var(--font-size--sm);
	background-color: transparent;

	&:not([data-disabled]):hover {
		background-color: light-dark(var(--color--neutral-100), var(--color--neutral-700));
	}

	&:not([data-disabled]):active,
	&[data-state='open'] {
		background-color: light-dark(var(--color--neutral-200), var(--color--neutral-700));
	}
}

.content {
	// Cap the width so long names truncate. max-width also clamps the popper's
	// trigger-derived min width, so the dropdown won't grow to fit the longest item.
	max-width: 320px;
}

.input {
	width: 100%;
	--input--color--background: var(--color--background--light-2);
	--input--radius--bottom-right: 0;
	--input--radius--bottom-left: 0;
	--input--border-color: transparent;
	--input--border-color--hover: transparent;
	--input--border-color--focus: transparent;
	--input--border--shadow--focus: 0 0 0 0 transparent;
	--input--shadow--focus: 0 0 0 0 transparent;

	:global(.n8n-input__wrapper:focus-within) {
		outline: none;
	}
}

.empty {
	padding: var(--spacing--sm);
	color: var(--color--text--tint-1);
	text-align: center;
}

.item {
	width: 100%;
	height: var(--height--lg);
	font-size: var(--font-size--sm);
}

.activeItem {
	background-color: var(--color--background--light-1);
}

.triggerContent {
	display: inline-flex;
	align-items: center;
	min-width: 0;
	gap: var(--spacing--3xs);
}

.triggerProjectIcon {
	color: var(--text-color--subtle);

	:global(.n8n-icon) {
		color: var(--text-color--subtle) !important;
	}
}

.triggerLabel,
.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.triggerLabel {
	color: var(--text-color--subtle);
}

.label {
	// Take the row's free space (right-aligns the trailing check) and truncate.
	flex: 1;
}

.tooltip {
	max-width: none;
}
</style>
