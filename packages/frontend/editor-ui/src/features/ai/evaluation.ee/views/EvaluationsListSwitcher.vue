<script setup lang="ts">
// Picks the list-view implementation based on the eval-collections rollout
// flag. Flag-off cohort sees the legacy `EvaluationsView` (single-run list);
// flag-on sees the collections list view. Sits at the `''` child route so
// `<RouterView>` in `EvaluationsRootView` resolves to whichever shape applies.

import { defineAsyncComponent } from 'vue';

import { useEvalCollectionsFlag } from '../composables/useEvalCollectionsFlag';
import EvaluationsView from './EvaluationsView.vue';

// Lazy-load the collections surface so the flag-off cohort (the 0%-rollout
// default) never downloads the collections list, setup wizard, and chart
// graph. The legacy view stays eager — it's what most users land on.
const EvalCollectionsListView = defineAsyncComponent(
	async () => await import('./EvalCollectionsListView.vue'),
);

defineProps<{
	workflowId: string;
}>();

const isCollectionsEnabled = useEvalCollectionsFlag();
</script>

<template>
	<EvalCollectionsListView v-if="isCollectionsEnabled" :workflow-id="workflowId" />
	<EvaluationsView v-else :workflow-id="workflowId" />
</template>
