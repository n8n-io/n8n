<script setup lang="ts">
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const workflowsStore = useWorkflowsStore();
const hasExecutionData = computed(() => workflowsStore.workflowExecutionData);
const canExecute = computed(() => route.query.canExecute === 'true');
</script>

<template>
	<LogsPanel v-if="hasExecutionData || canExecute" :is-read-only="!canExecute" />
</template>
