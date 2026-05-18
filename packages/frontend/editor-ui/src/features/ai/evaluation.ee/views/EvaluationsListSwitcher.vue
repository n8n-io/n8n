<script setup lang="ts">
// Picks the list-view implementation based on the eval-collections rollout
// flag. Flag-off cohort sees the legacy `EvaluationsView` (single-run list);
// flag-on sees the collections list view. Sits at the `''` child route so
// `<RouterView>` in `EvaluationsRootView` resolves to whichever shape applies.

import { useEvalCollectionsFlag } from '../composables/useEvalCollectionsFlag';
import EvalCollectionsListView from './EvalCollectionsListView.vue';
import EvaluationsView from './EvaluationsView.vue';

defineProps<{
	workflowId: string;
}>();

const isCollectionsEnabled = useEvalCollectionsFlag();
</script>

<template>
	<EvalCollectionsListView v-if="isCollectionsEnabled" :workflow-id="workflowId" />
	<EvaluationsView v-else :workflow-id="workflowId" />
</template>
