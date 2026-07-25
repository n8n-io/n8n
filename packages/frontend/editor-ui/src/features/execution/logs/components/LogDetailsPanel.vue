<script setup lang="ts">
import LogsViewExecutionSummary from '@/features/execution/logs/components/LogsViewExecutionSummary.vue';
import LogsPanelHeader from '@/features/execution/logs/components/LogsPanelHeader.vue';
import LogsViewRunData from '@/features/execution/logs/components/LogsViewRunData.vue';
import { useResizablePanel } from '@/app/composables/useResizablePanel';
import {
	type LatestNodeInfo,
	type LogEntry,
	type LogDetailsPanelState,
	isGroupLog,
	isNodeLog,
} from '@/features/execution/logs/logs.types';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import LogsViewNodeName from '@/features/execution/logs/components/LogsViewNodeName.vue';
import { computed, ref, useTemplateRef, watch } from 'vue';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import {
	getSubtreeTotalConsumedTokens,
	isPlaceholderLog,
} from '@/features/execution/logs/logs.utils';
import { LOG_DETAILS_PANEL_STATE } from '@/features/execution/logs/logs.constants';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { useExperimentalNdvStore } from '@/features/workflows/canvas/experimental/experimentalNdv.store';

import { useExecutionRedaction } from '@/features/execution/executions/composables/useExecutionRedaction';
import { useUIStore } from '@/app/stores/ui.store';
import { WORKFLOW_SETTINGS_MODAL_KEY } from '@/app/constants/modals';
import RedactedDataState from '@/features/ndv/panel/components/RedactedDataState.vue';
import {
	N8nButton,
	N8nIcon,
	N8nOption,
	N8nResizeWrapper,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useMessageAgentSessionLink } from '@/features/agents/composables/useMessageAgentSessionLink';
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
const ndvStore = injectNDVStore();
const experimentalNdvStore = useExperimentalNdvStore();
const uiStore = useUIStore();
const { isRedacted, canReveal, isDynamicCredentials, revealData } = useExecutionRedaction();

const nodeEntry = computed(() => (isNodeLog(logEntry) ? logEntry : undefined));
const groupEntry = computed(() => (isGroupLog(logEntry) ? logEntry : undefined));
const displayName = computed(() =>
	groupEntry.value
		? groupEntry.value.group.name
		: (latestInfo?.name ?? nodeEntry.value?.node.name ?? ''),
);
const type = computed(() =>
	nodeEntry.value ? nodeTypeStore.getNodeType(nodeEntry.value.node.type) : null,
);

// Group IO delegates to a chosen boundary member entry, defaulting to execution order
const selectedInputIndex = ref(0);
const selectedOutputIndex = ref(0);
watch(
	() => logEntry.id,
	() => {
		selectedInputIndex.value = 0;
		selectedOutputIndex.value = 0;
	},
);
const groupInput = computed(() => groupEntry.value?.boundaries.inputs[selectedInputIndex.value]);
const groupOutput = computed(() => groupEntry.value?.boundaries.outputs[selectedOutputIndex.value]);
const consumedTokens = computed(() => getSubtreeTotalConsumedTokens(logEntry, false));
const isTriggerNode = computed(() => type.value?.group.includes('trigger'));
const { link: messageAgentSessionLink } = useMessageAgentSessionLink(computed(() => logEntry));
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
	ndvStore.value.isNDVOpen || experimentalNdvStore.isMapperOpen
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
					<NodeIcon v-if="!groupEntry" :node-type="type" :size="16" :class="$style.icon" />
					<LogsViewNodeName :name="displayName" :is-deleted="latestInfo?.deleted ?? false" />
					<LogsViewExecutionSummary
						v-if="isOpen && nodeEntry?.runData !== undefined"
						:class="$style.executionSummary"
						:status="nodeEntry.runData.executionStatus ?? 'unknown'"
						:consumed-tokens="consumedTokens"
						:start-time="nodeEntry.runData.startTime"
						:time-took="nodeEntry.runData.executionTime"
					/>
				</div>
			</template>
			<template #actions>
				<div v-if="isOpen && !isTriggerNode && !isPlaceholderLog(logEntry)" :class="$style.actions">
					<N8nButton
						v-if="messageAgentSessionLink"
						variant="subtle"
						size="xsmall"
						data-test-id="log-details-view-agent-session"
						@click.stop="messageAgentSessionLink.open()"
					>
						<N8nIcon icon="external-link" :class="$style.viewSessionIcon" />
						{{ locale.baseText('logs.details.header.actions.viewAgentSession') }}
					</N8nButton>
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
			<template v-else-if="nodeEntry">
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
						:log-entry="nodeEntry"
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
					:log-entry="nodeEntry"
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
			<template v-else-if="groupEntry">
				<N8nResizeWrapper
					v-if="groupInput && panels !== LOG_DETAILS_PANEL_STATE.OUTPUT"
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
					<div :class="$style.groupPane">
						<N8nSelect
							v-if="groupEntry.boundaries.inputs.length > 1"
							v-model="selectedInputIndex"
							:class="$style.boundarySelect"
							size="small"
							data-test-id="log-details-group-input-select"
						>
							<N8nOption
								v-for="(boundary, index) in groupEntry.boundaries.inputs"
								:key="boundary.id"
								:value="index"
								:label="boundary.label"
							/>
						</N8nSelect>
						<LogsViewRunData
							data-test-id="log-details-input"
							pane-type="input"
							:class="$style.groupRunData"
							:title="locale.baseText('logs.details.header.actions.input')"
							:log-entry="groupInput.entry"
							:source-index="groupInput.sourceIndex"
							:collapsing-table-column-name="null"
							:search-shortcut="searchShortcutPriorityPanel === 'input' ? 'ctrl+f' : undefined"
							:show-redacted-overlay="panels !== LOG_DETAILS_PANEL_STATE.BOTH"
						/>
					</div>
				</N8nResizeWrapper>
				<div
					v-if="groupOutput && panels !== LOG_DETAILS_PANEL_STATE.INPUT"
					:class="[$style.outputPanel, $style.groupPane]"
				>
					<N8nSelect
						v-if="groupEntry.boundaries.outputs.length > 1"
						v-model="selectedOutputIndex"
						:class="$style.boundarySelect"
						size="small"
						data-test-id="log-details-group-output-select"
					>
						<N8nOption
							v-for="(boundary, index) in groupEntry.boundaries.outputs"
							:key="boundary.id"
							:value="index"
							:label="boundary.label"
						/>
					</N8nSelect>
					<LogsViewRunData
						data-test-id="log-details-output"
						pane-type="output"
						:class="$style.groupRunData"
						:title="locale.baseText('logs.details.header.actions.output')"
						:log-entry="groupOutput.entry"
						:override-outputs="groupOutput.overrideOutputs"
						:collapsing-table-column-name="null"
						:search-shortcut="searchShortcutPriorityPanel === 'output' ? 'ctrl+f' : undefined"
						:show-redacted-overlay="panels !== LOG_DETAILS_PANEL_STATE.BOTH"
					/>
				</div>
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

.viewSessionIcon {
	margin-right: var(--spacing--3xs);
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

.groupPane {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;
	height: 100%;
	width: 100%;
}

.boundarySelect {
	flex-shrink: 0;
	padding: var(--spacing--2xs);
}

.groupRunData {
	flex-grow: 1;
	overflow: hidden;
}
</style>
