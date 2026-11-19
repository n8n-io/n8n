<script setup lang="ts">
import { N8nResizeWrapper, useResizablePanel } from '@n8n/design-system';
import { useTemplateRef } from 'vue';

import { useTaskPanel } from './useTaskPanel';
import TaskPanel from '../TaskPanel/TaskPanel.vue';

/** A board page with the selected task in a panel that the user can resize, on the right. */
const { selectedTask, selectedTaskLocation, close, openFullPage } = useTaskPanel();

const layoutRef = useTemplateRef<HTMLElement>('layout');
const panelResizer = useResizablePanel({
	container: layoutRef,
	width: {
		localStorageKey: 'N8N_TASK_BOARD_PANEL_WIDTH',
		defaultSize: (size) => Math.min(Math.max(size * 0.35, 360), 560),
		minSize: 320,
		maxSize: (size) => Math.min(size * 0.6, 800),
	},
});
const panelWidth = panelResizer.width;
</script>

<template>
	<div ref="layout" :class="$style.layout">
		<main :class="$style.main">
			<slot />
		</main>
		<N8nResizeWrapper
			v-if="selectedTask && selectedTaskLocation"
			:class="$style.panelResizer"
			:style="{ width: `${panelWidth}px` }"
			:resizer="panelResizer"
			:supported-directions="['left']"
		>
			<TaskPanel
				:task="selectedTask"
				:task-location="selectedTaskLocation"
				@close="close"
				@open-full-page="openFullPage"
			/>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.layout {
	display: flex;
	width: 100%;
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.main {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--lg);
	min-width: 0;
	min-height: 0;
	padding: var(--spacing--lg) var(--spacing--2xl);

	@include breakpoints.breakpoint('sm-and-down') {
		padding: var(--spacing--sm);
	}
}

.panelResizer {
	flex: 0 0 auto;
	height: 100%;
}
</style>
