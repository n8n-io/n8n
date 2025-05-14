<script setup lang="ts">
import PanelHeader from '@/components/CanvasChat/future/components/PanelHeader.vue';
import { useClearExecutionButtonVisible } from '@/composables/useClearExecutionButtonVisible';
import { useI18n } from '@/composables/useI18n';
import { N8nButton, N8nRadioButtons, N8nText, N8nTooltip } from '@n8n/design-system';
import { ref, computed, nextTick, watch } from 'vue';
import { useTelemetry } from '@/composables/useTelemetry';
import LogsOverviewRow from '@/components/CanvasChat/future/components/LogsOverviewRow.vue';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useNDVStore } from '@/stores/ndv.store';
import { useRouter } from 'vue-router';
import ExecutionSummary from '@/components/CanvasChat/future/components/ExecutionSummary.vue';
import {
	getDefaultCollapsedEntries,
	flattenLogEntries,
	getSubtreeTotalConsumedTokens,
	getTotalConsumedTokens,
	hasSubExecution,
	type LatestNodeInfo,
	type LogEntry,
	getDepth,
} from '@/components/RunDataAi/utils';
import { useVirtualList } from '@vueuse/core';
import { ndvEventBus } from '@/event-bus';
import { type IExecutionResponse } from '@/Interface';

const {
	isOpen,
	isReadOnly,
	selected,
	isCompact,
	execution,
	entries,
	latestNodeInfo,
	scrollToSelection,
} = defineProps<{
	isOpen: boolean;
	selected?: LogEntry;
	isReadOnly: boolean;
	isCompact: boolean;
	entries: LogEntry[];
	execution?: IExecutionResponse;
	latestNodeInfo: Record<string, LatestNodeInfo>;
	scrollToSelection: boolean;
}>();

const emit = defineEmits<{
	clickHeader: [];
	select: [LogEntry | undefined];
	clearExecutionData: [];
	loadSubExecution: [LogEntry];
}>();

defineSlots<{ actions: {} }>();

const locale = useI18n();
const telemetry = useTelemetry();
const router = useRouter();
const runWorkflow = useRunWorkflow({ router });
const ndvStore = useNDVStore();
const isClearExecutionButtonVisible = useClearExecutionButtonVisible();
const isEmpty = computed(() => entries.length === 0 || execution === undefined);
const switchViewOptions = computed(() => [
	{ label: locale.baseText('logs.overview.header.switch.overview'), value: 'overview' as const },
	{ label: locale.baseText('logs.overview.header.switch.details'), value: 'details' as const },
]);
const consumedTokens = computed(() =>
	getTotalConsumedTokens(
		...entries.map((entry) =>
			getSubtreeTotalConsumedTokens(
				entry,
				false, // Exclude token usages from sub workflow which is loaded only after expanding the row
			),
		),
	),
);
const shouldShowTokenCountColumn = computed(
	() =>
		consumedTokens.value.totalTokens > 0 ||
		entries.some((entry) => getSubtreeTotalConsumedTokens(entry, true).totalTokens > 0),
);
const manuallyCollapsedEntries = ref<Record<string, boolean>>({});
const collapsedEntries = computed(() => ({
	...getDefaultCollapsedEntries(entries),
	...manuallyCollapsedEntries.value,
}));
const flatLogEntries = computed(() => flattenLogEntries(entries, collapsedEntries.value));
const virtualList = useVirtualList(flatLogEntries, { itemHeight: 32 });

function handleClickNode(clicked: LogEntry) {
	if (selected?.id === clicked.id) {
		emit('select', undefined);
		return;
	}

	emit('select', clicked);

	telemetry.track('User selected node in log view', {
		node_type: clicked.node.type,
		node_id: clicked.node.id,
		execution_id: execution?.id,
		workflow_id: execution?.workflowData.id,
		subworkflow_depth: getDepth(clicked),
	});
}

function handleSwitchView(value: 'overview' | 'details') {
	emit('select', value === 'overview' || entries.length === 0 ? undefined : entries[0]);
}

async function handleToggleExpanded(treeNode: LogEntry) {
	if (hasSubExecution(treeNode) && treeNode.children.length === 0) {
		emit('loadSubExecution', treeNode);
		return;
	}

	manuallyCollapsedEntries.value[treeNode.id] = !collapsedEntries.value[treeNode.id];
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

async function handleTriggerPartialExecution(treeNode: LogEntry) {
	const latestName = latestNodeInfo[treeNode.node.id]?.name ?? treeNode.node.name;

	if (latestName) {
		await runWorkflow.runWorkflow({ destinationNode: latestName });
	}
}

// Scroll selected row into view
watch(
	() => (scrollToSelection ? selected?.id : undefined),
	async (selectedId) => {
		if (selectedId) {
			const index = flatLogEntries.value.findIndex((e) => e.id === selectedId);

			if (index >= 0) {
				// Wait for the node to be added to the list, and then scroll
				await nextTick(() => virtualList.scrollTo(index));
			}
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.container" data-test-id="logs-overview">
		<PanelHeader
			:title="locale.baseText('logs.overview.header.title')"
			data-test-id="logs-overview-header"
			@click="emit('clickHeader')"
		>
			<template #actions>
				<N8nTooltip
					v-if="isClearExecutionButtonVisible"
					:content="locale.baseText('logs.overview.header.actions.clearExecution.tooltip')"
				>
					<N8nButton
						size="mini"
						type="secondary"
						icon="trash"
						icon-size="medium"
						data-test-id="clear-execution-data-button"
						:class="$style.clearButton"
						@click.stop="emit('clearExecutionData')"
						>{{ locale.baseText('logs.overview.header.actions.clearExecution') }}</N8nButton
					>
				</N8nTooltip>
				<slot name="actions" />
			</template>
		</PanelHeader>
		<div
			v-if="isOpen"
			:class="[$style.content, isEmpty ? $style.empty : '']"
			data-test-id="logs-overview-body"
		>
			<N8nText
				v-if="isEmpty || execution === undefined"
				tag="p"
				size="medium"
				color="text-base"
				:class="$style.emptyText"
				data-test-id="logs-overview-empty"
			>
				{{ locale.baseText('logs.overview.body.empty.message') }}
			</N8nText>
			<template v-else>
				<ExecutionSummary
					data-test-id="logs-overview-status"
					:class="$style.summary"
					:status="execution.status"
					:consumed-tokens="consumedTokens"
					:time-took="
						execution.startedAt && execution.stoppedAt
							? +new Date(execution.stoppedAt) - +new Date(execution.startedAt)
							: undefined
					"
				/>
				<div :class="$style.tree" v-bind="virtualList.containerProps">
					<div v-bind="virtualList.wrapperProps.value" role="tree">
						<LogsOverviewRow
							v-for="{ data, index } of virtualList.list.value"
							:key="index"
							:data="data"
							:is-read-only="isReadOnly"
							:is-selected="data.id === selected?.id"
							:is-compact="isCompact"
							:should-show-token-count-column="shouldShowTokenCountColumn"
							:latest-info="latestNodeInfo[data.node.id]"
							:expanded="!collapsedEntries[data.id]"
							:can-open-ndv="data.executionId === execution?.id"
							@click.stop="handleClickNode(data)"
							@toggle-expanded="handleToggleExpanded"
							@open-ndv="handleOpenNdv"
							@trigger-partial-execution="handleTriggerPartialExecution"
						/>
					</div>
				</div>
				<N8nRadioButtons
					size="small-medium"
					:class="$style.switchViewButtons"
					:model-value="selected ? 'details' : 'overview'"
					:options="switchViewOptions"
					@update:model-value="handleSwitchView"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
@import '@/styles/variables';

.container {
	flex-grow: 1;
	flex-shrink: 1;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;
	background-color: var(--color-foreground-xlight);
}

.clearButton {
	border: none;
	color: var(--color-text-light);
	gap: var(--spacing-5xs);
}

.content {
	position: relative;
	flex-grow: 1;
	overflow: auto;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: stretch;

	&.empty {
		align-items: center;
		justify-content: center;
	}
}

.emptyText {
	max-width: 20em;
	text-align: center;
}

.summary {
	padding: var(--spacing-2xs);
}

.tree {
	padding: 0 var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs);

	& :global(.el-icon) {
		display: none;
	}
}

.switchViewButtons {
	position: absolute;
	z-index: 10; /* higher than log entry rows background */
	right: 0;
	top: 0;
	margin: var(--spacing-4xs) var(--spacing-2xs);
	visibility: hidden;
	opacity: 0;
	transition: opacity 0.3s $ease-out-expo;

	.content:hover & {
		visibility: visible;
		opacity: 1;
	}
}
</style>
