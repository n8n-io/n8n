<script setup lang="ts">
import LogsViewExecutionSummary from '@/components/CanvasChat/future/components/LogsViewExecutionSummary.vue';
import LogsPanelHeader from '@/components/CanvasChat/future/components/LogsPanelHeader.vue';
import LogsViewRunData from '@/components/CanvasChat/future/components/LogsViewRunData.vue';
import { useResizablePanel } from '@/composables/useResizablePanel';
import {
	LOG_DETAILS_PANEL_STATE,
	type LogDetailsPanelState,
} from '@/components/CanvasChat/types/logs';
import NodeIcon from '@/components/NodeIcon.vue';
import { useI18n } from '@/composables/useI18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import LogsViewNodeName from '@/components/CanvasChat/future/components/LogsViewNodeName.vue';
import {
	getSubtreeTotalConsumedTokens,
	type LogEntry,
	type LatestNodeInfo,
} from '@/components/RunDataAi/utils';
import { N8nButton, N8nResizeWrapper } from '@n8n/design-system';
import { computed, useTemplateRef } from 'vue';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';

const MIN_IO_PANEL_WIDTH = 200;

const { isOpen, logEntry, window, latestInfo, panels } = defineProps<{
	isOpen: boolean;
	logEntry: LogEntry;
	window?: Window;
	latestInfo?: LatestNodeInfo;
	panels: LogDetailsPanelState;
}>();

const emit = defineEmits<{
	clickHeader: [];
	toggleInputOpen: [] | [boolean];
	toggleOutputOpen: [] | [boolean];
}>();

defineSlots<{ actions: {} }>();

const locale = useI18n();
const nodeTypeStore = useNodeTypesStore();

const type = computed(() => nodeTypeStore.getNodeType(logEntry.node.type));
const consumedTokens = computed(() => getSubtreeTotalConsumedTokens(logEntry, false));
const isTriggerNode = computed(() => type.value?.group.includes('trigger'));
const container = useTemplateRef<HTMLElement>('container');
const resizer = useResizablePanel('N8N_LOGS_INPUT_PANEL_WIDTH', {
	container,
	defaultSize: (size) => size / 2,
	minSize: MIN_IO_PANEL_WIDTH,
	maxSize: (size) => size - MIN_IO_PANEL_WIDTH,
	allowCollapse: true,
	allowFullSize: true,
});
const shouldResize = computed(() => panels === LOG_DETAILS_PANEL_STATE.BOTH);

function handleResizeEnd() {
	if (resizer.isCollapsed.value) {
		emit('toggleInputOpen', false);
	}

	if (resizer.isFullSize.value) {
		emit('toggleOutputOpen', false);
	}

	resizer.onResizeEnd();
}
</script>

<template>
	<div ref="container" :class="$style.container" data-test-id="log-details">
		<LogsPanelHeader
			data-test-id="log-details-header"
			:class="$style.header"
			@click="emit('clickHeader')"
		>
			<template #title>
				<div :class="$style.title">
					<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
					<LogsViewNodeName
						:latest-name="latestInfo?.name ?? logEntry.node.name"
						:name="logEntry.node.name"
						:is-deleted="latestInfo?.deleted ?? false"
					/>
					<LogsViewExecutionSummary
						v-if="isOpen"
						:class="$style.executionSummary"
						:status="logEntry.runData.executionStatus ?? 'unknown'"
						:consumed-tokens="consumedTokens"
						:start-time="logEntry.runData.startTime"
						:time-took="logEntry.runData.executionTime"
					/>
				</div>
			</template>
			<template #actions>
				<div v-if="isOpen && !isTriggerNode" :class="$style.actions">
					<KeyboardShortcutTooltip
						:label="locale.baseText('generic.shortcutHint')"
						:shortcut="{ keys: ['i'] }"
					>
						<N8nButton
							size="mini"
							type="secondary"
							:class="panels === LOG_DETAILS_PANEL_STATE.OUTPUT ? '' : $style.pressed"
							@click.stop="emit('toggleInputOpen')"
						>
							{{ locale.baseText('logs.details.header.actions.input') }}
						</N8nButton>
					</KeyboardShortcutTooltip>
					<KeyboardShortcutTooltip
						:label="locale.baseText('generic.shortcutHint')"
						:shortcut="{ keys: ['o'] }"
					>
						<N8nButton
							size="mini"
							type="secondary"
							:class="panels === LOG_DETAILS_PANEL_STATE.INPUT ? '' : $style.pressed"
							@click.stop="emit('toggleOutputOpen')"
						>
							{{ locale.baseText('logs.details.header.actions.output') }}
						</N8nButton>
					</KeyboardShortcutTooltip>
				</div>
				<slot name="actions" />
			</template>
		</LogsPanelHeader>
		<div v-if="isOpen" :class="$style.content" data-test-id="logs-details-body">
			<N8nResizeWrapper
				v-if="!isTriggerNode && panels !== LOG_DETAILS_PANEL_STATE.OUTPUT"
				:class="{
					[$style.inputResizer]: true,
					[$style.collapsed]: resizer.isCollapsed.value,
					[$style.full]: resizer.isFullSize.value,
				}"
				:width="resizer.size.value"
				:style="shouldResize ? { width: `${resizer.size.value ?? 0}px` } : undefined"
				:supported-directions="['right']"
				:is-resizing-enabled="shouldResize"
				:window="window"
				@resize="resizer.onResize"
				@resizeend="handleResizeEnd"
			>
				<LogsViewRunData
					data-test-id="log-details-input"
					pane-type="input"
					:title="locale.baseText('logs.details.header.actions.input')"
					:log-entry="logEntry"
				/>
			</N8nResizeWrapper>
			<LogsViewRunData
				v-if="isTriggerNode || panels !== LOG_DETAILS_PANEL_STATE.INPUT"
				data-test-id="log-details-output"
				pane-type="output"
				:class="$style.outputPanel"
				:title="locale.baseText('logs.details.header.actions.output')"
				:log-entry="logEntry"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	flex-grow: 1;
	flex-shrink: 1;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;
}

.header {
	padding: var(--spacing-2xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	padding-inline-end: var(--spacing-2xs);

	.pressed {
		background-color: var(--color-button-secondary-focus-outline);
	}
}

.title {
	display: flex;
	align-items: center;
	flex-shrink: 1;
}

.icon {
	margin-right: var(--spacing-2xs);
}

.executionSummary {
	flex-shrink: 1;
}

.content {
	flex-shrink: 1;
	flex-grow: 1;
	display: flex;
	align-items: stretch;
	overflow: hidden;
}

.outputPanel {
	width: 0;
	flex-grow: 1;
}

.inputResizer {
	overflow: hidden;
	flex-shrink: 0;

	&:not(:is(:last-child, .collapsed, .full)) {
		border-right: var(--border-base);
	}
}
</style>
