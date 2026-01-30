<script lang="ts" setup>
import { provide } from 'vue';
import { useRestWorkflowDoc } from '../composables/useRestWorkflowDoc';
import { WorkflowDocumentKey } from '../types/workflowSync.types';

const props = defineProps<{
	/** Workflow ID to fetch */
	workflowId: string;
}>();

// Create document internally
const doc = useRestWorkflowDoc({ workflowId: props.workflowId });

// Provide to descendants
provide(WorkflowDocumentKey, doc);
</script>

<template>
	<!-- eslint-disable-next-line vue/no-multiple-template-root -->
	<slot />
</template>
