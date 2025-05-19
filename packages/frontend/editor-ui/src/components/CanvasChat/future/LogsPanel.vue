<script setup lang="ts">
import { nextTick, computed, useTemplateRef } from 'vue';
import { N8nResizeWrapper } from '@n8n/design-system';
import { useChatState } from '@/components/CanvasChat/composables/useChatState';
import LogsOverviewPanel from '@/components/CanvasChat/future/components/LogsOverviewPanel.vue';
import ChatMessagesPanel from '@/components/CanvasChat/components/ChatMessagesPanel.vue';
import LogsDetailsPanel from '@/components/CanvasChat/future/components/LogDetailsPanel.vue';
import LogsPanelActions from '@/components/CanvasChat/future/components/LogsPanelActions.vue';
import { useLogsPanelLayout } from '@/components/CanvasChat/future/composables/useLogsPanelLayout';
import { useLogsExecutionData } from '@/components/CanvasChat/future/composables/useLogsExecutionData';
import { type LogEntry } from '@/components/RunDataAi/utils';
import { useNDVStore } from '@/stores/ndv.store';
import { ndvEventBus } from '@/event-bus';
import { useLogsSelection } from '@/components/CanvasChat/future/composables/useLogsSelection';
import { useLogsTreeExpand } from '@/components/CanvasChat/future/composables/useLogsTreeExpand';
import { useLogsStore } from '@/stores/logs.store';

const props = withDefaults(defineProps<{ isReadOnly?: boolean }>(), { isReadOnly: false });

const container = useTemplateRef('container');
const logsContainer = useTemplateRef('logsContainer');
const pipContainer = useTemplateRef('pipContainer');
const pipContent = useTemplateRef('pipContent');

const logsStore = useLogsStore();
const ndvStore = useNDVStore();

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
} = useLogsPanelLayout(pipContainer, pipContent, container, logsContainer);

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
const { flatLogEntries, toggleExpanded } = useLogsTreeExpand(entries);
const { selected, select, selectNext, selectPrev } = useLogsSelection(
	execution,
	entries,
	flatLogEntries,
);

const isLogDetailsOpen = computed(() => isOpen.value && selected.value !== undefined);
const isLogDetailsVisuallyOpen = computed(
	() => isLogDetailsOpen.value && !isCollapsingDetailsPanel.value,
);
const logsPanelActionsProps = computed<InstanceType<typeof LogsPanelActions>['$props']>(() => ({
	isOpen: isOpen.value,
	showToggleButton: !isPoppedOut.value,
	showPopOutButton: canPopOut.value && !isPoppedOut.value,
	onPopOut,
	onToggleOpen,
}));

function handleResizeOverviewPanelEnd() {
	if (isOverviewPanelFullWidth.value) {
		select(undefined);
	}

	onOverviewPanelResizeEnd();
}

async function handleOpenNdv(treeNode: LogEntry) {
	ndvStore.setActiveNodeName(treeNode.node.name);

	await nextTick(() => {
		const source = treeNode.runData.source[0];
		const inputBranch = source?.previousNodeOutput ?? 0;

		ndvEventBus.emit('updateInputNodeName', source?.previousNode);
		ndvEventBus.emit('setInputBranchIndex', inputBranch);
		ndvStore.setOutputRunIndex(treeNode.runIndex);
	});
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
				<div
					ref="container"
					:class="$style.container"
					tabindex="-1"
					@keydown.esc.stop="select(undefined)"
					@keydown.j.stop="selectNext"
					@keydown.down.stop.prevent="selectNext"
					@keydown.k.stop="selectPrev"
					@keydown.up.stop.prevent="selectPrev"
					@keydown.space.stop="selected && toggleExpanded(selected)"
					@keydown.enter.stop="selected && handleOpenNdv(selected)"
				>
					<N8nResizeWrapper
						v-if="hasChat && (!props.isReadOnly || messages.length > 0)"
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
							:style="{ width: isLogDetailsVisuallyOpen ? `${overviewPanelWidth}px` : '' }"
							:supported-directions="['right']"
							:is-resizing-enabled="isLogDetailsOpen"
							:window="pipWindow"
							@resize="onOverviewPanelResize"
							@resizeend="handleResizeOverviewPanelEnd"
						>
							<LogsOverviewPanel
								:key="execution?.id ?? ''"
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
								@load-sub-execution="loadSubExecution"
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
							:window="pipWindow"
							:latest-info="latestNodeNameById[selected.id]"
							:panels="logsStore.detailsState"
							@click-header="onToggleOpen(true)"
							@toggle-input-open="logsStore.toggleInputOpen"
							@toggle-output-open="logsStore.toggleOutputOpen"
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
