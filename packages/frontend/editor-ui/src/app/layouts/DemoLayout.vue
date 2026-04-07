<script lang="ts" setup>
import { provide, onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import BaseLayout from './BaseLayout.vue';
import DemoFooter from '@/features/execution/logs/components/DemoFooter.vue';
import { WorkflowStateKey, WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useProvideWorkflowId } from '@/app/composables/useProvideWorkflowId';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowInitialization } from '@/app/composables/useWorkflowInitialization';
import { usePostMessageHandler } from '@/app/composables/usePostMessageHandler';
import { usePushConnection } from '@/app/composables/usePushConnection/usePushConnection';

const workflowState = useWorkflowState();
provide(WorkflowStateKey, workflowState);

const {
	initializeData,
	currentWorkflowDocumentStore,
	cleanup: cleanupInitialization,
} = useWorkflowInitialization(workflowState);

useProvideWorkflowId();
provide(WorkflowDocumentStoreKey, currentWorkflowDocumentStore);

const { setup: setupPostMessages, cleanup: cleanupPostMessages } = usePostMessageHandler({
	workflowState,
	currentWorkflowDocumentStore,
});

// Initialize push event handlers so relayed execution events (via postMessage
// from the parent) are processed for node highlighting, execution state, etc.
// No pushConnect() — the parent owns the WebSocket and relays events to us.
const pushConnection = usePushConnection({ router: useRouter(), workflowState });

// Set activeExecutionId to null (not undefined) eagerly so the iframe accepts
// incoming execution push events relayed from the parent via postMessage.
workflowState.setActiveExecutionId(null);

onBeforeMount(() => {
	setupPostMessages();
});

onMounted(async () => {
	await initializeData();
	pushConnection.initialize();
});

onBeforeUnmount(() => {
	pushConnection.terminate();
	cleanupPostMessages();
	cleanupInitialization();
});
</script>

<template>
	<BaseLayout>
		<RouterView />
		<template #footer>
			<DemoFooter />
		</template>
	</BaseLayout>
</template>
