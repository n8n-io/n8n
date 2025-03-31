<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { N8nIconButton, N8nResizeWrapper, N8nTooltip } from '@n8n/design-system';
import { useChatState } from '@/components/CanvasChat/composables/useChatState';
import { useResize } from '@/components/CanvasChat/composables/useResize';
import { usePiPWindow } from '@/components/CanvasChat/composables/usePiPWindow';
import { useTelemetry } from '@/composables/useTelemetry';
import { CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import LogsOverviewPanel from '@/components/CanvasChat/future/components/LogsOverviewPanel.vue';
import { useCanvasStore } from '@/stores/canvas.store';
import { useI18n } from '@/composables/useI18n';
import { useStyles } from '@/composables/useStyles';
import ChatMessagesPanel from '@/components/CanvasChat/components/ChatMessagesPanel.vue';
import LogsDetailsPanel from '@/components/CanvasChat/future/components/LogDetailsPanel.vue';
import { type LogEntryIdentity } from '@/components/CanvasChat/types/logs';
import { useMounted } from '@vueuse/core';

const workflowsStore = useWorkflowsStore();
const canvasStore = useCanvasStore();
const panelState = computed(() => workflowsStore.chatPanelState);
const container = ref<HTMLElement>();
const overviewPanelActions = useTemplateRef<HTMLElement>('overviewPanelActions');
const detailsPanelActions = useTemplateRef<HTMLElement>('detailsPanelActions');
const selectedLogEntry = ref<LogEntryIdentity | undefined>(undefined);
const pipContainer = useTemplateRef('pipContainer');
const pipContent = useTemplateRef('pipContent');
const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);
const hasChat = computed(() =>
	workflowsStore.workflowTriggerNodes.some((node) =>
		[CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE].includes(node.type),
	),
);
const locales = useI18n();

const telemetry = useTelemetry();

const { rootStyles, height, chatWidth, onWindowResize, onResizeDebounced, onResizeChatDebounced } =
	useResize(container);

const { currentSessionId, messages, connectedNode, sendMessage, refreshSession, displayExecution } =
	useChatState(ref(false), onWindowResize);
const appStyles = useStyles();
const tooltipZIndex = computed(() => appStyles.APP_Z_INDEXES.ASK_ASSISTANT_FLOATING_BUTTON + 100);
const isMounted = useMounted();
const panelActionsContainer = computed(() =>
	isMounted
		? selectedLogEntry.value
			? detailsPanelActions.value
			: overviewPanelActions.value
		: null,
);

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

const popOutButtonText = computed(() => locales.baseText('runData.panel.actions.popOut'));

const toggleButtonText = computed(() =>
	locales.baseText(
		panelState.value === 'attached'
			? 'runData.panel.actions.collapse'
			: 'runData.panel.actions.open',
	),
);

function handleToggleOpen() {
	if (panelState.value === 'closed') {
		telemetry.track('User toggled log view', { new_state: 'attached' });
		workflowsStore.setPanelState('attached');
	} else {
		telemetry.track('User toggled log view', { new_state: 'collapsed' });
		workflowsStore.setPanelState('closed');
	}
}

function handleClickHeader() {
	if (panelState.value === 'closed') {
		telemetry.track('User toggled log view', { new_state: 'attached' });
		workflowsStore.setPanelState('attached');
	}
}

function handleSelectLogEntry(selected: LogEntryIdentity | undefined) {
	selectedLogEntry.value = selected;
}

function onPopOut() {
	telemetry.track('User toggled log view', { new_state: 'floating' });
	workflowsStore.setPanelState('floating');
}

watch([panelState, height], ([state, h]) => {
	canvasStore.setPanelHeight(
		state === 'floating' ? 0 : state === 'attached' ? h : 32 /* collapsed panel height */,
	);
});
</script>

<template>
	<div ref="pipContainer">
		<div ref="pipContent" :class="$style.pipContent">
			<N8nResizeWrapper
				:height="height"
				:supported-directions="['top']"
				:is-resizing-enabled="panelState === 'attached'"
				:style="rootStyles"
				:class="[$style.resizeWrapper, panelState === 'closed' ? '' : $style.isOpen]"
				@resize="onResizeDebounced"
			>
				<div ref="container" :class="[$style.container, 'ignore-key-press-canvas']" tabindex="0">
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
							:is-new-logs-enabled="true"
							@close="handleToggleOpen"
							@refresh-session="refreshSession"
							@display-execution="displayExecution"
							@send-message="sendMessage"
							@click-header="handleClickHeader"
						/>
					</N8nResizeWrapper>
					<LogsOverviewPanel
						:class="$style.logsOverview"
						:is-open="panelState !== 'closed'"
						:node="connectedNode"
						:selected="selectedLogEntry"
						@click-header="handleClickHeader"
						@select="handleSelectLogEntry"
					>
						<template #actions><div ref="overviewPanelActions" /></template>
					</LogsOverviewPanel>
					<LogsDetailsPanel
						v-if="selectedLogEntry"
						:class="$style.logDetails"
						:is-open="panelState !== 'closed'"
						@click-header="handleClickHeader"
						><template #actions><div ref="detailsPanelActions" /></template
					></LogsDetailsPanel>
				</div>
			</N8nResizeWrapper>
		</div>
		<Teleport v-if="panelActionsContainer !== null" :to="panelActionsContainer">
			<div>
				<N8nTooltip
					v-if="canPopOut && !isPoppedOut"
					:z-index="tooltipZIndex"
					:content="popOutButtonText"
				>
					<N8nIconButton
						icon="pop-out"
						type="secondary"
						size="small"
						icon-size="medium"
						:aria-label="popOutButtonText"
						@click="onPopOut"
					/>
				</N8nTooltip>
				<N8nTooltip
					v-if="panelState !== 'floating'"
					:z-index="tooltipZIndex"
					:content="toggleButtonText"
				>
					<N8nIconButton
						type="secondary"
						size="small"
						icon-size="medium"
						:icon="panelState === 'attached' ? 'chevron-down' : 'chevron-up'"
						:aria-label="toggleButtonText"
						style="color: var(--color-text-base)"
						@click.stop="handleToggleOpen"
					/>
				</N8nTooltip>
			</div>
		</Teleport>
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
