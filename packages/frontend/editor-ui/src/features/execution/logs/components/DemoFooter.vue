<script setup lang="ts">
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
const hasExecutionData = computed(() => workflowExecutionStateStore.value.activeExecution);
const canExecute = computed(() => route.query.canExecute === 'true');
</script>

<template>
	<LogsPanel v-if="hasExecutionData || canExecute" :is-read-only="!canExecute" />
</template>
