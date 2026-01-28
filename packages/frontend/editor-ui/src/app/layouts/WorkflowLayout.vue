<script lang="ts" setup>
import { provide, watch, onMounted, onBeforeUnmount } from 'vue';
import BaseLayout from './BaseLayout.vue';
import { useLayoutProps } from '@/app/composables/useLayoutProps';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowInitialization } from '@/app/composables/useWorkflowInitialization';
import { WorkflowStateKey } from '@/app/constants';
import AskAssistantFloatingButton from '@/features/ai/assistant/components/Chat/AskAssistantFloatingButton.vue';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import AppHeader from '@/app/components/app/AppHeader.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import LoadingView from '@/app/views/LoadingView.vue';

const { layoutProps } = useLayoutProps();
const assistantStore = useAssistantStore();

// Create and provide workflowState for child components
const workflowState = useWorkflowState();
provide(WorkflowStateKey, workflowState);

// Use the workflow initialization composable
const {
	isLoading,
	workflowId,
	isTemplateRoute,
	isOnboardingRoute,
	initializeData,
	initializeWorkflow,
	cleanup,
} = useWorkflowInitialization(workflowState);

// Initialize on mount
onMounted(async () => {
	await initializeData();
	await initializeWorkflow();
});

// Watch for workflow ID changes to reload the workflow
watch(
	workflowId,
	async (newId, oldId) => {
		// Skip if template or onboarding routes - they handle their own initialization
		if (isTemplateRoute.value || isOnboardingRoute.value) {
			return;
		}

		if (newId !== oldId && newId) {
			await initializeWorkflow(true);
		}
	},
	{ flush: 'post' },
);

// Cleanup on unmount
onBeforeUnmount(() => {
	cleanup();
});
</script>

<template>
	<BaseLayout>
		<template #header>
			<AppHeader />
		</template>
		<template #sidebar>
			<AppSidebar />
		</template>
		<LoadingView v-if="isLoading" />
		<RouterView v-else />
		<template v-if="layoutProps.logs" #footer>
			<LogsPanel />
		</template>
		<template #overlays>
			<AskAssistantFloatingButton v-if="assistantStore.isFloatingButtonShown" />
		</template>
	</BaseLayout>
</template>
