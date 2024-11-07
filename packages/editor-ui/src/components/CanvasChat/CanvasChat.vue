<script setup lang="ts">
import { provide, watch, computed, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { v4 as uuid } from 'uuid';

// Constants & Symbols
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import { VIEWS } from '@/constants';

// Components
import ChatMessagesPanel from './components/ChatMessagesPanel.vue';
import ChatLogsPanel from './components/ChatLogsPanel.vue';

// Composables
import { useChatTrigger } from './composables/useChatTrigger';
import { useChatMessaging } from './composables/useChatMessaging';
import { useResize } from './composables/useResize';
import { useI18n } from '@/composables/useI18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useRunWorkflow } from '@/composables/useRunWorkflow';

// Event Bus
import { chatEventBus } from '@n8n/chat/event-buses';

// Stores
import { useCanvasStore } from '@/stores/canvas.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

// Types
import type { Chat, ChatMessage, ChatOptions } from '@n8n/chat/types';
import type { RunWorkflowChatPayload } from './composables/useChatMessaging';

// Initialize stores and composables
const setupStores = () => {
	const router = useRouter();
	const uiStore = useUIStore();
	const locale = useI18n();
	const nodeHelpers = useNodeHelpers();
	const workflowsStore = useWorkflowsStore();
	const canvasStore = useCanvasStore();
	const nodeTypesStore = useNodeTypesStore();

	return {
		router,
		uiStore,
		locale,
		nodeHelpers,
		workflowsStore,
		canvasStore,
		nodeTypesStore,
	};
};

// Component state
const setupState = () => {
	const messages = ref<ChatMessage[]>([]);
	const currentSessionId = ref<string>(uuid().replace(/-/g, ''));
	const isDisabled = ref(false);
	const container = ref<HTMLElement>();

	return {
		messages,
		currentSessionId,
		isDisabled,
		container,
	};
};

// Initialize component
const { router, uiStore, locale, nodeHelpers, workflowsStore, canvasStore, nodeTypesStore } =
	setupStores();

const { messages, currentSessionId, isDisabled, container } = setupState();

// Computed properties
const setupComputed = () => {
	const workflow = computed(() => workflowsStore.getCurrentWorkflow());
	const isLoading = computed(() => uiStore.isActionActive.workflowRunning);
	const allConnections = computed(() => workflowsStore.allConnections);
	const isChatOpen = computed(() => workflowsStore.isChatPanelOpen);
	const isLogsOpen = computed(() => workflowsStore.isLogsPanelOpen);
	const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);

	return {
		workflow,
		isLoading,
		allConnections,
		isChatOpen,
		isLogsOpen,
		previousChatMessages,
	};
};

const { workflow, isLoading, allConnections, isChatOpen, isLogsOpen, previousChatMessages } =
	setupComputed();

// Initialize features
const { runWorkflow } = useRunWorkflow({ router });

const { chatTriggerNode, connectedNode, allowFileUploads, setChatTriggerNode, setConnectedNode } =
	useChatTrigger({
		workflow,
		getNodeByName: workflowsStore.getNodeByName,
		getNodeType: nodeTypesStore.getNodeType,
	});

const { sendMessage, getChatMessages } = useChatMessaging({
	chatTrigger: chatTriggerNode,
	connectedNode,
	messages,
	sessionId: currentSessionId,
	workflow,
	isLoading,
	executionResultData: computed(() => workflowsStore.getWorkflowExecution?.data?.resultData),
	getWorkflowResultDataByNodeName: workflowsStore.getWorkflowResultDataByNodeName,
	onRunChatWorkflow,
});

const {
	height,
	chatWidth,
	rootStyles,
	logsWidth,
	onResizeDebounced,
	onResizeChatDebounced,
	onWindowResize,
} = useResize(container);

// Chat configuration
const setupChatConfig = (): { chatConfig: Chat; chatOptions: ChatOptions } => {
	const chatConfig: Chat = {
		messages,
		sendMessage,
		initialMessages: ref([]),
		currentSessionId,
		waitingForResponse: isLoading,
	};

	const chatOptions: ChatOptions = {
		i18n: {
			en: {
				title: '',
				footer: '',
				subtitle: '',
				inputPlaceholder: locale.baseText('chat.window.chat.placeholder'),
				getStarted: '',
				closeButtonTooltip: '',
			},
		},
		webhookUrl: '',
		mode: 'window',
		showWindowCloseButton: true,
		disabled: isDisabled,
		allowFileUploads,
		allowedFilesMimeTypes: '',
	};

	return { chatConfig, chatOptions };
};

const { chatConfig, chatOptions } = setupChatConfig();

// Methods
const displayExecution = (executionId: string) => {
	const route = router.resolve({
		name: VIEWS.EXECUTION_PREVIEW,
		params: { name: workflow.value.id, executionId },
	});
	window.open(route.href, '_blank');
};

const refreshSession = () => {
	workflowsStore.setWorkflowExecutionData(null);
	nodeHelpers.updateNodesExecutionIssues();
	messages.value = [];
	currentSessionId.value = uuid().replace(/-/g, '');
};

const closeLogs = () => {
	workflowsStore.setPanelOpen('logs', false);
};

async function onRunChatWorkflow(payload: RunWorkflowChatPayload) {
	const response = await runWorkflow({
		triggerNode: payload.triggerNode,
		nodeData: payload.nodeData,
		source: payload.source,
	});

	workflowsStore.appendChatMessage(payload.message);
	return response;
}

// Provide chat context
provide(ChatSymbol, chatConfig);
provide(ChatOptionsSymbol, chatOptions);

// Watchers
watch(
	() => isChatOpen.value,
	(isOpen) => {
		if (isOpen) {
			setChatTriggerNode();
			setConnectedNode();

			if (messages.value.length === 0) {
				messages.value = getChatMessages();
			}

			setTimeout(() => {
				onWindowResize();
				chatEventBus.emit('focusInput');
			}, 0);
		}
	},
);

watch(
	() => allConnections.value,
	() => {
		if (canvasStore.isLoading) return;
		setTimeout(() => {
			if (!chatTriggerNode.value) {
				setChatTriggerNode();
			}
			setConnectedNode();
		}, 0);
	},
	{ deep: true },
);

watchEffect(() => {
	canvasStore.setPanelHeight(isChatOpen.value || isLogsOpen.value ? height.value : 0);
});
</script>

<template>
	<n8n-resize-wrapper
		v-if="chatTriggerNode"
		:is-resizing-enabled="isChatOpen || isLogsOpen"
		:supported-directions="['top']"
		:class="[$style.resizeWrapper, !isChatOpen && !isLogsOpen && $style.empty]"
		:height="height"
		:style="rootStyles"
		@resize="onResizeDebounced"
	>
		<div ref="container" :class="$style.container">
			<div v-if="isChatOpen || isLogsOpen" :class="$style.chatResizer">
				<n8n-resize-wrapper
					v-if="isChatOpen"
					:supported-directions="['right']"
					:width="chatWidth"
					:class="$style.chat"
					@resize="onResizeChatDebounced"
				>
					<div :class="$style.inner">
						<ChatMessagesPanel
							data-test-id="canvas-chat"
							:messages="messages"
							:session-id="currentSessionId"
							:past-chat-messages="previousChatMessages"
							@refresh-session="refreshSession"
							@display-execution="displayExecution"
							@send-message="sendMessage"
						/>
					</div>
				</n8n-resize-wrapper>
				<div v-if="isLogsOpen && connectedNode" :class="$style.logs">
					<ChatLogsPanel
						:key="messages.length"
						:workflow="workflow"
						data-test-id="canvas-chat-logs"
						:node="connectedNode"
						:slim="logsWidth < 700"
						@close="closeLogs"
					/>
				</div>
			</div>
		</div>
	</n8n-resize-wrapper>
</template>

<style lang="scss" module>
.resizeWrapper {
	height: var(--panel-height);
	min-height: 4rem;
	max-height: 90vh;
	flex-basis: content;
	border-top: 1px solid var(--color-foreground-base);

	&.empty {
		height: auto;
		min-height: 0;
		flex-basis: 0;
	}
}

.container {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.chatResizer {
	display: flex;
	width: 100%;
	height: 100%;
	max-width: 100%;
}

.footer {
	border-top: 1px solid var(--color-foreground-base);
	width: 100%;
	background-color: var(--color-background-light);
	display: flex;
	padding: var(--spacing-2xs);
	gap: var(--spacing-2xs);
}

.chat {
	width: var(--chat-width);
	flex-shrink: 0;
	border-right: 1px solid var(--color-foreground-base);
	max-width: 100%;

	&:only-child {
		width: 100%;
	}
}

.inner {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	height: 100%;
	width: 100%;
}

.logs {
	flex-grow: 1;
	flex-shrink: 1;
	background-color: var(--color-background-light);
}
</style>
