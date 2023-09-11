<template>
	<div v-if="aiData" class="data-ai">
		Log tree
		<el-tree-v2 :data="[executionTree]" :props="{ label: 'node' }">
			<template #default="{ node, data }">
				<div
					class="node-item"
					:class="{ [`depth-${data.depth}`]: true, 'has-children': data.children.length > 0 }"
					:style="{ '--item-depth': data.depth }"
				>
					<node-icon :nodeType="getNodeType(data.node)" />
					<!-- <span class="prefix" :class="{ 'is-leaf': node.isLeaf }">{{ data.depth }}</span> -->
					<span>{{ node.label }}</span>
				</div>
			</template>
		</el-tree-v2>
		<!-- <div v-for="(data, index) in aiData.aiRun" :key="`${data.node}__${data.runIndex}__index`">
			<RunDataAiContent :inputData="getReferencedData(data)" :contentIndex="index" />
		</div> -->
	</div>
</template>

<style lang="scss">
.data-ai {
	.el-vl__window > div {
		position: relative;
		&:after {
			content: '';
			position: absolute;
			top: 20px;
			bottom: 14px;
			left: 8px;
			width: 2px;
			background-color: var(--color-foreground-base);
		}
		.el-tree-node__expand-icon {
			display: none;
		}
	}
}
.node-item {
	position: relative;
	display: flex;
	align-items: center;
	font-size: var(--font-size-xs);
	color: var(--color-text-dark);

	&:not(.depth-0) {
		padding-left: 8px;
	}

	&:after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		margin: auto;
		background-color: var(--color-foreground-base);
		height: 2px;
		left: calc((var(--item-depth) * 16px * -1));
		width: calc(var(--item-depth) * 16px);
	}
}
.el-tree-node__content {
	margin-left: 8px;
}
</style>
<script lang="ts" setup>
import { computed, watch, ref } from 'vue';
import type { ITaskAIRunMetadata, ITaskDataConnections, ITaskMetadata } from 'n8n-workflow';
import type { EndpointType, IAiData, IAiDataContent, INodeUi } from '@/Interface';
import { ElTreeV2 } from 'element-plus';
import { useNodeTypesStore, useWorkflowsStore } from '@/stores';
import NodeIcon from '@/components/NodeIcon.vue';
import type { ITaskData } from 'n8n-workflow';

const props = defineProps<{
	node: INodeUi;
}>();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();

const executionTree = ref({});

const aiData = computed<ITaskMetadata | undefined>(() => {
	const resultData = workflowsStore.getWorkflowResultDataByNodeName(props.node.name);

	if (!resultData || !Array.isArray(resultData)) {
		return;
	}

	return resultData[resultData.length - 1].metadata;
});

interface TreeNode {
	node: string;
	id: string;
	children: TreeNode[];
	depth: number;
	resultData: ITaskData[] | null;
}

function getNodeType(nodeName: string) {
	const node = workflowsStore.getNodeByName(nodeName);
	// const workflow = workflowsStore.getCurrentWorkflow();
	if (!node) {
		return 'unknown';
	}
	const nodeType = nodeTypesStore.getNodeType(node?.type);

	return nodeType;
}
function getTreeNodeData(nodeName: string, currentDepth: number): TreeNode {
	const workflow = workflowsStore.getCurrentWorkflow();
	const connections = workflow.connectionsByDestinationNode[nodeName];
	const resultData = workflowsStore.getWorkflowResultDataByNodeName(nodeName);

	if (!connections) {
		return {
			node: nodeName,
			id: nodeName,
			depth: currentDepth,
			resultData,
			children: [],
		};
	}

	const nonMainConnectionsKeys = Object.keys(connections).filter((key) => key !== 'main');

	const children: TreeNode[] = [];
	for (let i = 0; i < nonMainConnectionsKeys.length; i++) {
		const connectedNodes = connections[nonMainConnectionsKeys[i]][0];
		for (let j = 0; j < connectedNodes.length; j++) {
			const childNodeName = connectedNodes[j].node;
			children.push(getTreeNodeData(childNodeName, currentDepth + 1));
		}
	}

	return {
		node: nodeName,
		resultData,
		children,
		depth: currentDepth,
		id: nodeName,
	};
}

function buildExecutionTree() {
	const rootNode = props.node;

	const tree = getTreeNodeData(rootNode.name, 0);

	executionTree.value = tree;
	console.log('🚀 ~ file: RunDataAi.vue:72 ~ buildExecutionTree ~ tree:', tree);
}

function getReferencedData(reference: ITaskAIRunMetadata): IAiData | undefined {
	const resultData = workflowsStore.getWorkflowResultDataByNodeName(reference.node);

	if (!resultData?.[reference.runIndex]) {
		return;
	}

	const taskData = resultData[reference.runIndex];

	if (!taskData) {
		return;
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

	addFunction(taskData.inputOverride, 'input');
	addFunction(taskData.data, 'output');

	return {
		data: returnData,
		node: reference.node,
		runIndex: reference.runIndex,
	};
}
watch(
	() => aiData.value,
	() => {
		console.log('AI Data changed');
		buildExecutionTree();
	},
	{
		immediate: true,
	},
);
// export default defineComponent({
// 	name: 'run-data-ai',
// 	mixins: [],
// 	components: {
// 		RunDataAiContent,
// 	},
// 	props: {
// 		node: {
// 			type: Object as PropType<INodeUi>,
// 		},
// 	},
// 	computed: {
// 		...mapStores(useNDVStore, useWorkflowsStore),
// 		aiData(): ITaskMetadata | undefined {
// 			if (this.node) {
// 				const resultData = workflowsStore.getWorkflowResultDataByNodeName(this.node.name);

// 				if (!resultData || !Array.isArray(resultData)) {
// 					return;
// 				}

// 				return resultData[resultData.length - 1!].metadata;
// 			}
// 			return;
// 		},
// 	},
// 	methods: {
// 		getReferencedData(reference: ITaskAIRunMetadata): IAiData | undefined {
// 			const resultData = workflowsStore.getWorkflowResultDataByNodeName(reference.node);

// 			if (!resultData?.[reference.runIndex]) {
// 				return;
// 			}

// 			const taskData = resultData[reference.runIndex];

// 			if (!taskData) {
// 				return;
// 			}

// 			const returnData: IAiDataContent[] = [];

// 			function addFunction(data: ITaskDataConnections | undefined, inOut: 'input' | 'output') {
// 				if (!data) {
// 					return;
// 				}

// 				Object.keys(data).map((type) => {
// 					returnData.push({
// 						data: data[type][0],
// 						inOut,
// 						type: type as EndpointType,
// 						metadata: {
// 							executionTime: taskData.executionTime,
// 							startTime: taskData.startTime,
// 						},
// 					});
// 				});
// 			}

// 			addFunction(taskData.inputOverride, 'input');
// 			addFunction(taskData.data, 'output');

// 			return {
// 				data: returnData,
// 				node: reference.node,
// 				runIndex: reference.runIndex,
// 			};
// 		},
// 	},
// });
</script>
