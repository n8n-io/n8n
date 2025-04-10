<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { N8nResizeWrapper } from '@n8n/design-system';
import { useChatState } from '@/components/CanvasChat/composables/useChatState';
import { useResize } from '@/components/CanvasChat/composables/useResize';
import { usePiPWindow } from '@/components/CanvasChat/composables/usePiPWindow';
import { useTelemetry } from '@/composables/useTelemetry';
import { CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import LogsOverviewPanel from '@/components/CanvasChat/future/components/LogsOverviewPanel.vue';
import { useCanvasStore } from '@/stores/canvas.store';
import ChatMessagesPanel from '@/components/CanvasChat/components/ChatMessagesPanel.vue';
import LogsDetailsPanel from '@/components/CanvasChat/future/components/LogDetailsPanel.vue';
import { LOGS_PANEL_STATE, type LogEntryIdentity } from '@/components/CanvasChat/types/logs';
import LogsPanelActions from '@/components/CanvasChat/future/components/LogsPanelActions.vue';

const workflowsStore = useWorkflowsStore();
const canvasStore = useCanvasStore();
const panelState = computed(() => workflowsStore.logsPanelState);
const container = ref<HTMLElement>();
const selectedLogEntry = ref<LogEntryIdentity | undefined>(undefined);
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

const { currentSessionId, messages, sendMessage, refreshSession, displayExecution } = useChatState(
	ref(false),
	onWindowResize,
);
const isLogDetailsOpen = computed(() => selectedLogEntry.value !== undefined);

const { canPopOut, isPoppedOut, pipWindow } = usePiPWindow({
	initialHeight: 400,
	initialWidth: window.document.body.offsetWidth * 0.8,
	container: pipContainer,
	content: pipContent,
	shouldPopOut: computed(() => panelState.value === LOGS_PANEL_STATE.FLOATING),
	onRequestClose: () => {
		if (panelState.value === LOGS_PANEL_STATE.CLOSED) {
			return;
		}

		telemetry.track('User toggled log view', { new_state: 'attached' });
		workflowsStore.setPreferPoppedOutLogsView(false);
	},
});
const logsPanelActionsProps = computed<InstanceType<typeof LogsPanelActions>['$props']>(() => ({
	panelState: panelState.value,
	showPopOutButton: canPopOut.value && !isPoppedOut.value,
	onPopOut,
	onToggleOpen,
}));

function onToggleOpen() {
	workflowsStore.toggleLogsPanelOpen();

	telemetry.track('User toggled log view', {
		new_state: panelState.value === LOGS_PANEL_STATE.CLOSED ? 'attached' : 'collapsed',
	});
}

function handleClickHeader() {
	if (panelState.value === LOGS_PANEL_STATE.CLOSED) {
		telemetry.track('User toggled log view', { new_state: 'attached' });
		workflowsStore.toggleLogsPanelOpen(true);
	}
}

function handleSelectLogEntry(selected: LogEntryIdentity | undefined) {
	selectedLogEntry.value = selected;
}

function onPopOut() {
	telemetry.track('User toggled log view', { new_state: 'floating' });
	workflowsStore.toggleLogsPanelOpen(true);
	workflowsStore.setPreferPoppedOutLogsView(true);
}

watch([panelState, height], ([state, h]) => {
	canvasStore.setPanelHeight(
		state === LOGS_PANEL_STATE.FLOATING
			? 0
			: state === LOGS_PANEL_STATE.ATTACHED
				? h
				: 32 /* collapsed panel height */,
	);
});
</script>

<template>
	<div ref="pipContainer">
		<div ref="pipContent" :class="$style.pipContent">
			<N8nResizeWrapper
				:height="height"
				:supported-directions="['top']"
				:is-resizing-enabled="panelState === LOGS_PANEL_STATE.ATTACHED"
				:style="rootStyles"
				:class="[$style.resizeWrapper, panelState === LOGS_PANEL_STATE.CLOSED ? '' : $style.isOpen]"
				@resize="onResizeDebounced"
			>
				<div ref="container" :class="[$style.container, 'ignore-key-press-canvas']" tabindex="0">
					<N8nResizeWrapper
						v-if="hasChat"
						:supported-directions="['right']"
						:is-resizing-enabled="panelState !== LOGS_PANEL_STATE.CLOSED"
						:width="chatWidth"
						:class="$style.chat"
						:window="pipWindow"
						@resize="onResizeChatDebounced"
					>
						<ChatMessagesPanel
							data-test-id="canvas-chat"
							:is-open="panelState !== LOGS_PANEL_STATE.CLOSED"
							:messages="messages"
							:session-id="currentSessionId"
							:past-chat-messages="previousChatMessages"
							:show-close-button="false"
							:is-new-logs-enabled="true"
							@close="onToggleOpen"
							@refresh-session="refreshSession"
							@display-execution="displayExecution"
							@send-message="sendMessage"
							@click-header="handleClickHeader"
						/>
					</N8nResizeWrapper>
					<LogsOverviewPanel
						:class="$style.logsOverview"
						:is-open="panelState !== LOGS_PANEL_STATE.CLOSED"
						:selected="selectedLogEntry"
						@click-header="handleClickHeader"
						@select="handleSelectLogEntry"
					>
						<template #actions>
							<LogsPanelActions v-if="!isLogDetailsOpen" v-bind="logsPanelActionsProps" />
						</template>
					</LogsOverviewPanel>
					<LogsDetailsPanel
						v-if="selectedLogEntry"
						:class="$style.logDetails"
						:is-open="panelState !== LOGS_PANEL_STATE.CLOSED"
						@click-header="handleClickHeader"
					>
						<template #actions>
							<LogsPanelActions v-if="isLogDetailsOpen" v-bind="logsPanelActionsProps" />
						</template>
					</LogsDetailsPanel>
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
	position: relative;
	overflow: hidden;
}

.resizeWrapper {
	height: 100%;
	min-height: 0;
	flex-basis: 0;
	border-top: var(--border-base);
	background-color: var(--color-background-light);

	&.isOpen {
		height: var(--panel-height);
		min-height: 4rem;
		max-height: 90vh;
		flex-basis: content;
	}
}

.container {
	height: 100%;
	display: flex;
	flex-grow: 1;

	& > *:not(:last-child) {
		border-right: var(--border-base);
	}
}

.chat {
	width: var(--chat-width);
	flex-shrink: 0;
	max-width: 100%;
}

.logsOverview {
	flex-basis: 20%;
	flex-grow: 1;
	flex-shrink: 1;
	min-width: 360px;
}

.logDetails {
	flex-basis: 60%;
	flex-grow: 1;
	flex-shrink: 1;
}
</style>
