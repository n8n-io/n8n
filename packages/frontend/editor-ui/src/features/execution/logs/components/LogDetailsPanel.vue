<script setup lang="ts">
import LogsViewExecutionSummary from '@/features/execution/logs/components/LogsViewExecutionSummary.vue';
import LogsPanelHeader from '@/features/execution/logs/components/LogsPanelHeader.vue';
import LogsViewRunData from '@/features/execution/logs/components/LogsViewRunData.vue';
import { useResizablePanel } from '@/app/composables/useResizablePanel';
import {
	type LatestNodeInfo,
	type LogEntry,
	type LogDetailsPanelState,
} from '@/features/execution/logs/logs.types';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import LogsViewNodeName from '@/features/execution/logs/components/LogsViewNodeName.vue';
import { computed, useTemplateRef } from 'vue';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import {
	getSubtreeTotalConsumedTokens,
	isPlaceholderLog,
} from '@/features/execution/logs/logs.utils';
import { LOG_DETAILS_PANEL_STATE } from '@/features/execution/logs/logs.constants';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useExperimentalNdvStore } from '@/features/workflows/canvas/experimental/experimentalNdv.store';

import { useExecutionRedaction } from '@/features/execution/executions/composables/useExecutionRedaction';
import { useUIStore } from '@/app/stores/ui.store';
import { WORKFLOW_SETTINGS_MODAL_KEY } from '@/app/constants/modals';
import RedactedDataState from '@/features/ndv/panel/components/RedactedDataState.vue';
import { N8nButton, N8nResizeWrapper, N8nText } from '@n8n/design-system';
const MIN_IO_PANEL_WIDTH = 200;

const {
	isOpen,
	logEntry,
	window,
	latestInfo,
	panels,
	collapsingInputTableColumnName,
	collapsingOutputTableColumnName,
	isHeaderClickable,
} = defineProps<{
	isOpen: boolean;
	logEntry: LogEntry;
	window?: Window;
	latestInfo?: LatestNodeInfo;
	panels: LogDetailsPanelState;
	collapsingInputTableColumnName: string | null;
	collapsingOutputTableColumnName: string | null;
	isHeaderClickable: boolean;
}>();

const emit = defineEmits<{
	clickHeader: [];
	toggleInputOpen: [] | [boolean];
	toggleOutputOpen: [] | [boolean];
	collapsingInputTableColumnChanged: [columnName: string | null];
	collapsingOutputTableColumnChanged: [columnName: string | null];
}>();

defineSlots<{ actions: {} }>();

const locale = useI18n();
const nodeTypeStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const experimentalNdvStore = useExperimentalNdvStore();
const uiStore = useUIStore();
const { isRedacted, canReveal, isDynamicCredentials, revealData } = useExecutionRedaction();

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
const searchShortcutPriorityPanel = computed(() =>
	ndvStore.isNDVOpen || experimentalNdvStore.isMapperOpen
		? undefined
		: panels === LOG_DETAILS_PANEL_STATE.INPUT
			? 'input'
			: 'output',
);

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
			:is-clickable="isHeaderClickable"
			@click="emit('clickHeader')"
		>
			<template #title>
				<div :class="$style.title">
					<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
					<LogsViewNodeName
						:name="latestInfo?.name ?? logEntry.node.name"
						:is-deleted="latestInfo?.deleted ?? false"
					/>
					<LogsViewExecutionSummary
						v-if="isOpen && logEntry.runData !== undefined"
						:class="$style.executionSummary"
						:status="logEntry.runData.executionStatus ?? 'unknown'"
						:consumed-tokens="consumedTokens"
						:start-time="logEntry.runData.startTime"
						:time-took="logEntry.runData.executionTime"
					/>
				</div>
			</template>
			<template #actions>
				<div v-if="isOpen && !isTriggerNode && !isPlaceholderLog(logEntry)" :class="$style.actions">
					<KeyboardShortcutTooltip
						:label="locale.baseText('generic.shortcutHint')"
						:shortcut="{ keys: ['i'] }"
					>
						<N8nButton
							variant="subtle"
							size="xsmall"
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
							variant="subtle"
							size="xsmall"
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
			<div v-if="isPlaceholderLog(logEntry)" :class="$style.placeholder">
				<N8nText color="text-base">
					{{ locale.baseText('ndv.output.runNodeHint') }}
				</N8nText>
			</div>
			<template v-else>
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
						:collapsing-table-column-name="collapsingInputTableColumnName"
						:search-shortcut="searchShortcutPriorityPanel === 'input' ? 'ctrl+f' : undefined"
						:show-redacted-overlay="panels !== LOG_DETAILS_PANEL_STATE.BOTH"
						@collapsing-table-column-changed="emit('collapsingInputTableColumnChanged', $event)"
					/>
				</N8nResizeWrapper>
				<LogsViewRunData
					v-if="isTriggerNode || panels !== LOG_DETAILS_PANEL_STATE.INPUT"
					data-test-id="log-details-output"
					pane-type="output"
					:class="$style.outputPanel"
					:title="locale.baseText('logs.details.header.actions.output')"
					:log-entry="logEntry"
					:collapsing-table-column-name="collapsingOutputTableColumnName"
					:search-shortcut="searchShortcutPriorityPanel === 'output' ? 'ctrl+f' : undefined"
					:show-redacted-overlay="panels !== LOG_DETAILS_PANEL_STATE.BOTH"
					@collapsing-table-column-changed="emit('collapsingOutputTableColumnChanged', $event)"
				/>
				<div
					v-if="isRedacted && panels === LOG_DETAILS_PANEL_STATE.BOTH"
					:class="$style.redactedOverlay"
				>
					<RedactedDataState
						:title="locale.baseText('ndv.output.redacted.title')"
						:is-dynamic-credentials="isDynamicCredentials"
						:can-reveal="canReveal"
						wide
						@open-settings="uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY)"
						@reveal="revealData"
					/>
				</div>
			</template>
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
	padding: var(--spacing--2xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-inline-end: var(--spacing--2xs);

	.pressed {
		background-color: var(--button--outline-color--secondary--focus);
	}
}

.title {
	display: flex;
	align-items: center;
	flex-shrink: 1;
}

.icon {
	margin-right: var(--spacing--2xs);
}

.executionSummary {
	flex-shrink: 1;
}

.content {
	position: relative;
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

.redactedOverlay {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: flex-start;
	padding-top: var(--spacing--3xl);
	z-index: 1;
}

.inputResizer {
	overflow: hidden;
	flex-shrink: 0;

	&:not(:is(:last-child, .collapsed, .full)) {
		border-right: var(--border);
	}
}

.placeholder {
	flex-grow: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
