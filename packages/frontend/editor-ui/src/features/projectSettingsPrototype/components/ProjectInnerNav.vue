<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nScrollArea, N8nText, isIconOrEmoji } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import {
	PROJECT_ITEM_PREFIX,
	useAppNavigation,
} from '@/app/components/appNavigation/useAppNavigation';
import { VIEWS } from '@/app/constants';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { settingsSections } from '../nav/sections';
import { useProtoChrome } from '../nav/useProtoChrome';
import ProjectNavSections from './ProjectNavSections.vue';

/**
 * A column of pages between the app's navigation and the page. In the
 * separate settings area it lists the settings pages behind a back row. On
 * the standard shell's side navigation it lists the whole project.
 */
const { projectId, project, page, chrome } = useProtoChrome();
const navigation = useAppNavigation();

const settingsOnly = computed(() => chrome.value.innerNav);

const sections = computed(() => {
	const id = projectId.value;
	if (!id) return [];
	if (settingsOnly.value) {
		return settingsSections(
			{ projectId: id, currentProjectId: id, currentPage: page.value },
			'Project settings',
		);
	}
	return navigation.sectionsFor(`${PROJECT_ITEM_PREFIX}${id}`);
});

const icon = computed<IconOrEmoji>(() =>
	isIconOrEmoji(project.value?.icon) ? project.value.icon : { type: 'icon', value: 'layers' },
);

const projectHome = computed(() => ({
	name: VIEWS.PROJECTS_WORKFLOWS,
	params: { projectId: projectId.value },
}));
</script>

<template>
	<nav
		:class="$style.column"
		:aria-label="settingsOnly ? 'Project settings' : 'Project pages'"
		data-test-id="proto-inner-nav"
	>
		<div :class="$style.head">
			<RouterLink
				v-if="settingsOnly"
				:to="projectHome"
				:class="$style.back"
				data-test-id="proto-inner-nav-back"
			>
				<span :class="$style.backIcon">
					<N8nIcon icon="arrow-left" size="small" />
				</span>
				<span :class="$style.name">{{ project?.name }}</span>
			</RouterLink>
			<div v-else :class="$style.project">
				<ProjectIcon :icon="icon" :border-less="true" size="small" />
				<N8nText bold color="text-dark" :class="$style.name">{{ project?.name }}</N8nText>
			</div>
		</div>
		<N8nScrollArea edge-fade="y" :class="$style.scrollArea">
			<div :class="$style.items">
				<ProjectNavSections :sections="sections" />
			</div>
		</N8nScrollArea>
	</nav>
</template>

<style lang="scss" module>
.column {
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	flex: none;
	width: 256px;
	height: 100%;
	border-inline-end: var(--border);
	overflow: hidden;
}

.head {
	padding: var(--spacing--sm) var(--spacing--2xs) var(--spacing--2xs);
}

.project {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: var(--spacing--xl);
	padding: 0 var(--spacing--2xs);
}

/* Mirrors the N8nMenuItem box, so the back row lines up with the links under it. */
.back {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: var(--spacing--xl);
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	text-decoration: none;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--focus--border-color, currentColor);
		outline-offset: -2px;
	}
}

.backIcon {
	display: grid;
	place-items: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	flex: none;
	color: var(--text-color--subtle);
}

.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.scrollArea {
	min-height: 0;
}

.items {
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--xl);
}
</style>
