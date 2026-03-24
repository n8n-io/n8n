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
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { usePushConnection } from '@/app/composables/usePushConnection/usePushConnection';
import { useUsersStore } from '@/features/settings/users/users.store';

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

const usersStore = useUsersStore();
const pushConnectionStore = usePushConnectionStore();
const pushConnection = usePushConnection({ router: useRouter(), workflowState });

// Set activeExecutionId to null (not undefined) eagerly so the iframe accepts
// incoming execution push events. undefined means "no execution context, skip all".
workflowState.setActiveExecutionId(null);

onBeforeMount(() => {
	setupPostMessages();
});

onMounted(async () => {
	await initializeData();

	// Connect push only when authenticated (Instance AI iframe).
	// In N8N_PREVIEW_MODE (external embeds), there's no user — skip to avoid failed requests.
	if (usersStore.currentUser) {
		pushConnectionStore.pushConnect();
		pushConnection.initialize();
	}
});

onBeforeUnmount(() => {
	pushConnection.terminate();
	pushConnectionStore.pushDisconnect();
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
