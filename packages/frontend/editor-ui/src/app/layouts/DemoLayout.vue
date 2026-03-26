<script lang="ts" setup>
import { provide, onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import BaseLayout from './BaseLayout.vue';
import DemoFooter from '@/features/execution/logs/components/DemoFooter.vue';
import { WorkflowStateKey, WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useProvideWorkflowId } from '@/app/composables/useProvideWorkflowId';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowInitialization } from '@/app/composables/useWorkflowInitialization';
import { usePostMessageHandler } from '@/app/composables/usePostMessageHandler';

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

onBeforeMount(() => {
	setupPostMessages();
});

onMounted(async () => {
	await initializeData();
});

onBeforeUnmount(() => {
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
