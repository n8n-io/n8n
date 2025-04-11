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
import { upperFirst } from 'lodash-es';
import { useTelemetry } from '@/composables/useTelemetry';
import ConsumedTokenCountText from '@/components/CanvasChat/future/components/ConsumedTokenCountText.vue';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useNDVStore } from '@/stores/ndv.store';
import { useRouter } from 'vue-router';

const { isOpen, isReadOnly, selected, executionTree } = defineProps<{
	isOpen: boolean;
	isReadOnly: boolean;
	selected?: TreeNode;
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
const executionStatusText = computed(() => {
	const execution = workflowsStore.workflowExecutionData;

	if (!execution) {
		return undefined;
	}

	if (execution.startedAt && execution.stoppedAt) {
		return locale.baseText('logs.overview.body.summaryText', {
			interpolate: {
				status: upperFirst(execution.status),
				time: locale.displayTimer(
					+new Date(execution.stoppedAt) - +new Date(execution.startedAt),
					true,
				),
			},
		});
	}

	return upperFirst(execution.status);
});
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
				<N8nText
					v-if="executionStatusText !== undefined"
					tag="div"
					color="text-light"
					size="small"
					:class="$style.summary"
				>
					<span>{{ executionStatusText }}</span>
					<ConsumedTokenCountText
						v-if="consumedTokens.totalTokens > 0"
						:consumed-tokens="consumedTokens"
					/>
				</N8nText>
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
							:is-compact="selected !== undefined"
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
.container {
	flex-grow: 1;
	flex-shrink: 1;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;
	background-color: var(--color-foreground-xlight);
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
	padding: var(--spacing-2xs);
	flex-grow: 1;
	flex-shrink: 1;
	overflow: auto;
}

.summary {
	display: flex;
	align-items: center;
	padding-block: var(--spacing-2xs);

	& > * {
		padding-inline: var(--spacing-2xs);
	}

	& > *:not(:last-child) {
		border-right: var(--border-base);
	}
}

.tree {
	margin-top: var(--spacing-2xs);

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
}
</style>
