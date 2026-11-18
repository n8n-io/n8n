<script setup lang="ts">
import { N8nSegmentControl } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, watch } from 'vue';

import { OVERVIEW_MODES, useOverviewMode, type OverviewMode } from '../composables/useOverviewMode';
import SortItOutButton from './SortItOutButton.vue';

/**
 * Lets the user change the overview between the list of workflows and the documentation board.
 * Next to the list it offers "Sort it out!" while no workflow of the overview has a page.
 * It renders nothing when the instance has no pages.
 */
const i18n = useI18n();
const {
	isPageModuleActive,
	projectId,
	mode,
	hasDocumentation,
	undocumentedWorkflows,
	setMode,
	loadDocumentation,
} = useOverviewMode();

const MODE_LABELS = {
	list: 'page.overview.mode.list',
	docs: 'page.overview.mode.docs',
} as const;

const options = computed(() =>
	OVERVIEW_MODES.map((value) => ({ value, label: i18n.baseText(MODE_LABELS[value]) })),
);
const offersSortItOut = computed(() => mode.value === 'list' && !hasDocumentation.value);

watch(projectId, loadDocumentation, { immediate: true });
</script>

<template>
	<div v-if="isPageModuleActive" :class="$style.switch" data-test-id="overview-mode-switch">
		<N8nSegmentControl
			:model-value="mode"
			:options="options"
			:aria-label="i18n.baseText('page.overview.mode.label')"
			size="small"
			data-test-id="overview-mode-control"
			@update:model-value="(value: OverviewMode) => setMode(value)"
		/>
		<SortItOutButton
			v-if="offersSortItOut"
			:project-id="projectId"
			:undocumented-workflows="undocumentedWorkflows"
		/>
	</div>
</template>

<style lang="scss" module>
.switch {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}
</style>
