<script setup lang="ts">
import ExecutionSummary from '@/components/CanvasChat/future/components/ExecutionSummary.vue';
import PanelHeader from '@/components/CanvasChat/future/components/PanelHeader.vue';
import RunDataView from '@/components/CanvasChat/future/components/RunDataView.vue';
import { useResizablePanel } from '@/components/CanvasChat/future/composables/useResizablePanel';
import { LOG_DETAILS_CONTENT, type LogDetailsContent } from '@/components/CanvasChat/types/logs';
import NodeIcon from '@/components/NodeIcon.vue';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import NodeName from '@/components/CanvasChat/future/components/NodeName.vue';
import {
	getSubtreeTotalConsumedTokens,
	type LogEntry,
	type LatestNodeInfo,
} from '@/components/RunDataAi/utils';
import { N8nButton, N8nResizeWrapper } from '@n8n/design-system';
import { useLocalStorage } from '@vueuse/core';
import { computed, useTemplateRef } from 'vue';

const MIN_IO_PANEL_WIDTH = 200;

const { isOpen, logEntry, window, latestInfo } = defineProps<{
	isOpen: boolean;
	logEntry: LogEntry;
	window?: Window;
	latestInfo?: LatestNodeInfo;
}>();

const emit = defineEmits<{ clickHeader: [] }>();

defineSlots<{ actions: {} }>();

const locale = useI18n();
const telemetry = useTelemetry();
const nodeTypeStore = useNodeTypesStore();

const content = useLocalStorage<LogDetailsContent>(
	'N8N_LOGS_DETAIL_PANEL_CONTENT',
	LOG_DETAILS_CONTENT.OUTPUT,
	{ writeDefaults: false },
);

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
const shouldResize = computed(() => content.value === LOG_DETAILS_CONTENT.BOTH);

function handleToggleInput(open?: boolean) {
	const wasOpen = [LOG_DETAILS_CONTENT.INPUT, LOG_DETAILS_CONTENT.BOTH].includes(content.value);

	if (open === wasOpen) {
		return;
	}

	content.value = wasOpen ? LOG_DETAILS_CONTENT.OUTPUT : LOG_DETAILS_CONTENT.BOTH;

	telemetry.track('User toggled log view sub pane', {
		pane: 'input',
		newState: wasOpen ? 'hidden' : 'visible',
	});
}

function handleToggleOutput(open?: boolean) {
	const wasOpen = [LOG_DETAILS_CONTENT.OUTPUT, LOG_DETAILS_CONTENT.BOTH].includes(content.value);

	if (open === wasOpen) {
		return;
	}

	content.value = wasOpen ? LOG_DETAILS_CONTENT.INPUT : LOG_DETAILS_CONTENT.BOTH;

	telemetry.track('User toggled log view sub pane', {
		pane: 'output',
		newState: wasOpen ? 'hidden' : 'visible',
	});
}

function handleResizeEnd() {
	if (resizer.isCollapsed.value) {
		handleToggleInput(false);
	}

	if (resizer.isFullSize.value) {
		handleToggleOutput(false);
	}

	resizer.onResizeEnd();
}
</script>

<template>
	<div ref="container" :class="$style.container" data-test-id="log-details">
		<PanelHeader
			data-test-id="log-details-header"
			:class="$style.header"
			@click="emit('clickHeader')"
		>
			<template #title>
				<div :class="$style.title">
					<NodeIcon :node-type="type" :size="16" :class="$style.icon" />
					<NodeName
						:latest-name="latestInfo?.name ?? logEntry.node.name"
						:name="logEntry.node.name"
						:is-deleted="latestInfo?.deleted ?? false"
					/>
					<ExecutionSummary
						v-if="isOpen"
						:class="$style.executionSummary"
						:status="logEntry.runData.executionStatus ?? 'unknown'"
						:consumed-tokens="consumedTokens"
						:time-took="logEntry.runData.executionTime"
					/>
				</div>
			</template>
			<template #actions>
				<div v-if="isOpen && !isTriggerNode" :class="$style.actions">
					<N8nButton
						size="mini"
						type="secondary"
						:class="content === LOG_DETAILS_CONTENT.OUTPUT ? '' : $style.pressed"
						@click.stop="handleToggleInput"
					>
						{{ locale.baseText('logs.details.header.actions.input') }}
					</N8nButton>
					<N8nButton
						size="mini"
						type="secondary"
						:class="content === LOG_DETAILS_CONTENT.INPUT ? '' : $style.pressed"
						@click.stop="handleToggleOutput"
					>
						{{ locale.baseText('logs.details.header.actions.output') }}
					</N8nButton>
				</div>
				<slot name="actions" />
			</template>
		</PanelHeader>
		<div v-if="isOpen" :class="$style.content" data-test-id="logs-details-body">
			<N8nResizeWrapper
				v-if="!isTriggerNode && content !== LOG_DETAILS_CONTENT.OUTPUT"
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
				<RunDataView
					data-test-id="log-details-input"
					pane-type="input"
					:title="locale.baseText('logs.details.header.actions.input')"
					:log-entry="logEntry"
				/>
			</N8nResizeWrapper>
			<RunDataView
				v-if="isTriggerNode || content !== LOG_DETAILS_CONTENT.INPUT"
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
