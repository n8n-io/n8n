<script setup lang="ts">
import { computed, ref, watchEffect, useTemplateRef } from 'vue';

// Components
import ChatMessagesPanel from './components/ChatMessagesPanel.vue';
import ChatLogsPanel from './components/ChatLogsPanel.vue';

// Composables
import { useResize } from './composables/useResize';

// Types
import { useCanvasStore } from '@/stores/canvas.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { usePiPWindow } from '@/components/CanvasChat/composables/usePiPWindow';
import { N8nResizeWrapper } from '@n8n/design-system';
import { useTelemetry } from '@/composables/useTelemetry';
import { useChatState } from '@/components/CanvasChat/composables/useChatState';
import { LOGS_PANEL_STATE } from '@/components/CanvasChat/types/logs';

const workflowsStore = useWorkflowsStore();
const canvasStore = useCanvasStore();

// Component state
const container = ref<HTMLElement>();
const pipContainer = useTemplateRef('pipContainer');
const pipContent = useTemplateRef('pipContent');

// Computed properties
const workflow = computed(() => workflowsStore.getCurrentWorkflow());

const chatPanelState = computed(() => workflowsStore.logsPanelState);
const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);
const resultData = computed(() => workflowsStore.getWorkflowRunData);

const telemetry = useTelemetry();

const {
	height,
	chatWidth,
	rootStyles,
	logsWidth,
	onResizeDebounced,
	onResizeChatDebounced,
	onWindowResize,
} = useResize(container);

const { canPopOut, isPoppedOut, pipWindow } = usePiPWindow({
	initialHeight: 400,
	initialWidth: window.document.body.offsetWidth * 0.8,
	container: pipContainer,
	content: pipContent,
	shouldPopOut: computed(() => chatPanelState.value === LOGS_PANEL_STATE.FLOATING),
	onRequestClose: () => {
		if (chatPanelState.value === LOGS_PANEL_STATE.CLOSED) {
			return;
		}

		telemetry.track('User toggled log view', { new_state: 'attached' });
		workflowsStore.setPreferPoppedOutLogsView(false);
	},
});

const {
	currentSessionId,
	messages,
	chatTriggerNode,
	connectedNode,
	sendMessage,
	refreshSession,
	displayExecution,
} = useChatState(false, onWindowResize);

// Expose internal state for testing
defineExpose({
	messages,
	currentSessionId,
	workflow,
});

const closePanel = () => {
	workflowsStore.toggleLogsPanelOpen(false);
};

function onPopOut() {
	telemetry.track('User toggled log view', { new_state: 'floating' });
	workflowsStore.toggleLogsPanelOpen(true);
	workflowsStore.setPreferPoppedOutLogsView(true);
}

// Watchers
watchEffect(() => {
	canvasStore.setPanelHeight(chatPanelState.value === LOGS_PANEL_STATE.ATTACHED ? height.value : 0);
});
</script>

<template>
	<div ref="pipContainer">
		<div ref="pipContent" :class="$style.pipContent">
			<N8nResizeWrapper
				v-if="chatTriggerNode"
				:is-resizing-enabled="!isPoppedOut && chatPanelState === LOGS_PANEL_STATE.ATTACHED"
				:supported-directions="['top']"
				:class="[$style.resizeWrapper, chatPanelState === LOGS_PANEL_STATE.CLOSED && $style.empty]"
				:height="height"
				:style="rootStyles"
				@resize="onResizeDebounced"
			>
				<div ref="container" :class="[$style.container, 'ignore-key-press-canvas']" tabindex="0">
					<div v-if="chatPanelState !== LOGS_PANEL_STATE.CLOSED" :class="$style.chatResizer">
						<N8nResizeWrapper
							:supported-directions="['right']"
							:width="chatWidth"
							:class="$style.chat"
							:window="pipWindow"
							@resize="onResizeChatDebounced"
						>
							<div :class="$style.inner">
								<ChatMessagesPanel
									data-test-id="canvas-chat"
									:messages="messages"
									:session-id="currentSessionId"
									:past-chat-messages="previousChatMessages"
									:show-close-button="!isPoppedOut && !connectedNode"
									@close="closePanel"
									@refresh-session="refreshSession"
									@display-execution="displayExecution"
									@send-message="sendMessage"
								/>
							</div>
						</N8nResizeWrapper>
						<div v-if="connectedNode" :class="$style.logs">
							<ChatLogsPanel
								:key="`${resultData?.length ?? messages?.length}`"
								:workflow="workflow"
								data-test-id="canvas-chat-logs"
								:node="connectedNode"
								:slim="logsWidth < 700"
							>
								<template #actions>
									<n8n-icon-button
										v-if="canPopOut && !isPoppedOut"
										icon="pop-out"
										type="secondary"
										size="medium"
										@click="onPopOut"
									/>
									<n8n-icon-button
										v-if="!isPoppedOut"
										outline
										icon="times"
										type="secondary"
										size="medium"
										@click="closePanel"
									/>
								</template>
							</ChatLogsPanel>
						</div>
					</div>
				</div>
			</N8nResizeWrapper>
		</div>
	</div>
</template>

<style lang="scss" module>
@media all and (display-mode: picture-in-picture) {
	.resizeWrapper {
		height: 100% !important;
		max-height: 100vh !important;
	}
}

.pipContent {
	height: 100%;
}

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
