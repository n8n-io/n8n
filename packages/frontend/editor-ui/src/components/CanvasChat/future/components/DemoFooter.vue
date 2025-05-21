<script setup lang="ts">
import LogsPanel from '@/components/CanvasChat/future/LogsPanel.vue';
import { WORKFLOWS_STORE_KEY } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, inject } from 'vue';

const { isNewLogsEnabled } = useSettingsStore();
const workflowsStore = inject<ReturnType<typeof useWorkflowsStore>>(WORKFLOWS_STORE_KEY)!; // @singleton
const hasExecutionData = computed(() => workflowsStore.workflowExecutionData);
</script>

<template>
	<LogsPanel
		v-if="isNewLogsEnabled && hasExecutionData"
		:is-read-only="true"
		:workflows-store="workflowsStore"
	/>
</template>
