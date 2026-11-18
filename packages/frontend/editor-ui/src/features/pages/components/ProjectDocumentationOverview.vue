<script setup lang="ts">
import { PageOverviewBoard } from '@n8n/frontend-module-page';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';

import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';

import { OVERVIEW_MODE_QUERY_PARAMETER, useOverviewMode } from '../composables/useOverviewMode';
import { usePagePeekStore } from '../pagePeek.store';
import OverviewModeSwitch from './OverviewModeSwitch.vue';

/**
 * Shows the documentation board as the overview of the open project, or of all projects when the route has no project.
 * A page that the user selects opens in the side panel, so the board stays in view.
 * A project that the user selects opens with its own documentation board.
 * The board reloads on an interval, so pages that the assistant writes show without a reload.
 */
const DOCUMENTATION_REFRESH_INTERVAL_MS = 4000;

const { projectId } = useOverviewMode();
const pagePeekStore = usePagePeekStore();
const router = useRouter();

async function openProjectDocumentation(selectedProjectId: string): Promise<void> {
	await router.push({
		name: VIEWS.PROJECTS_WORKFLOWS,
		params: { projectId: selectedProjectId },
		query: { [OVERVIEW_MODE_QUERY_PARAMETER]: 'docs' },
	});
}
</script>

<template>
	<div :class="$style.view" data-test-id="project-documentation-overview">
		<ProjectHeader />
		<OverviewModeSwitch />
		<div :class="$style.board">
			<PageOverviewBoard
				:key="projectId"
				:project-id="projectId"
				:refresh-interval-ms="DOCUMENTATION_REFRESH_INTERVAL_MS"
				@select-page="pagePeekStore.open"
				@select-project="openProjectDocumentation"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.view {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-height: 0;
	padding: var(--spacing--lg) var(--spacing--2xl) 0;
	box-sizing: border-box;
}

.board {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding-bottom: var(--spacing--2xl);
}
</style>
