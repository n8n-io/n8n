<script lang="ts" setup>
import type { Ref } from 'vue';
import { computed, ref, watch } from 'vue';
import {
	type AIResult,
	createAiData,
	getReferencedData,
	getTreeNodeData,
	type TreeNode,
} from '@/components/RunDataAi/utils';
import type { IAiData, INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import NodeIcon from '@/components/NodeIcon.vue';
import RunDataAiContent from './RunDataAiContent.vue';
import { useI18n } from '@n8n/i18n';
import type { Workflow } from 'n8n-workflow';

import { ElTree } from 'element-plus';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
export interface Props {
	node: INodeUi;
	runIndex?: number;
	slim?: boolean;
	workflowObject: Workflow;
}
const props = withDefaults(defineProps<Props>(), { runIndex: 0 });
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const selectedRun: Ref<IAiData[]> = ref([]);

const i18n = useI18n();

const aiData = computed<AIResult[]>(() =>
	createAiData(
		props.node.name,
		props.workflowObject.connectionsBySourceNode,
		workflowsStore.getWorkflowResultDataByNodeName,
	),
);

const executionTree = computed<TreeNode[]>(() =>
	getTreeNodeData(
		props.node.name,
		props.workflowObject.connectionsBySourceNode,
		aiData.value,
		props.runIndex,
	),
);

function isTreeNodeSelected(node: TreeNode) {
	return selectedRun.value.some((run) => run.node === node.node && run.runIndex === node.runIndex);
}

function toggleTreeItem(node: { expanded: boolean }) {
	node.expanded = !node.expanded;
}

function onItemClick(data: TreeNode) {
	const matchingRun = aiData.value?.find(
		(run) => run.node === data.node && run.runIndex === data.runIndex,
	);
	if (!matchingRun) {
		selectedRun.value = [];

		return;
	}

	const selectedNodeRun = workflowsStore.getWorkflowResultDataByNodeName(data.node)?.[
		data.runIndex
	];
	if (!selectedNodeRun) {
		return;
	}
	selectedRun.value = [
		{
			node: data.node,
			runIndex: data.runIndex,
			data: getReferencedData(selectedNodeRun, true, true),
		},
	];
}

function getNodeType(nodeName: string) {
	const node = workflowsStore.getNodeByName(nodeName);
	if (!node) {
		return null;
	}
	const nodeType = nodeTypesStore.getNodeType(node?.type);

	return nodeType;
}

function selectFirst() {
	if (executionTree.value.length && executionTree.value[0].children.length) {
		onItemClick(executionTree.value[0].children[0]);
	}
}

watch(() => props.runIndex, selectFirst, { immediate: true });
</script>

<template>
	<div :class="$style.container">
		<template v-if="aiData.length > 0">
			<div :class="{ [$style.tree]: true, [$style.slim]: slim }">
				<ElTree
					:data="executionTree"
					:props="{ label: 'node' }"
					default-expand-all
					:indent="32"
					:expand-on-click-node="false"
					data-test-id="lm-chat-logs-tree"
					@node-click="onItemClick"
				>
					<template #default="{ node: currentNode, data }">
						<div
							:class="{
								[$style.treeNode]: true,
								[$style.selected]: isTreeNodeSelected(data),
								[$style.hasToggle]: data.children.length > 0,
							}"
							:data-tree-depth="data.depth"
							:style="{ '--indent-depth': data.depth }"
						>
							<div :class="$style.background" />
							<NodeIcon :node-type="getNodeType(data.node)!" :size="16" :class="$style.icon" />
							<span :class="$style.name">
								<N8nTooltip :disabled="!slim" placement="right">
									<template #content>
										{{ currentNode.label }}
									</template>
									<span v-if="!slim" v-text="currentNode.label" />
								</N8nTooltip>
							</span>
							<button
								v-if="data.children.length"
								:class="$style.treeToggle"
								@click="toggleTreeItem(currentNode)"
							>
								<N8nIcon :icon="currentNode.expanded ? 'chevron-down' : 'chevron-right'" />
							</button>
						</div>
					</template>
				</ElTree>
			</div>
			<div :class="$style.runData">
				<div v-if="selectedRun.length === 0" :class="$style.empty">
					<N8nText size="large">
						{{
							i18n.baseText('ndv.output.ai.empty', {
								interpolate: {
									node: props.node.name,
								},
							})
						}}
					</N8nText>
				</div>
				<div
					v-for="(data, index) in selectedRun"
					:key="`${data.node}__${data.runIndex}__index`"
					data-test-id="lm-chat-logs-entry"
				>
					<RunDataAiContent :input-data="data" :content-index="index" />
				</div>
			</div>
		</template>
		<div v-else :class="$style.noData">
			{{ i18n.baseText('ndv.output.ai.waiting') }}
		</div>
	</div>
</template>

<style lang="scss" module>
.treeToggle {
	border: none;
	background-color: transparent;
	padding: 0 var(--spacing-3xs);
	margin: 0 calc(-1 * var(--spacing-3xs));
	cursor: pointer;
}
.leafLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
}
.noData {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	color: var(--color-text-light);
}
.empty {
	padding: var(--spacing-l);
}
.title {
	font-size: var(--font-size-s);
	margin-bottom: var(--spacing-xs);
}
.tree {
	flex-shrink: 0;
	min-width: 8rem;
	height: 100%;

	padding-right: var(--spacing-xs);
	padding-left: var(--spacing-2xs);
	&.slim {
		min-width: auto;
	}
}
.runData {
	width: 100%;
	height: 100%;
	overflow: auto;
}
.container {
	height: 100%;
	padding: 0 var(--spacing-xs);
	display: flex;

	:global(.el-tree-node__expand-icon) {
		display: none;
	}

	:global(.el-tree-node__content) {
		background-color: transparent !important;
		position: relative;
		height: auto;

		&:hover {
			background-color: transparent !important;
		}
	}

	:global(.el-tree-node) {
		margin-bottom: var(--spacing-4xs);
	}

	:global(.el-tree-node__children .el-tree-node__content::before) {
		content: '';
		position: absolute;
		left: var(--spacing-s);
		bottom: var(--spacing-s);
		border-bottom: 2px solid var(--color-canvas-dot);
		border-left: 2px solid var(--color-canvas-dot);
		width: var(--spacing-l);
		height: var(--spacing-l);
		border-radius: 0 0 0 var(--border-radius-large);
		z-index: 0;
	}

	:global(.el-tree-node__children .el-tree-node:not(:last-child) .el-tree-node__content::after) {
		content: '';
		position: absolute;
		left: var(--spacing-s);
		top: 0;
		border-left: 2px solid var(--color-canvas-dot);
		height: 100%;
		z-index: 0;
	}
}

.treeNode {
	display: flex;
	align-items: center;
	overflow: hidden;
	position: relative;
	z-index: 1;
	cursor: pointer;
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	padding: var(--spacing-2xs);
	border-radius: var(--border-radius-base);
	min-height: 32px;
	width: 100%;

	&.selected {
		font-weight: var(--font-weight-bold);
	}
}

.background {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	border-radius: var(--border-radius-base);
	z-index: -1;

	.hasToggle & {
		right: calc(-1 * (var(--spacing-3xs) * 2));
		width: calc(100% + var(--spacing-3xs) * 2);
	}

	.selected & {
		background-color: var(--color-foreground-base);
	}

	.treeNode:hover:not(.selected) & {
		background-color: var(--color-foreground-light);
	}
}

.icon {
	flex-shrink: 0;
	margin-right: var(--spacing-2xs);
}

.name {
	flex: 1;
	min-width: 0;
}
</style>
