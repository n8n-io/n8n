<script setup lang="ts">
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = computed(() =>
	useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
);
const hasExecutionData = computed(() => workflowDocumentStore.value.execution);
const canExecute = computed(() => route.query.canExecute === 'true');
</script>

<template>
	<LogsPanel v-if="hasExecutionData || canExecute" :is-read-only="!canExecute" />
</template>
