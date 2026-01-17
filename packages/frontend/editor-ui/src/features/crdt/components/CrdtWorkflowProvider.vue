<script lang="ts" setup>
import { provide } from 'vue';
import { useCrdtWorkflowDoc } from '../composables/useCrdtWorkflowDoc';
import { WorkflowDocumentKey } from '../types/workflowSync.types';

const props = defineProps<{
	/** CRDT document ID (workflow ID) */
	docId: string;
}>();

// Create document internally
const doc = useCrdtWorkflowDoc({ docId: props.docId });

// Provide to descendants
provide(WorkflowDocumentKey, doc);
</script>

<template>
	<!-- eslint-disable-next-line vue/no-multiple-template-root -->
	<slot />
</template>
