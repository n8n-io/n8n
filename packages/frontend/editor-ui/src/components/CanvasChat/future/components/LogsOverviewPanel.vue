<script setup lang="ts">
import PanelHeader from '@/components/CanvasChat/future/components/PanelHeader.vue';
import { useClearExecutionButtonVisible } from '@/composables/useClearExecutionButtonVisible';
import { useI18n } from '@/composables/useI18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nButton, N8nRadioButtons, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';
import { ElTree, type TreeNode as ElTreeNode } from 'element-plus';
import {
	getSubtreeTotalConsumedTokens,
	getTotalConsumedTokens,
	type TreeNode,
} from '@/components/RunDataAi/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import LogsOverviewRow from '@/components/CanvasChat/future/components/LogsOverviewRow.vue';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useNDVStore } from '@/stores/ndv.store';
import { useRouter } from 'vue-router';
import ExecutionSummary from '@/components/CanvasChat/future/components/ExecutionSummary.vue';

const { isOpen, isReadOnly, selected, isCompact, executionTree } = defineProps<{
	isOpen: boolean;
	selected?: TreeNode;
	isReadOnly: boolean;
	isCompact: boolean;
	executionTree: TreeNode[];
}>();

const emit = defineEmits<{ clickHeader: []; select: [TreeNode | undefined] }>();

defineSlots<{ actions: {} }>();

const locale = useI18n();
const telemetry = useTelemetry();
const workflowsStore = useWorkflowsStore();
const router = useRouter();
const runWorkflow = useRunWorkflow({ router });
const ndvStore = useNDVStore();
const nodeHelpers = useNodeHelpers();
const isClearExecutionButtonVisible = useClearExecutionButtonVisible();
const workflow = computed(() => workflowsStore.getCurrentWorkflow());
const isEmpty = computed(() => workflowsStore.workflowExecutionData === null);
const switchViewOptions = computed(() => [
	{ label: locale.baseText('logs.overview.header.switch.details'), value: 'details' as const },
	{ label: locale.baseText('logs.overview.header.switch.overview'), value: 'overview' as const },
]);
const execution = computed(() => workflowsStore.workflowExecutionData);
const consumedTokens = computed(() =>
	getTotalConsumedTokens(...executionTree.map(getSubtreeTotalConsumedTokens)),
);

function onClearExecutionData() {
	workflowsStore.setWorkflowExecutionData(null);
	nodeHelpers.updateNodesExecutionIssues();
}

function handleClickNode(clicked: TreeNode) {
	if (selected?.node === clicked.node && selected?.runIndex === clicked.runIndex) {
		emit('select', undefined);
		return;
	}

	emit('select', clicked);
	telemetry.track('User selected node in log view', {
		node_type: workflowsStore.nodesByName[clicked.node].type,
		node_id: workflowsStore.nodesByName[clicked.node].id,
		execution_id: workflowsStore.workflowExecutionData?.id,
		workflow_id: workflow.value.id,
	});
}

function handleSwitchView(value: 'overview' | 'details') {
	emit('select', value === 'overview' || executionTree.length === 0 ? undefined : executionTree[0]);
}

function handleToggleExpanded(treeNode: ElTreeNode) {
	treeNode.expanded = !treeNode.expanded;
}

async function handleOpenNdv(treeNode: TreeNode) {
	ndvStore.setActiveNodeName(treeNode.node);
}

async function handleTriggerPartialExecution(treeNode: TreeNode) {
	await runWorkflow.runWorkflow({ destinationNode: treeNode.node });
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
						@click.stop="onClearExecutionData"
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
					v-if="executionTree.length > 0"
					node-key="id"
					:class="$style.tree"
					:indent="0"
					:data="executionTree"
					:expand-on-click-node="false"
					:default-expand-all="true"
					@node-click="handleClickNode"
				>
					<template #default="{ node: elTreeNode, data }">
						<LogsOverviewRow
							:data="data"
							:node="elTreeNode"
							:is-read-only="isReadOnly"
							:is-selected="data.node === selected?.node && data.runIndex === selected?.runIndex"
							:is-compact="isCompact"
							:should-show-consumed-tokens="consumedTokens.totalTokens > 0"
							@toggle-expanded="handleToggleExpanded"
							@open-ndv="handleOpenNdv"
							@trigger-partial-execution="handleTriggerPartialExecution"
						/>
					</template>
				</ElTree>
				<N8nRadioButtons
					size="medium"
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
}

.summary {
	margin-bottom: var(--spacing-4xs);
	padding: var(--spacing-4xs) var(--spacing-2xs) 0 var(--spacing-2xs);
	min-height: calc(30px + var(--spacing-s));
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
