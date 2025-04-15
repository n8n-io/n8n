<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, ref, useTemplateRef } from 'vue';
import { N8nResizeWrapper } from '@n8n/design-system';
import { useChatState } from '@/components/CanvasChat/composables/useChatState';
import LogsOverviewPanel from '@/components/CanvasChat/future/components/LogsOverviewPanel.vue';
import ChatMessagesPanel from '@/components/CanvasChat/components/ChatMessagesPanel.vue';
import LogsDetailsPanel from '@/components/CanvasChat/future/components/LogDetailsPanel.vue';
import { type LogEntrySelection } from '@/components/CanvasChat/types/logs';
import LogsPanelActions from '@/components/CanvasChat/future/components/LogsPanelActions.vue';
import {
	createLogEntries,
	findLogEntryToAutoSelect,
	type TreeNode,
} from '@/components/RunDataAi/utils';
import { isChatNode } from '@/components/CanvasChat/utils';
import { useLayout } from '@/components/CanvasChat/future/composables/useLayout';

const props = withDefaults(defineProps<{ isReadOnly?: boolean }>(), { isReadOnly: false });

const workflowsStore = useWorkflowsStore();
const container = useTemplateRef('container');
const logsContainer = useTemplateRef('logsContainer');
const pipContainer = useTemplateRef('pipContainer');
const pipContent = useTemplateRef('pipContent');
const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);

const {
	height,
	chatPanelWidth,
	overviewPanelWidth,
	canPopOut,
	isOpen,
	isPoppedOut,
	isCollapsingDetailsPanel,
	isOverviewPanelFullWidth,
	pipWindow,
	onResize,
	onResizeEnd,
	onToggleOpen,
	onPopOut,
	onChatPanelResize,
	onChatPanelResizeEnd,
	onOverviewPanelResize,
	onOverviewPanelResizeEnd,
} = useLayout(pipContainer, pipContent, container, logsContainer);

const { currentSessionId, messages, sendMessage, refreshSession, displayExecution } = useChatState(
	props.isReadOnly,
);

const hasChat = computed(
	() =>
		workflowsStore.workflowTriggerNodes.some(isChatNode) &&
		(!props.isReadOnly || messages.value.length > 0),
);
const workflow = computed(() => workflowsStore.getCurrentWorkflow());
const executionTree = computed<TreeNode[]>(() =>
	createLogEntries(
		workflow.value,
		workflowsStore.workflowExecutionData?.data?.resultData.runData ?? {},
	),
);
const manualLogEntrySelection = ref<LogEntrySelection>({ type: 'initial' });
const autoSelectedLogEntry = computed(() =>
	findLogEntryToAutoSelect(
		executionTree.value,
		workflowsStore.nodesByName,
		workflowsStore.workflowExecutionData?.data?.resultData.runData ?? {},
	),
);
const selectedLogEntry = computed(() =>
	manualLogEntrySelection.value.type === 'initial' ||
	manualLogEntrySelection.value.workflowId !== workflowsStore.workflow.id
		? autoSelectedLogEntry.value
		: manualLogEntrySelection.value.type === 'none'
			? undefined
			: manualLogEntrySelection.value.data,
);
const isLogDetailsOpen = computed(
	() => selectedLogEntry.value !== undefined && !isCollapsingDetailsPanel.value,
);
const isLogDetailsOpenOrCollapsing = computed(() => selectedLogEntry.value !== undefined);
const logsPanelActionsProps = computed<InstanceType<typeof LogsPanelActions>['$props']>(() => ({
	isOpen: isOpen.value,
	showToggleButton: !isPoppedOut.value,
	showPopOutButton: canPopOut.value && !isPoppedOut.value,
	onPopOut,
	onToggleOpen,
}));

function handleSelectLogEntry(selected: TreeNode | undefined) {
	manualLogEntrySelection.value =
		selected === undefined
			? { type: 'none', workflowId: workflowsStore.workflow.id }
			: { type: 'selected', workflowId: workflowsStore.workflow.id, data: selected };
}

function handleResizeOverviewPanelEnd() {
	if (isOverviewPanelFullWidth.value) {
		handleSelectLogEntry(undefined);
	}

	onOverviewPanelResizeEnd();
}
</script>

<template>
	<div ref="pipContainer">
		<div ref="pipContent" :class="$style.pipContent">
			<N8nResizeWrapper
				:height="height"
				:supported-directions="['top']"
				:is-resizing-enabled="!isPoppedOut"
				:class="$style.resizeWrapper"
				:style="{ height: isOpen ? `${height}px` : 'auto' }"
				@resize="onResize"
				@resizeend="onResizeEnd"
			>
				<div ref="container" :class="[$style.container, 'ignore-key-press-canvas']" tabindex="0">
					<N8nResizeWrapper
						v-if="hasChat"
						:supported-directions="['right']"
						:is-resizing-enabled="isOpen"
						:width="chatPanelWidth"
						:style="{ width: `${chatPanelWidth}px` }"
						:class="$style.chat"
						:window="pipWindow"
						@resize="onChatPanelResize"
						@resizeend="onChatPanelResizeEnd"
					>
						<ChatMessagesPanel
							data-test-id="canvas-chat"
							:is-open="isOpen"
							:is-read-only="isReadOnly"
							:messages="messages"
							:session-id="currentSessionId"
							:past-chat-messages="previousChatMessages"
							:show-close-button="false"
							:is-new-logs-enabled="true"
							@close="onToggleOpen"
							@refresh-session="refreshSession"
							@display-execution="displayExecution"
							@send-message="sendMessage"
							@click-header="onToggleOpen(true)"
						/>
					</N8nResizeWrapper>
					<div ref="logsContainer" :class="$style.logsContainer">
						<N8nResizeWrapper
							:class="$style.overviewResizer"
							:width="overviewPanelWidth"
							:style="{ width: isLogDetailsOpen ? `${overviewPanelWidth}px` : '' }"
							:supported-directions="['right']"
							:is-resizing-enabled="isLogDetailsOpenOrCollapsing"
							:window="pipWindow"
							@resize="onOverviewPanelResize"
							@resizeend="handleResizeOverviewPanelEnd"
						>
							<LogsOverviewPanel
								:class="$style.logsOverview"
								:is-open="isOpen"
								:is-read-only="isReadOnly"
								:is-compact="isLogDetailsOpen"
								:selected="selectedLogEntry"
								:execution-tree="executionTree"
								@click-header="onToggleOpen(true)"
								@select="handleSelectLogEntry"
							>
								<template #actions>
									<LogsPanelActions v-if="!isLogDetailsOpen" v-bind="logsPanelActionsProps" />
								</template>
							</LogsOverviewPanel>
						</N8nResizeWrapper>
						<LogsDetailsPanel
							v-if="isLogDetailsOpenOrCollapsing && selectedLogEntry"
							:class="$style.logDetails"
							:is-open="isOpen"
							:log-entry="selectedLogEntry"
							:window="pipWindow"
							@click-header="onToggleOpen(true)"
						>
							<template #actions>
								<LogsPanelActions v-if="isLogDetailsOpen" v-bind="logsPanelActionsProps" />
							</template>
						</LogsDetailsPanel>
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
	position: relative;
	overflow: hidden;
}

.resizeWrapper {
	height: 100%;
	min-height: 0;
	flex-basis: 0;
	border-top: var(--border-base);
	background-color: var(--color-background-light);
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
	flex-shrink: 0;
}

.logsContainer {
	width: 0;
	flex-grow: 1;
	display: flex;
	align-items: stretch;

	& > *:not(:last-child) {
		border-right: var(--border-base);
	}
}

.overviewResizer {
	flex-grow: 0;
	flex-shrink: 0;

	&:last-child {
		flex-grow: 1;
	}
}

.logsOverview {
	height: 100%;
}

.logsDetails {
	width: 0;
	flex-grow: 1;
}
</style>
