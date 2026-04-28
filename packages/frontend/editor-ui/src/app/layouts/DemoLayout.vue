<script lang="ts" setup>
import { computed, provide, onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseLayout from './BaseLayout.vue';
import DemoFooter from '@/features/execution/logs/components/DemoFooter.vue';
import { WorkflowStateKey } from '@/app/constants/injectionKeys';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowInitialization } from '@/app/composables/useWorkflowInitialization';
import { usePostMessageHandler } from '@/app/composables/usePostMessageHandler';
import { usePushConnection } from '@/app/composables/usePushConnection/usePushConnection';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { randomString } from 'n8n-workflow';

const route = useRoute();
const canExecute = computed(() => route.query.canExecute === 'true');

// The iframe shares sessionStorage with the parent page (same origin), so both
// get the same pushRef by default. This causes the backend to replace one
// push connection with the other. Generate a unique pushRef for this iframe
// so it can have its own independent push connection.
if (window !== window.parent) {
	useRootStore().setPushRef(randomString(10).toLowerCase());
}

const workflowState = useWorkflowState();
provide(WorkflowStateKey, workflowState);

const {
	initializeData,
	currentWorkflowDocumentStore,
	cleanup: cleanupInitialization,
} = useWorkflowInitialization(workflowState);

const { setup: setupPostMessages, cleanup: cleanupPostMessages } = usePostMessageHandler({
	workflowState,
	currentWorkflowDocumentStore,
});

// Initialize push event handlers so relayed execution events (via postMessage
// from the parent) are processed for node highlighting, execution state, etc.
// When canExecute is enabled, the iframe also establishes its own WebSocket
// connection for user-triggered executions (pushConnect below).
const pushConnection = usePushConnection({ router: useRouter(), workflowState });
const pushConnectionStore = usePushConnectionStore();

// When canExecute is disabled (read-only preview), set activeExecutionId to null
// so the iframe accepts incoming execution push events relayed from the parent
// via postMessage. When canExecute is enabled, leave it as undefined so the run
// button is not disabled — the normal execution flow will set it to null when
// the user actually starts an execution.
if (!canExecute.value) {
	workflowState.setActiveExecutionId(null);
}

onBeforeMount(() => {
	setupPostMessages();
});

onMounted(async () => {
	await initializeData();
	pushConnection.initialize();

	// When canExecute is enabled, establish a real WebSocket/SSE connection
	// so the iframe can trigger and receive its own execution events directly.
	if (canExecute.value) {
		pushConnectionStore.pushConnect();
	}
});

onBeforeUnmount(() => {
	if (canExecute.value) {
		pushConnectionStore.pushDisconnect();
	}
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
