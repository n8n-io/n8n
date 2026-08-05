<script setup lang="ts">
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { N8nIcon, N8nScrollArea, N8nTooltip, TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { isIconOrEmoji, type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useI18n } from '@n8n/i18n';
import {
	ComboboxAnchor,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxPortal,
	ComboboxRoot,
	ComboboxTrigger,
} from 'reka-ui';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

const PERSONAL_PROJECT_ICON: IconOrEmoji = { type: 'icon', value: 'user' };
const FALLBACK_PROJECT_ICON: IconOrEmoji = { type: 'icon', value: 'layers' };

const i18n = useI18n();
const projectsStore = useProjectsStore();
const model = defineModel<string | null>();
const open = ref(false);
const isTooltipSuppressed = ref(false);
let tooltipSuppressTimeout: ReturnType<typeof setTimeout> | undefined;

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
const isTooltipDisabled = computed(() => open.value || isTooltipSuppressed.value);

watch(open, (isOpen, wasOpen) => {
	if (!isOpen && wasOpen) {
		suppressTooltip();
	}
});

onBeforeUnmount(() => {
	clearTimeout(tooltipSuppressTimeout);
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

function suppressTooltip() {
	clearTimeout(tooltipSuppressTimeout);
	isTooltipSuppressed.value = true;
	tooltipSuppressTimeout = setTimeout(() => {
		isTooltipSuppressed.value = false;
	}, TOOLTIP_DELAY_MS + 100);
}
</script>

<template>
	<ComboboxRoot v-model="model" v-model:open="open">
		<ComboboxAnchor as-child>
			<ComboboxTrigger as-child>
				<N8nTooltip
					placement="bottom"
					as-child
					:content-class="$style.tooltip"
					:disabled="isTooltipDisabled"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<button type="button" :class="$style.select">
						<span :class="$style.triggerContent">
							<ProjectIcon
								:icon="selectedProjectIcon"
								size="small"
								border-less
								:class="$style.triggerProjectIcon"
							/>
							<span :class="$style.triggerLabel">{{ selectedProjectName }}</span>
						</span>
						<N8nIcon icon="chevron-down" size="small" :class="$style.trailingIcon" />
					</button>

					<template #content>
						<span style="white-space: nowrap">{{
							i18n.baseText('instanceAi.projectSelect.tooltip')
						}}</span>
					</template>
				</N8nTooltip>
			</ComboboxTrigger>
		</ComboboxAnchor>

		<ComboboxPortal>
			<ComboboxContent position="popper" align="start" :class="$style.content">
				<ComboboxInput
					v-if="showSearch"
					:placeholder="i18n.baseText('instanceAi.projectSelect.search')"
					:class="$style.input"
					:display-value="() => ''"
				/>

				<ComboboxEmpty :class="$style.empty">{{
					i18n.baseText('instanceAi.projectSelect.noResults')
				}}</ComboboxEmpty>

				<N8nScrollArea
					:class="[$style.scrollArea, { [$style.scrollAreaWithSearch]: showSearch }]"
					type="hover"
					max-height="min(320px, var(--reka-combobox-content-available-height))"
					as-child
				>
					<template v-for="project in projectsStore.myProjects" :key="project.id">
						<ComboboxItem
							:value="project.id"
							:text-value="getProjectName(project)"
							:class="$style.item"
						>
							<ProjectIcon :icon="getProjectIcon(project)" size="small" border-less />
							<span :class="$style.label">{{ getProjectName(project) }}</span>
							<N8nIcon
								v-if="selectedProject?.id === project.id"
								icon="check"
								size="small"
								:class="$style.check"
							/>
						</ComboboxItem>
					</template>
				</N8nScrollArea>
			</ComboboxContent>
		</ComboboxPortal>
	</ComboboxRoot>
</template>

<style module lang="scss">
.select {
	display: inline-flex;
	align-items: center;
	justify-content: flex-start;
	max-width: 190px;
	height: var(--spacing--lg);
	min-height: var(--spacing--lg);
	padding: 0 var(--spacing--2xs);
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	color: var(--text-color--subtle);
	background-color: transparent;
	border: 1px solid transparent;
	border-radius: var(--radius);
	appearance: none;
	cursor: pointer;

	&:hover {
		background-color: light-dark(var(--color--neutral-100), var(--color--neutral-700));
	}

	&:active,
	&[aria-expanded='true'],
	&[data-state='open'] {
		background-color: light-dark(var(--color--neutral-200), var(--color--neutral-700));
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		box-shadow: 0 0 0 2px var(--color--secondary);
	}
}

.content {
	display: flex;
	flex-direction: column;
	min-width: var(--reka-combobox-trigger-width);
	max-width: 320px;
	overflow: hidden;
	background: var(--background--surface);
	border: 0.5px solid var(--border-color);
	border-radius: var(--radius);
	box-shadow: var(--shadow--sm);
}

.scrollArea {
	flex: 1;
	min-height: 0;
	padding: var(--spacing--4xs) 0;
}

.scrollAreaWithSearch {
	padding-top: 0;
	padding-bottom: var(--spacing--4xs);
}

.input {
	position: sticky;
	top: 0;
	width: 100%;
	height: var(--height--lg);
	padding: 0 var(--spacing--sm);
	font-size: var(--font-size--sm);
	color: var(--text-color);
	background-color: var(--background--surface);
	border: none;
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
	outline: none;

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.empty {
	padding: var(--spacing--sm);
	color: var(--color--text--tint-1);
	text-align: center;
}

.item {
	display: flex;
	align-items: center;
	height: var(--height--lg);
	padding: 0 var(--spacing--2xs);
	margin: 0 var(--spacing--4xs);
	gap: var(--spacing--2xs);
	font-size: var(--font-size--sm);
	color: var(--text-color);
	border-radius: var(--radius--2xs);
	cursor: default;

	&[data-highlighted] {
		background-color: var(--color--background--light-1);
	}
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

.trailingIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
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

.check {
	flex-shrink: 0;
	color: var(--color--text);
}

.tooltip {
	max-width: none;
}
</style>
