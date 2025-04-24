<script setup lang="ts">
import PanelHeader from '@/components/CanvasChat/future/components/PanelHeader.vue';
import { useClearExecutionButtonVisible } from '@/composables/useClearExecutionButtonVisible';
import { useI18n } from '@/composables/useI18n';
import { N8nButton, N8nRadioButtons, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, nextTick } from 'vue';
import { ElTree, type TreeNode as ElTreeNode } from 'element-plus';
import { useTelemetry } from '@/composables/useTelemetry';
import LogsOverviewRow from '@/components/CanvasChat/future/components/LogsOverviewRow.vue';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useNDVStore } from '@/stores/ndv.store';
import { useRouter } from 'vue-router';
import ExecutionSummary from '@/components/CanvasChat/future/components/ExecutionSummary.vue';
import {
	type ExecutionLogViewData,
	getSubtreeTotalConsumedTokens,
	getTotalConsumedTokens,
	type LatestNodeInfo,
	type LogEntry,
} from '@/components/RunDataAi/utils';

const { isOpen, isReadOnly, selected, isCompact, execution, latestNodeInfo } = defineProps<{
	isOpen: boolean;
	selected?: LogEntry;
	isReadOnly: boolean;
	isCompact: boolean;
	execution?: ExecutionLogViewData;
	latestNodeInfo: Record<string, LatestNodeInfo>;
}>();

const emit = defineEmits<{
	clickHeader: [];
	select: [LogEntry | undefined];
	clearExecutionData: [];
}>();

defineSlots<{ actions: {} }>();

const locale = useI18n();
const telemetry = useTelemetry();
const router = useRouter();
const runWorkflow = useRunWorkflow({ router });
const ndvStore = useNDVStore();
const isClearExecutionButtonVisible = useClearExecutionButtonVisible();
const isEmpty = computed(() => execution === undefined);
const switchViewOptions = computed(() => [
	{ label: locale.baseText('logs.overview.header.switch.overview'), value: 'overview' as const },
	{ label: locale.baseText('logs.overview.header.switch.details'), value: 'details' as const },
]);
const consumedTokens = computed(() =>
	getTotalConsumedTokens(...(execution?.tree ?? []).map(getSubtreeTotalConsumedTokens)),
);

function handleClickNode(clicked: LogEntry) {
	if (selected?.node === clicked.node && selected?.runIndex === clicked.runIndex) {
		emit('select', undefined);
		return;
	}

	emit('select', clicked);
	telemetry.track('User selected node in log view', {
		node_type: clicked.node.type,
		node_id: clicked.node.id,
		execution_id: execution?.id,
		workflow_id: execution?.workflowData.id,
	});
}

function handleSwitchView(value: 'overview' | 'details') {
	emit(
		'select',
		value === 'overview' || (execution?.tree ?? []).length === 0 ? undefined : execution?.tree[0],
	);
}

function handleToggleExpanded(treeNode: ElTreeNode) {
	treeNode.expanded = !treeNode.expanded;
}

async function handleOpenNdv(treeNode: LogEntry) {
	ndvStore.setActiveNodeName(treeNode.node.name);

	await nextTick(() => ndvStore.setOutputRunIndex(treeNode.runIndex));
}

async function handleTriggerPartialExecution(treeNode: LogEntry) {
	const latestName = latestNodeInfo[treeNode.node.id]?.name ?? treeNode.node.name;

	if (latestName) {
		await runWorkflow.runWorkflow({ destinationNode: latestName });
	}
}
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
				v-if="isEmpty"
				tag="p"
				size="medium"
				color="text-base"
				:class="$style.emptyText"
				data-test-id="logs-overview-empty"
			>
				{{ locale.baseText('logs.overview.body.empty.message') }}
			</N8nText>
			<div v-else :class="$style.scrollable">
				<ExecutionSummary
					v-if="execution"
					:class="$style.summary"
					:status="execution.status"
					:consumed-tokens="consumedTokens"
					:time-took="
						execution.startedAt && execution.stoppedAt
							? +new Date(execution.stoppedAt) - +new Date(execution.startedAt)
							: undefined
					"
				/>
				<ElTree
					v-if="(execution?.tree ?? []).length > 0"
					node-key="id"
					:class="$style.tree"
					:indent="0"
					:data="execution?.tree ?? []"
					:expand-on-click-node="false"
					:default-expand-all="true"
					@node-click="handleClickNode"
				>
					<template #default="{ node: elTreeNode, data }">
						<LogsOverviewRow
							:data="data"
							:node="elTreeNode"
							:is-read-only="isReadOnly"
							:is-selected="
								data.node.name === selected?.node.name && data.runIndex === selected?.runIndex
							"
							:is-compact="isCompact"
							:should-show-consumed-tokens="consumedTokens.totalTokens > 0"
							:latest-info="latestNodeInfo[data.node.id]"
							@toggle-expanded="handleToggleExpanded"
							@open-ndv="handleOpenNdv"
							@trigger-partial-execution="handleTriggerPartialExecution"
						/>
					</template>
				</ElTree>
				<N8nRadioButtons
					size="small"
					:class="$style.switchViewButtons"
					:model-value="selected ? 'details' : 'overview'"
					:options="switchViewOptions"
					@update:model-value="handleSwitchView"
				/>
			</div>
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

.scrollable {
	flex-grow: 1;
	flex-shrink: 1;
	overflow: auto;
	scroll-padding-block: var(--spacing-2xs);
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
	margin: var(--spacing-2xs);
	visibility: hidden;
	opacity: 0;
	transition: opacity 0.3s $ease-out-expo;

	.content:hover & {
		visibility: visible;
		opacity: 1;
	}
}
</style>
