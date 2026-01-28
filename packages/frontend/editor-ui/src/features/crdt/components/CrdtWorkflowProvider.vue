<script lang="ts" setup>
import { provide } from 'vue';
import { useCrdtWorkflowDoc } from '../composables/useCrdtWorkflowDoc';
import type { CRDTTransportType } from '../composables/useCRDTSync';
import { WorkflowDocumentKey } from '../types/workflowSync.types';

const props = withDefaults(
	defineProps<{
		/** CRDT document ID (workflow ID) */
		docId: string;
		/**
		 * Transport type for syncing. Default: 'worker'
		 * - 'worker': SharedWorker + server connection
		 * - 'websocket': Direct WebSocket to server
		 * - 'coordinator': Database Coordinator (Worker Mode - local only)
		 * - 'coordinator-server': Database Coordinator (Server Mode - WebSocket proxy)
		 */
		transport?: CRDTTransportType;
	}>(),
	{
		transport: 'worker',
	},
);

// Create document internally with transport option
const doc = useCrdtWorkflowDoc({ docId: props.docId, transport: props.transport });

// Provide to descendants
provide(WorkflowDocumentKey, doc);
</script>

<template>
	<!-- eslint-disable-next-line vue/no-multiple-template-root -->
	<slot />
</template>
