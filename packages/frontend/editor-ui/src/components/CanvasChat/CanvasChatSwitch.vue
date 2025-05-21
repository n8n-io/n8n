<script setup lang="ts">
import LogsPanel from '@/components/CanvasChat/future/LogsPanel.vue';
import { WORKFLOWS_STORE_KEY } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { inject } from 'vue';
// const { workflowsStore } = defineProps<{ workflowsStore: ReturnType<typeof useWorkflowsStore> }>();
const workflowsStore = useWorkflowsStore(); // @singleton
const { isNewLogsEnabled } = useSettingsStore();
</script>

<template>
	<LogsPanel v-if="isNewLogsEnabled" :workflows-store="workflowsStore" />
	<CanvasChat v-else :workflows-store="workflowsStore" />
</template>
