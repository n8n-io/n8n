<script setup lang="ts">
import { provide, watch, computed, ref } from 'vue';
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
import { ResizeData } from 'n8n-design-system/components/N8nResizeWrapper/ResizeWrapper.vue';

const router = useRouter();
const uiStore = useUIStore();
const locale = useI18n();
const { getCurrentWorkflow } = useWorkflowHelpers({ router });
const nodeHelpers = useNodeHelpers();
const workflowsStore = useWorkflowsStore();

const messages = ref<ChatMessage[]>([]);
const currentSessionId = ref<string>(uuid());
const isDisabled = ref(false);
const container = ref<HTMLElement>();
const {
	chatTriggerNode,
	node,
	allowFileUploads,
	setChatTriggerNode,
	setConnectedNode,
	setLogsSourceNode,
} = useChatTrigger({ router });
console.log('🚀 ~ allowFileUploads:', allowFileUploads);

const { sendMessage, getChatMessages } = useChatMessaging({
	chatTrigger: chatTriggerNode,
	messages,
	router,
	sessionId: currentSessionId,
});

const { height, chatWidth, rootStyles, onResizeDebounced, onResizeChatDebounced } =
	useResize(container);

const isLoading = computed(() => uiStore.isActionActive.workflowRunning);

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

provide(ChatSymbol, chatConfig);
provide(ChatOptionsSymbol, chatOptions);

const canvasStore = useCanvasStore();
watch(
	() => canvasStore.isLoading,
	() => {
		setChatTriggerNode();
		setConnectedNode();
		messages.value = getChatMessages();

		setTimeout(() => chatEventBus.emit('focusInput'), 0);
	},
);

// Update logs source node when messages change
watch(
	() => messages.value.length,
	() => {
		setLogsSourceNode();
	},
);

function refreshSession() {
	workflowsStore.setWorkflowExecutionData(null);
	nodeHelpers.updateNodesExecutionIssues();
	messages.value = [];
	currentSessionId.value = uuid();
}
</script>

<template>
	<n8n-resize-wrapper
		v-show="true"
		:supported-directions="['top']"
		:class="$style.container"
		:height="height"
		data-test-id="ask-assistant-sidebar"
		:style="rootStyles"
		@resize="onResizeDebounced"
	>
		<div ref="container" :class="$style.content">
			<n8n-resize-wrapper
				v-show="true"
				:supported-directions="['right']"
				:width="chatWidth"
				:class="$style.chat"
				@resize="onResizeChatDebounced"
			>
				<div :class="$style.inner">
					<ChatMessagesPanel
						:messages="messages"
						:session-id="currentSessionId"
						@refresh-session="refreshSession"
						@display-execution="displayExecution"
						@send-message="sendMessage"
					/>
				</div>
			</n8n-resize-wrapper>
			<div :class="$style.logs">
				<ChatLogsPanel :node="node" :messages-length="messages.length" />
			</div>
		</div>
	</n8n-resize-wrapper>
</template>

<style lang="scss" module>
.container {
	height: var(--panel-height);
	min-height: 4rem;
	max-height: 90vh;
	flex-basis: content;
	z-index: 300;
	border-top: 1px solid var(--color-foreground-base);
}

.content {
	display: flex;
	width: 100%;
	height: 100%;
	max-width: 100%;
	overflow: hidden;
}

.chat {
	width: var(--chat-width);
	border-right: 1px solid var(--color-foreground-base);
	flex-shrink: 0;
	flex-grow: 0;
	max-width: 100%;
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
}
</style>
