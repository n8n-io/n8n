<script lang="ts" setup>
import { provide, onBeforeMount, onBeforeUnmount } from 'vue';
import BaseLayout from './BaseLayout.vue';
import DemoFooter from '@/features/execution/logs/components/DemoFooter.vue';
import {
	WorkflowIdKey,
	WorkflowStateKey,
	WorkflowDocumentStoreKey,
} from '@/app/constants/injectionKeys';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowInitialization } from '@/app/composables/useWorkflowInitialization';
import { usePostMessageHandler } from '@/app/composables/usePostMessageHandler';

const workflowState = useWorkflowState();
provide(WorkflowStateKey, workflowState);

const {
	workflowId,
	currentWorkflowDocumentStore,
	cleanup: cleanupInitialization,
} = useWorkflowInitialization(workflowState);

provide(WorkflowIdKey, workflowId);
provide(WorkflowDocumentStoreKey, currentWorkflowDocumentStore);

const { setup: setupPostMessages, cleanup: cleanupPostMessages } = usePostMessageHandler({
	workflowState,
	currentWorkflowDocumentStore,
});

onBeforeMount(() => {
	setupPostMessages();
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
