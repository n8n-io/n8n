<script setup lang="ts">
import { nextTick, computed, useTemplateRef, ref } from 'vue';
import { N8nResizeWrapper } from '@n8n/design-system';
import { useChatState } from '@/features/logs/composables/useChatState';
import LogsOverviewPanel from '@/features/logs/components/LogsOverviewPanel.vue';
import ChatMessagesPanel from '@/features/logs/components/ChatMessagesPanel.vue';
import LogsDetailsPanel from '@/features/logs/components/LogDetailsPanel.vue';
import LogsPanelActions from '@/features/logs/components/LogsPanelActions.vue';
import { useLogsExecutionData } from '@/features/logs/composables/useLogsExecutionData';
import { useNDVStore } from '@/stores/ndv.store';
import { ndvEventBus } from '@/event-bus';
import { useLogsSelection } from '@/features/logs/composables/useLogsSelection';
import { useLogsTreeExpand } from '@/features/logs/composables/useLogsTreeExpand';
import { type LogEntry } from '@/features/logs/logs.types';
import { useLogsStore } from '@/stores/logs.store';
import { useLogsPanelLayout } from '@/features/logs/composables/useLogsPanelLayout';
import { type KeyMap } from '@/composables/useKeybindings';
import LogsViewKeyboardEventListener from './LogsViewKeyboardEventListener.vue';
import { useWorkflowsStore } from '@/stores/workflows.store';

const props = withDefaults(defineProps<{ isReadOnly?: boolean }>(), { isReadOnly: false });

const container = useTemplateRef('container');
const logsContainer = useTemplateRef('logsContainer');
const popOutContainer = useTemplateRef('popOutContainer');
const popOutContent = useTemplateRef('popOutContent');

const logsStore = useLogsStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const workflowName = computed(() => workflowsStore.workflow.name);

const {
	height,
	chatPanelWidth,
	overviewPanelWidth,
	canPopOut,
	isOpen,
	isPoppedOut,
	isCollapsingDetailsPanel,
	isOverviewPanelFullWidth,
	popOutWindow,
	onResize,
	onResizeEnd,
	onToggleOpen,
	onPopOut,
	onChatPanelResize,
	onChatPanelResizeEnd,
	onOverviewPanelResize,
	onOverviewPanelResizeEnd,
} = useLogsPanelLayout(workflowName, popOutContainer, popOutContent, container, logsContainer);

const {
	currentSessionId,
	messages,
	previousChatMessages,
	sendMessage,
	refreshSession,
	displayExecution,
} = useChatState(props.isReadOnly);

const { entries, execution, hasChat, latestNodeNameById, resetExecutionData, loadSubExecution } =
	useLogsExecutionData();
const { flatLogEntries, toggleExpanded } = useLogsTreeExpand(entries, loadSubExecution);
const { selected, select, selectNext, selectPrev } = useLogsSelection(
	execution,
	entries,
	flatLogEntries,
	toggleExpanded,
);

const inputTableColumnCollapsing = ref<{ nodeName: string; columnName: string }>();
const outputTableColumnCollapsing = ref<{ nodeName: string; columnName: string }>();

const isLogDetailsOpen = computed(() => isOpen.value && selected.value !== undefined);
const isLogDetailsVisuallyOpen = computed(
	() => isLogDetailsOpen.value && !isCollapsingDetailsPanel.value,
);
const logsPanelActionsProps = computed<InstanceType<typeof LogsPanelActions>['$props']>(() => ({
	isOpen: isOpen.value,
	isSyncSelectionEnabled: logsStore.isLogSelectionSyncedWithCanvas,
	showToggleButton: !isPoppedOut.value,
	showPopOutButton: canPopOut.value && !isPoppedOut.value,
	onPopOut,
	onToggleOpen,
	onToggleSyncSelection: logsStore.toggleLogSelectionSync,
}));
const inputCollapsingColumnName = computed(() =>
	inputTableColumnCollapsing.value?.nodeName === selected.value?.node.name
		? (inputTableColumnCollapsing.value?.columnName ?? null)
		: null,
);
const outputCollapsingColumnName = computed(() =>
	outputTableColumnCollapsing.value?.nodeName === selected.value?.node.name
		? (outputTableColumnCollapsing.value?.columnName ?? null)
		: null,
);

const keyMap = computed<KeyMap>(() => ({
	j: selectNext,
	k: selectPrev,
	Escape: () => select(undefined),
	ArrowDown: selectNext,
	ArrowUp: selectPrev,
	Space: () => selected.value && toggleExpanded(selected.value),
	Enter: () => selected.value && handleOpenNdv(selected.value),
}));

function handleResizeOverviewPanelEnd() {
	if (isOverviewPanelFullWidth.value) {
		select(undefined);
	}

	onOverviewPanelResizeEnd();
}

function handleOpenNdv(treeNode: LogEntry) {
	ndvStore.setActiveNodeName(treeNode.node.name, 'logs_view');

	void nextTick(() => {
		const source = treeNode.runData?.source[0];
		const inputBranch = source?.previousNodeOutput ?? 0;

		ndvEventBus.emit('updateInputNodeName', source?.previousNode);
		ndvEventBus.emit('setInputBranchIndex', inputBranch);
		ndvStore.setOutputRunIndex(treeNode.runIndex);
	});
}

function handleChangeInputTableColumnCollapsing(columnName: string | null) {
	inputTableColumnCollapsing.value =
		columnName && selected.value ? { nodeName: selected.value.node.name, columnName } : undefined;
}

function handleChangeOutputTableColumnCollapsing(columnName: string | null) {
	outputTableColumnCollapsing.value =
		columnName && selected.value ? { nodeName: selected.value.node.name, columnName } : undefined;
}
</script>

<template>
	<div ref="popOutContainer" data-test-id="logs-panel">
		<!-- force re-create with key for shortcuts to work in pop-out window -->
		<LogsViewKeyboardEventListener
			:key="String(!!popOutWindow)"
			:key-map="keyMap"
			:container="container"
		/>
		<div ref="popOutContent" :class="[$style.popOutContent, isPoppedOut ? $style.poppedOut : '']">
			<N8nResizeWrapper
				:height="isPoppedOut ? undefined : height"
				:supported-directions="['top']"
				:is-resizing-enabled="!isPoppedOut"
				:class="$style.resizeWrapper"
				:style="{ height: isOpen && !isPoppedOut ? `${height}px` : 'auto' }"
				@resize="onResize"
				@resizeend="onResizeEnd"
			>
				<div ref="container" :class="$style.container" tabindex="-1">
					<N8nResizeWrapper
						v-if="hasChat && (!props.isReadOnly || messages.length > 0)"
						:supported-directions="['right']"
						:is-resizing-enabled="isOpen"
						:width="chatPanelWidth"
						:style="{ width: `${chatPanelWidth}px` }"
						:class="$style.chat"
						:window="popOutWindow"
						@resize="onChatPanelResize"
						@resizeend="onChatPanelResizeEnd"
					>
						<ChatMessagesPanel
							:key="`canvas-chat-${currentSessionId}${isPoppedOut ? '-pop-out' : ''}`"
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
							:style="{ width: isLogDetailsVisuallyOpen ? `${overviewPanelWidth}px` : '' }"
							:supported-directions="['right']"
							:is-resizing-enabled="isLogDetailsOpen"
							:window="popOutWindow"
							@resize="onOverviewPanelResize"
							@resizeend="handleResizeOverviewPanelEnd"
						>
							<LogsOverviewPanel
								:class="$style.logsOverview"
								:is-open="isOpen"
								:is-read-only="isReadOnly"
								:is-compact="isLogDetailsVisuallyOpen"
								:selected="selected"
								:execution="execution"
								:entries="entries"
								:latest-node-info="latestNodeNameById"
								:flat-log-entries="flatLogEntries"
								@click-header="onToggleOpen(true)"
								@select="select"
								@clear-execution-data="resetExecutionData"
								@toggle-expanded="toggleExpanded"
								@open-ndv="handleOpenNdv"
							>
								<template #actions>
									<LogsPanelActions
										v-if="!isLogDetailsVisuallyOpen"
										v-bind="logsPanelActionsProps"
									/>
								</template>
							</LogsOverviewPanel>
						</N8nResizeWrapper>
						<LogsDetailsPanel
							v-if="isLogDetailsVisuallyOpen && selected"
							:class="$style.logDetails"
							:is-open="isOpen"
							:log-entry="selected"
							:window="popOutWindow"
							:latest-info="latestNodeNameById[selected.node.id]"
							:panels="logsStore.detailsState"
							:collapsing-input-table-column-name="inputCollapsingColumnName"
							:collapsing-output-table-column-name="outputCollapsingColumnName"
							@click-header="onToggleOpen(true)"
							@toggle-input-open="logsStore.toggleInputOpen"
							@toggle-output-open="logsStore.toggleOutputOpen"
							@collapsing-input-table-column-changed="handleChangeInputTableColumnCollapsing"
							@collapsing-output-table-column-changed="handleChangeOutputTableColumnCollapsing"
						>
							<template #actions>
								<LogsPanelActions v-if="isLogDetailsVisuallyOpen" v-bind="logsPanelActionsProps" />
							</template>
						</LogsDetailsPanel>
					</div>
				</div>
			</N8nResizeWrapper>
		</div>
	</div>
</template>

<style lang="scss" module>
.popOutContent {
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

	.poppedOut & {
		border-top: none;
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
