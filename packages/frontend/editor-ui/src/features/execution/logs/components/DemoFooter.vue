<script setup lang="ts">
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useWorkflowId } from '@/app/composables/useWorkflowId';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';

const route = useRoute();
const workflowId = useWorkflowId();
const workflowExecutionSession = computed(() =>
	useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId(workflowId.value)),
);
const hasExecutionData = computed(() => workflowExecutionSession.value.activeExecution);
const canExecute = computed(() => route.query.canExecute === 'true');
</script>

<template>
	<LogsPanel v-if="hasExecutionData || canExecute" :is-read-only="!canExecute" />
</template>
