<script setup lang="ts">
// The Evaluations tab stacks the config-eval hub (`EvaluationsView`: run test,
// config runs) above the eval-collections list when the rollout flag is on —
// config evals are the foundation, collections the comparison layer built on
// them. Both lists paginate to a few items so the two fit on one page without a
// long scroll. Flag-off shows just the config-eval hub, unpaginated. Sits at the
// `''` child route so `<RouterView>` in `EvaluationsRootView` resolves here.

import { defineAsyncComponent } from 'vue';

import { useEvalCollectionsFlag } from '../composables/useEvalCollectionsFlag';
import EvaluationsView from './EvaluationsView.vue';

// Lazy-load the collections surface so the flag-off cohort (the 0%-rollout
// default) never downloads the collections list, setup wizard, and chart graph.
const EvalCollectionsListView = defineAsyncComponent(
	async () => await import('./EvalCollectionsListView.vue'),
);

defineProps<{
	workflowId: string;
}>();

const isCollectionsEnabled = useEvalCollectionsFlag();

// Per-list cap when both surfaces share the page, so neither pushes the other
// off-screen.
const STACKED_PAGE_SIZE = 5;
</script>

<template>
	<EvaluationsView v-if="!isCollectionsEnabled" :workflow-id="workflowId" />

	<div v-else :class="$style.stack">
		<EvaluationsView :workflow-id="workflowId" :runs-page-size="STACKED_PAGE_SIZE" />
		<EvalCollectionsListView :workflow-id="workflowId" :page-size="STACKED_PAGE_SIZE" />
	</div>
</template>

<style module lang="scss">
.stack {
	display: flex;
	flex-direction: column;
	width: 100%;
}
</style>
