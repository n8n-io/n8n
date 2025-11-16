<script setup lang="ts">
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { computed } from 'vue';

const workflowsStore = useWorkflowsStore();
const hasExecutionData = computed(() => workflowsStore.workflowExecutionData);
</script>

<template>
	<LogsPanel v-if="hasExecutionData" :is-read-only="true" />
</template>
