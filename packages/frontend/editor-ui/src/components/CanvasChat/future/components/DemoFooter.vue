<script setup lang="ts">
import LogsPanel from '@/components/CanvasChat/future/LogsPanel.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed } from 'vue';

const { isNewLogsEnabled } = useSettingsStore();
const workflowsStore = useWorkflowsStore();
const hasExecutionData = computed(() => workflowsStore.workflowExecutionData);
</script>

<template>
	<LogsPanel v-if="isNewLogsEnabled && hasExecutionData" :is-read-only="true" />
</template>
