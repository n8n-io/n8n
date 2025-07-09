<script setup lang="ts">
import LogsPanel from '@/features/logs/components/LogsPanel.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed } from 'vue';

const workflowsStore = useWorkflowsStore();
const hasExecutionData = computed(() => workflowsStore.workflowExecutionData);
</script>

<template>
	<LogsPanel v-if="hasExecutionData" :is-read-only="true" />
</template>
