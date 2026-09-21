<script lang="ts" setup>
import { computed, watch, onMounted, onBeforeUnmount, provide } from 'vue';
import { useRoute } from 'vue-router';
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
import { useSettingsStore } from '@n8n/stores/settings.store';
import OemPrototypeTopBar from '@/features/oemPrototype/components/OemPrototypeTopBar.vue';
import OemPrototypeWarning from '@/features/oemPrototype/components/OemPrototypeWarning.vue';
import { isOemPrototypeTicket } from '@/features/oemPrototype/oemPrototype.constants';

const { layoutProps } = useLayoutProps();
const assistantStore = useAssistantStore();
const chatHubPanelStore = useChatHubPanelStore();
const pushConnectionStore = usePushConnectionStore();
const settingsStore = useSettingsStore();
const isCanvasOnly = settingsStore.isCanvasOnly;
const route = useRoute();
const isOemPrototype = computed(() => route.meta.oemPrototype === true);
const oemPrototypeTicket = computed(() =>
	isOemPrototypeTicket(route.params.ticket) ? route.params.ticket : undefined,
);

const {
	isLoading,
	workflowId,
	currentWorkflowDocumentStore,
	isOnboardingRoute,
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
			<div
				v-if="isOemPrototype"
				:class="$style.prototypeHeader"
				data-test-id="oem-prototype-header"
			>
				<OemPrototypeTopBar />
				<OemPrototypeWarning v-if="oemPrototypeTicket === 'API-305'" />
				<AppHeader v-if="!isCanvasOnly" />
			</div>
			<AppHeader v-else />
		</template>
		<template v-if="!isCanvasOnly && !isOemPrototype" #sidebar>
			<AppSidebar />
		</template>
		<!-- Gate on a non-null document store, not just isLoading: during a load/switch the
		provided store is briefly null (disposed before the new one is created), and NodeView's
		strict injectNDVStore() reads throw if it mounts in that window. Mirrors WorkflowCanvasHostBody's isReady.
		Exclude the onboarding route: it renders a redirect-only view that never provides a
		document store and must mount so its onMounted redirect can fire. -->
		<div v-if="isOemPrototype" :class="$style.prototype">
			<div :class="$style.prototypeCanvas" data-test-id="oem-prototype-canvas-area">
				<LoadingView v-if="isLoading || (!currentWorkflowDocumentStore && !isOnboardingRoute)" />
				<RouterView v-else />
			</div>
		</div>
		<template v-else>
			<LoadingView v-if="isLoading || (!currentWorkflowDocumentStore && !isOnboardingRoute)" />
			<RouterView v-else />
		</template>
		<template v-if="layoutProps.logs" #footer>
			<LogsPanel />
		</template>
		<template v-if="!isCanvasOnly" #overlays>
			<AskAssistantFloatingButton v-if="assistantStore.isFloatingButtonShown" />
			<CanvasChatOverlay v-if="chatHubPanelStore.isFloatingChatEnabled" />
		</template>
	</BaseLayout>
</template>

<style lang="scss" module>
.prototypeHeader {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.prototype {
	display: flex;
	flex: 1;
	min-width: 0;
	min-height: 0;
	flex-direction: column;
}

.prototypeCanvas {
	position: relative;
	display: flex;
	flex: 1;
	min-width: 0;
	min-height: 0;
}
</style>
