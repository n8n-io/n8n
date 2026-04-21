<script lang="ts" setup>
import { provide, watch, onMounted, onBeforeUnmount } from 'vue';
import BaseLayout from './BaseLayout.vue';
import { useLayoutProps } from '@/app/composables/useLayoutProps';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowInitialization } from '@/app/composables/useWorkflowInitialization';
import { usePostMessageHandler } from '@/app/composables/usePostMessageHandler';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import AskAssistantFloatingButton from '@/features/ai/assistant/components/Chat/AskAssistantFloatingButton.vue';
import CanvasChatOverlay from '@/features/ai/chatHub/components/CanvasChatOverlay.vue';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import AppHeader from '@/app/components/app/AppHeader.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import LoadingView from '@/app/views/LoadingView.vue';
import { WorkflowStateKey, WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useProvideWorkflowId } from '@/app/composables/useProvideWorkflowId';
import { useSettingsStore } from '@/app/stores/settings.store';

const { layoutProps } = useLayoutProps();
const assistantStore = useAssistantStore();
const chatHubPanelStore = useChatHubPanelStore();
const pushConnectionStore = usePushConnectionStore();
const settingsStore = useSettingsStore();
const isCanvasOnly = settingsStore.isCanvasOnly;

const workflowState = useWorkflowState();
provide(WorkflowStateKey, workflowState);

const {
	isLoading,
	workflowId,
	currentWorkflowDocumentStore,
	isDebugRoute,
	initializeData,
	initializeWorkflow,
	handleDebugModeRoute,
	cleanup,
} = useWorkflowInitialization(workflowState);

useProvideWorkflowId();
provide(WorkflowDocumentStoreKey, currentWorkflowDocumentStore);

const { setup: setupPostMessages, cleanup: cleanupPostMessages } = usePostMessageHandler({
	workflowState,
	currentWorkflowDocumentStore,
});

onMounted(async () => {
	pushConnectionStore.pushConnect();
	setupPostMessages();
	await initializeData();
	await initializeWorkflow();
});

watch(
	workflowId,
	async (newId, oldId) => {
		if (newId !== oldId && newId) {
			await initializeWorkflow(true);
		}
	},
	{ flush: 'post' },
);

// Watch for entering debug mode on the same workflow (e.g., from executions tab)
// The workflowId watch won't trigger because the ID doesn't change.
// Skip if isLoading is true - initializeWorkflow already handles debug mode.
watch(
	isDebugRoute,
	async (isDebug, wasDebug) => {
		if (isDebug && !wasDebug && !isLoading.value) {
			await handleDebugModeRoute();
		}
	},
	{ flush: 'post' },
);

onBeforeUnmount(() => {
	pushConnectionStore.pushDisconnect();
	cleanupPostMessages();
	cleanup();
});
</script>

<template>
	<BaseLayout>
		<template #header>
			<AppHeader />
		</template>
		<template v-if="!isCanvasOnly" #sidebar>
			<AppSidebar />
		</template>
		<LoadingView v-if="isLoading" />
		<RouterView v-else />
		<template v-if="layoutProps.logs" #footer>
			<LogsPanel />
		</template>
		<template v-if="!isCanvasOnly" #overlays>
			<AskAssistantFloatingButton v-if="assistantStore.isFloatingButtonShown" />
			<CanvasChatOverlay v-if="chatHubPanelStore.isFloatingChatEnabled" />
		</template>
	</BaseLayout>
</template>
