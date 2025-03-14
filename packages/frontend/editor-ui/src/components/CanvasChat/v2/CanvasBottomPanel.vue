<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, ref, useTemplateRef } from 'vue';
import { N8nIconButton, N8nResizeWrapper } from '@n8n/design-system';
import { useChatState } from '@/components/CanvasChat/composables/useChatState';
import { useResize } from '@/components/CanvasChat/composables/useResize';
import { usePiPWindow } from '@/components/CanvasChat/composables/usePiPWindow';
import { useTelemetry } from '@/composables/useTelemetry';
import { CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE } from '@/constants';

const workflowsStore = useWorkflowsStore();
const panelState = computed(() => workflowsStore.chatPanelState);
const container = ref<HTMLElement>();
const pipContainer = useTemplateRef('pipContainer');
const pipContent = useTemplateRef('pipContent');
const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);
const hasChat = computed(() =>
	workflowsStore.workflowTriggerNodes.some((node) =>
		[CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE].includes(node.type),
	),
);

const telemetry = useTelemetry();

const { rootStyles, height, chatWidth, onWindowResize, onResizeDebounced, onResizeChatDebounced } =
	useResize(container);

const { currentSessionId, messages, connectedNode, sendMessage, refreshSession, displayExecution } =
	useChatState(ref(false), onWindowResize);

const { canPopOut, isPoppedOut, pipWindow } = usePiPWindow({
	initialHeight: 400,
	initialWidth: window.document.body.offsetWidth * 0.8,
	container: pipContainer,
	content: pipContent,
	shouldPopOut: computed(() => panelState.value === 'floating'),
	onRequestClose: () => {
		if (panelState.value === 'closed') {
			return;
		}

		telemetry.track('User toggled log view', { new_state: 'attached' });
		workflowsStore.setPanelState('attached');
	},
});

function handleToggleOpen() {
	workflowsStore.setPanelState(panelState.value === 'closed' ? 'attached' : 'closed');
}

function handleClickHeader() {
	if (panelState.value === 'closed') {
		workflowsStore.setPanelState('attached');
	}
}

function onPopOut() {
	telemetry.track('User toggled log view', { new_state: 'floating' });
	workflowsStore.setPanelState('floating');
}
</script>

<template>
	<div ref="pipContainer">
		<div ref="pipContent" :class="$style.pipContent">
			<N8nResizeWrapper
				:height="height"
				:supported-directions="['top']"
				:is-resizing-enabled="true"
				:style="rootStyles"
				:class="[$style.resizeWrapper, panelState === 'closed' ? '' : $style.isOpen]"
				@resize="onResizeDebounced"
			>
				<div ref="container" :class="$style.container">
					<N8nResizeWrapper
						v-if="hasChat"
						:supported-directions="['right']"
						:is-resizing-enabled="panelState !== 'closed'"
						:width="chatWidth"
						:class="$style.chat"
						:window="pipWindow"
						@resize="onResizeChatDebounced"
					>
						<ChatMessagesPanel
							data-test-id="canvas-chat"
							:is-open="panelState !== 'closed'"
							:messages="messages"
							:session-id="currentSessionId"
							:past-chat-messages="previousChatMessages"
							:show-close-button="false"
							:simplify-session-id="true"
							:show-empty-message="true"
							@close="handleToggleOpen"
							@refresh-session="refreshSession"
							@display-execution="displayExecution"
							@send-message="sendMessage"
							@click-header="handleClickHeader"
						/>
					</N8nResizeWrapper>
					<LogsPanel :is-open="panelState !== 'closed'" @click-header="handleClickHeader">
						<template #actions>
							<N8nIconButton
								v-if="canPopOut && !isPoppedOut"
								icon="pop-out"
								type="secondary"
								size="medium"
								@click="onPopOut" />
							<N8nIconButton
								v-if="panelState !== 'floating'"
								type="secondary"
								size="small"
								:icon="panelState === 'attached' ? 'chevron-down' : 'chevron-up'"
								@click.stop="handleToggleOpen"
						/></template>
					</LogsPanel>
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
	height: auto;
	min-height: 0;
	flex-basis: 0;
	border-top: 1px solid var(--color-foreground-base);
	background-color: var(--color-background-light);
	display: flex;
	align-items: stretch;
	justify-content: stretch;

	&.isOpen {
		height: var(--panel-height);
		min-height: 4rem;
		max-height: 90vh;
		flex-basis: content;
	}
}

.container {
	display: flex;
	flex-grow: 1;

	& > *:not(:last-child) {
		border-right: 1px solid var(--color-foreground-base);
	}
}

.chat {
	width: var(--chat-width);
	flex-shrink: 0;
	max-width: 100%;
}
</style>
