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
import { ElTree } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import type { Workflow } from 'n8n-workflow';

export interface Props {
	node: INodeUi;
	runIndex?: number;
	slim?: boolean;
	workflow: Workflow;
}
const props = withDefaults(defineProps<Props>(), { runIndex: 0 });
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const selectedRun: Ref<IAiData[]> = ref([]);

const i18n = useI18n();

const aiData = computed<AIResult[]>(() =>
	createAiData(props.node.name, props.workflow, workflowsStore.getWorkflowResultDataByNodeName),
);

const executionTree = computed<TreeNode[]>(() =>
	getTreeNodeData(props.node.name, props.workflow, aiData.value, props.runIndex),
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
					:indent="12"
					:expand-on-click-node="false"
					data-test-id="lm-chat-logs-tree"
					@node-click="onItemClick"
				>
					<template #default="{ node: currentNode, data }">
						<div
							:class="{
								[$style.treeNode]: true,
								[$style.isSelected]: isTreeNodeSelected(data),
							}"
							:data-tree-depth="data.depth"
							:style="{ '--item-depth': data.depth }"
						>
							<button
								v-if="data.children.length"
								:class="$style.treeToggle"
								@click="toggleTreeItem(currentNode)"
							>
								<n8n-icon :icon="currentNode.expanded ? 'chevron-down' : 'chevron-right'" />
							</button>
							<n8n-tooltip :disabled="!slim" placement="right">
								<template #content>
									{{ currentNode.label }}
								</template>
								<span :class="$style.leafLabel">
									<NodeIcon
										:node-type="getNodeType(data.node)!"
										:size="17"
										:class="$style.nodeIcon"
									/>
									<span v-if="!slim" v-text="currentNode.label" />
								</span>
							</n8n-tooltip>
						</div>
					</template>
				</ElTree>
			</div>
			<div :class="$style.runData">
				<div v-if="selectedRun.length === 0" :class="$style.empty">
					<n8n-text size="large">
						{{
							i18n.baseText('ndv.output.ai.empty', {
								interpolate: {
									node: props.node.name,
								},
							})
						}}
					</n8n-text>
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

	:global(.el-tree > .el-tree-node) {
		position: relative;
		&:after {
			content: '';
			position: absolute;
			top: 2rem;
			bottom: 1.2rem;
			left: 0.75rem;
			width: 0.125rem;
			background-color: var(--color-foreground-base);
		}
	}
	:global(.el-tree-node__expand-icon) {
		display: none;
	}
	:global(.el-tree) {
		margin-left: calc(-1 * var(--spacing-xs));
	}
	:global(.el-tree-node__content) {
		margin-left: var(--spacing-xs);
	}
}
.nodeIcon {
	padding: var(--spacing-3xs) var(--spacing-3xs);
	border-radius: var(--border-radius-base);
	margin-right: var(--spacing-4xs);
}
.isSelected {
	background-color: var(--color-foreground-base);
}
.treeNode {
	display: inline-flex;
	border-radius: var(--border-radius-base);
	align-items: center;
	padding-right: var(--spacing-3xs);
	margin: var(--spacing-4xs) 0;
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	margin-bottom: var(--spacing-3xs);
	cursor: pointer;

	&.isSelected {
		font-weight: var(--font-weight-bold);
	}
	&:hover {
		background-color: var(--color-foreground-base);
	}
	&[data-tree-depth='0'] {
		margin-left: calc(-1 * var(--spacing-2xs));
	}

	&:after {
		content: '';
		position: absolute;
		margin: auto;
		background-color: var(--color-foreground-base);
		height: 0.125rem;
		left: 0.75rem;
		width: calc(var(--item-depth) * 0.625rem);
		margin-top: var(--spacing-3xs);
	}
}
</style>
