<script setup lang="ts">
import { provide, watch, computed, ref, watchEffect } from 'vue';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRouter } from 'vue-router';
import { chatEventBus } from '@n8n/chat/event-buses';
import { useCanvasStore } from '@/stores/canvas.store';
import { VIEWS } from '@/constants';
import ChatMessagesPanel from './components/ChatMessagesPanel.vue';
import ChatLogsPanel from './components/ChatLogsPanel.vue';
import { useChatTrigger } from './composables/useChatTrigger';
import { useChatMessaging } from './composables/useChatMessaging';
import { useResize } from './composables/useResize';
import type { Chat, ChatMessage, ChatOptions } from '@n8n/chat/types';
import { useUIStore } from '@/stores/ui.store';
import { useI18n } from '@/composables/useI18n';
import { v4 as uuid } from 'uuid';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';

const router = useRouter();
const uiStore = useUIStore();
const locale = useI18n();
const { getCurrentWorkflow } = useWorkflowHelpers({ router });
const nodeHelpers = useNodeHelpers();
const workflowsStore = useWorkflowsStore();
const canvasStore = useCanvasStore();

const messages = ref<ChatMessage[]>([]);
const currentSessionId = ref<string>(uuid());
const isDisabled = ref(false);
const container = ref<HTMLElement>();

const { chatTriggerNode, connectedNode, allowFileUploads, setChatTriggerNode, setConnectedNode } =
	useChatTrigger({ router });

const { sendMessage, getChatMessages } = useChatMessaging({
	chatTrigger: chatTriggerNode,
	messages,
	router,
	sessionId: currentSessionId,
});

const { height, chatWidth, rootStyles, onResizeDebounced, onResizeChatDebounced, onWindowResize } =
	useResize(container);

const isLoading = computed(() => uiStore.isActionActive.workflowRunning);
const allConnections = computed(() => workflowsStore.allConnections);
const isChatOpen = computed(() => canvasStore.isChatPanelOpen);
const isLogsOpen = computed(() => canvasStore.isLogsPanelOpen);
const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);

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

function displayExecution(executionId: string) {
	const workflow = getCurrentWorkflow();
	const route = router.resolve({
		name: VIEWS.EXECUTION_PREVIEW,
		params: { name: workflow.id, executionId },
	});
	window.open(route.href, '_blank');
}

function refreshSession() {
	workflowsStore.setWorkflowExecutionData(null);
	nodeHelpers.updateNodesExecutionIssues();
	messages.value = [];
	currentSessionId.value = uuid();
}

function toggleChat() {
	canvasStore.setPanelOpen('chat', !isChatOpen.value);
}

function toggleLogs() {
	canvasStore.setPanelOpen('logs', !isLogsOpen.value);
}

function closeLogs() {
	canvasStore.setPanelOpen('logs', false);
}

provide(ChatSymbol, chatConfig);
provide(ChatOptionsSymbol, chatOptions);

watch(
	() => isChatOpen.value,
	(isOpen) => {
		if (isOpen) {
			setChatTriggerNode();
			setConnectedNode();
			messages.value = getChatMessages();

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
	canvasStore.setPanelHeight(isChatOpen.value || isLogsOpen.value ? height.value : 40);
});
</script>

<template>
	<n8n-resize-wrapper
		v-show="chatTriggerNode"
		:is-resizing-enabled="isChatOpen || isLogsOpen"
		:supported-directions="['top']"
		:class="[$style.resizeWrapper, !isChatOpen && !isLogsOpen && $style.empty]"
		:height="height"
		data-test-id="ask-assistant-sidebar"
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
					<ChatLogsPanel :key="messages.length" :node="connectedNode" @close="closeLogs" />
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
	z-index: 300;
	border-top: 1px solid var(--color-foreground-base);

	&.empty {
		height: auto;
		min-height: 0;
		flex-basis: 0;
	}

	* {
		& ::-webkit-scrollbar {
			width: 4px;
		}

		& ::-webkit-scrollbar-thumb {
			border-radius: var(--border-radius-base);
			background: var(--color-foreground-dark);
			border: 1px solid white;
		}

		& ::-webkit-scrollbar-thumb:hover {
			background: var(--color-foreground-xdark);
		}
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
	overflow: hidden;
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
