<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';

// Components
import ChatMessagesPanel from './components/ChatMessagesPanel.vue';
import ChatLogsPanel from './components/ChatLogsPanel.vue';

// Composables
import { useResize } from './composables/useResize';

// Types
import { useCanvasStore } from '@/stores/canvas.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useChatState } from '@/components/CanvasChat/composables/useChatState';

const workflowsStore = useWorkflowsStore();
const canvasStore = useCanvasStore();

// Component state
const isDisabled = ref(false);
const container = ref<HTMLElement>();

// Computed properties
const workflow = computed(() => workflowsStore.getCurrentWorkflow());

const isChatOpen = computed(() => {
	const result = workflowsStore.isChatPanelOpen;
	return result;
});

const isLogsOpen = computed(() => workflowsStore.isLogsPanelOpen);
const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);
const resultData = computed(() => workflowsStore.getWorkflowRunData);

const {
	height,
	chatWidth,
	rootStyles,
	logsWidth,
	onResizeDebounced,
	onResizeChatDebounced,
	onWindowResize,
} = useResize(container);

const {
	currentSessionId,
	messages,
	chatTriggerNode,
	connectedNode,
	sendMessage,
	refreshSession,
	displayExecution,
} = useChatState(isDisabled, onWindowResize);

// Expose internal state for testing
defineExpose({
	messages,
	currentSessionId,
	isDisabled,
	workflow,
});

const closePanel = () => {
	workflowsStore.setPanelOpen('chat', false);
};

watchEffect(() => {
	canvasStore.setPanelHeight(isChatOpen.value || isLogsOpen.value ? height.value : 0);
});
</script>

<template>
	<N8nResizeWrapper
		v-if="chatTriggerNode"
		:is-resizing-enabled="isChatOpen || isLogsOpen"
		:supported-directions="['top']"
		:class="[$style.resizeWrapper, !isChatOpen && !isLogsOpen && $style.empty]"
		:height="height"
		:style="rootStyles"
		@resize="onResizeDebounced"
	>
		<div ref="container" :class="[$style.container, 'ignore-key-press-canvas']" tabindex="0">
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
							:show-close-button="!connectedNode"
							@close="closePanel"
							@refresh-session="refreshSession"
							@display-execution="displayExecution"
							@send-message="sendMessage"
						/>
					</div>
				</n8n-resize-wrapper>
				<div v-if="isLogsOpen && connectedNode" :class="$style.logs">
					<ChatLogsPanel
						:key="`${resultData?.length ?? messages?.length}`"
						:workflow="workflow"
						data-test-id="canvas-chat-logs"
						:node="connectedNode"
						:slim="logsWidth < 700"
						@close="closePanel"
					/>
				</div>
			</div>
		</div>
	</N8nResizeWrapper>
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
