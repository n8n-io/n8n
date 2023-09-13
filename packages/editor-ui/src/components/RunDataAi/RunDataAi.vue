<template>
	<div v-if="aiData" :class="$style.container">
		<div :class="$style.tree">
			<p :class="$style.title">Log tree</p>
			<el-tree
				:data="executionTree"
				:props="{ label: 'node' }"
				default-expand-all
				:indent="12"
				@node-click="onItemClick"
			>
				<template #default="{ node, data }">
					<div
						:class="{
							[$style.treeNode]: true,
							[$style.isSelected]: isTreeNodeSelected(data),
						}"
						:data-tree-depth="data.depth"
						:style="{ '--item-depth': data.depth }"
					>
						<node-icon
							v-if="getNodeType(data.node)"
							:node-type="getNodeType(data.node)"
							:size="17"
						/>
						<span>{{ node.label }}</span>
					</div>
				</template>
			</el-tree>
		</div>
		<div :class="$style.runData">
			<div v-for="(data, index) in selectedRun" :key="`${data.node}__${data.runIndex}__index`">
				<RunDataAiContent2 :inputData="data" :contentIndex="index" />
			</div>
			<!-- Run Data 1: -->
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import type { ITaskAIRunMetadata, ITaskDataConnections } from 'n8n-workflow';
import type { EndpointType, IAiData, IAiDataContent, INodeUi } from '@/Interface';
import { useNodeTypesStore, useWorkflowsStore } from '@/stores';
import NodeIcon from '@/components/NodeIcon.vue';
import RunDataAiContent2 from './RunDataAiContent2.vue';

interface AIResult {
	node: string;
	runIndex: number;
	data: IAiDataContent | undefined;
}

const props = defineProps<{
	node: INodeUi;
}>();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();

const aiData = computed<AIResult[] | undefined>(() => {
	const resultData = workflowsStore.getWorkflowResultDataByNodeName(props.node.name);

	if (!resultData || !Array.isArray(resultData)) {
		return;
	}

	const aiRun = resultData[resultData.length - 1].metadata?.aiRun;
	if (!Array.isArray(aiRun)) {
		return;
	}
	// Extend the aiRun with the data and sort by adding execution time + startTime and comparing them
	const aiRunWithData = aiRun.flatMap((run) =>
		getReferencedData(run, false, true).map((data) => ({ ...run, data })),
	);

	aiRunWithData.sort((a, b) => {
		const aTime = a.data?.metadata?.startTime || 0;
		const bTime = b.data?.metadata?.startTime || 0;
		return aTime - bTime;
	});

	return aiRunWithData;
});

const executionTree = computed<TreeNode[]>(() => {
	const rootNode = props.node;

	const tree = getTreeNodeData(rootNode.name, 0);
	return tree || [];
});
const selectedRun: Ref<IAiData[]> = ref([]);

function isTreeNodeSelected(node) {
	console.log('🚀 ~ file: RunDataAi.vue:91 ~ isTreeNodeSelected ~ node:', node);
	return selectedRun.value.some((run) => run.node === node.node && run.runIndex === node.runIndex);
}
function onItemClick(data: TreeNode) {
	console.log('🚀 ~ file: RunDataAi.vue:92 ~ onItemClick ~ data:', data);
	const matchingRun = aiData.value?.find(
		(run) => run.node === data.node && run.runIndex === data.runIndex,
	);
	if (!matchingRun) {
		return;
	}
	selectedRun.value = [
		{
			node: data.node,
			runIndex: data.runIndex,
			data: getReferencedData(
				{
					node: data.node,
					runIndex: data.runIndex,
				},
				true,
				true,
			),
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
interface TreeNode {
	node: string;
	id: string;
	children: TreeNode[];
	depth: number;
	startTime: number;
	runIndex: number;
}
const createNode = (
	nodeName: string,
	currentDepth: number,
	r?: AIResult,
	children: TreeNode[] = [],
): TreeNode => ({
	node: nodeName,
	id: nodeName,
	depth: currentDepth,
	startTime: r?.data?.metadata?.startTime ?? 0,
	runIndex: r?.runIndex ?? 0,
	children,
});

function getTreeNodeData(nodeName: string, currentDepth: number): TreeNode[] {
	const { connectionsByDestinationNode } = workflowsStore.getCurrentWorkflow();
	const connections = connectionsByDestinationNode[nodeName];
	const resultData = aiData.value?.filter((data) => data.node === nodeName) ?? [];

	if (!connections) {
		return resultData.map((d) => createNode(nodeName, currentDepth, d));
	}

	const nonMainConnectionsKeys = Object.keys(connections).filter((key) => key !== 'main');
	const children = nonMainConnectionsKeys.flatMap((key) =>
		connections[key][0].flatMap((node) => getTreeNodeData(node.node, currentDepth + 1)),
	);

	if (resultData.length) {
		return resultData.map((r) => createNode(nodeName, currentDepth, r, children));
	}

	children.sort((a, b) => a.startTime - b.startTime);

	return [createNode(nodeName, currentDepth, undefined, children)];
}

function getReferencedData(
	reference: ITaskAIRunMetadata,
	withInput: boolean,
	withOutput: boolean,
): IAiDataContent[] {
	const resultData = workflowsStore.getWorkflowResultDataByNodeName(reference.node);
	console.log('🚀 ~ file: RunDataAi.vue:159 ~ getReferencedData ~ resultData:', resultData);

	if (!resultData?.[reference.runIndex]) {
		return [];
	}

	const taskData = resultData[reference.runIndex];

	if (!taskData) {
		return [];
	}

	const returnData: IAiDataContent[] = [];

	function addFunction(data: ITaskDataConnections | undefined, inOut: 'input' | 'output') {
		if (!data) {
			return;
		}

		Object.keys(data).map((type) => {
			returnData.push({
				data: data[type][0],
				inOut,
				type: type as EndpointType,
				metadata: {
					executionTime: taskData.executionTime,
					startTime: taskData.startTime,
				},
			});
		});
	}

	if (withInput) {
		addFunction(taskData.inputOverride, 'input');
	}
	if (withOutput) {
		addFunction(taskData.data, 'output');
	}

	return returnData;
}
// watch(
// 	() => aiData.value,
// 	() => {
// 		console.log('AI Data changed', aiData.value);
// 		buildExecutionTree();
// 		// getReferencedData(refData);
// 	},
// 	{
// 		immediate: true,
// 	},
// );
</script>

<style lang="scss" module>
.title {
	font-size: var(--font-size-s);
	margin-bottom: var(--spacing-xs);
}
.tree {
	flex-shrink: 0;
	min-width: 12.8rem;
	height: 100%;
	border-right: 1px solid var(--color-foreground-base);
	padding-right: var(--spacing-xs);
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
.isSelected {
	background-color: var(--color-foreground-base);
}
.treeNode {
	display: inline-flex;
	border-radius: var(--border-radius-base);
	align-items: center;
	gap: var(--spacing-3xs);
	padding: var(--spacing-4xs) var(--spacing-3xs);
	font-size: var(--font-size-xs);
	color: var(--color-text-dark);
	margin-bottom: var(--spacing-3xs);
	cursor: pointer;

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
	}
}
</style>
