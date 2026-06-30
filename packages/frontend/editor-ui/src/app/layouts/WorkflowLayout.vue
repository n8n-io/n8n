<script lang="ts" setup>
import { watch, onMounted, onBeforeUnmount, provide } from 'vue';
import BaseLayout from './BaseLayout.vue';
import { useLayoutProps } from '@/app/composables/useLayoutProps';
import { InstanceAiEditorCapabilityKey } from '@/app/composables/useInstanceAiEditorCapability';
import { useWorkflowInitialization } from '@/app/composables/useWorkflowInitialization';
import { usePostMessageHandler } from '@/app/composables/usePostMessageHandler';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import AskAssistantFloatingButton from '@/features/ai/assistant/components/Chat/AskAssistantFloatingButton.vue';
import CanvasChatOverlay from '@/features/ai/chatHub/components/CanvasChatOverlay.vue';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import { useInstanceAiHandoffCapability } from '@/features/ai/instanceAi/composables/useInstanceAiHandoffCapability';
import AppHeader from '@/app/components/app/AppHeader.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import LoadingView from '@/app/views/LoadingView.vue';
import { useSettingsStore } from '@/app/stores/settings.store';

const { layoutProps } = useLayoutProps();
const assistantStore = useAssistantStore();
const chatHubPanelStore = useChatHubPanelStore();
const pushConnectionStore = usePushConnectionStore();
const settingsStore = useSettingsStore();
const isCanvasOnly = settingsStore.isCanvasOnly;

const {
	isLoading,
	workflowId,
	currentWorkflowDocumentStore,
	isDebugRoute,
	initializeData,
	initializeWorkflow,
	handleDebugModeRoute,
	cleanup,
} = useWorkflowInitialization();

const { setup: setupPostMessages, cleanup: cleanupPostMessages } = usePostMessageHandler({
	currentWorkflowDocumentStore,
});

// As the standalone editor host, this layout defines what the editor's
// Instance AI entry points do here: hand the current workflow off to a new
// thread. Editors embedded elsewhere get their host's capability — or none.
provide(InstanceAiEditorCapabilityKey, useInstanceAiHandoffCapability());

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
