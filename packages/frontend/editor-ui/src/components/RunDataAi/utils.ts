import { type IAiDataContent } from '@/Interface';
import {
	type ITaskData,
	type ITaskDataConnections,
	type NodeConnectionType,
	type Workflow,
} from 'n8n-workflow';

export interface AIResult {
	node: string;
	runIndex: number;
	data: IAiDataContent | undefined;
}

export interface TreeNode {
	parent?: TreeNode;
	node: string;
	id: string;
	children: TreeNode[];
	depth: number;
	startTime: number;
	runIndex: number;
}

function createNode(
	parent: TreeNode | undefined,
	nodeName: string,
	currentDepth: number,
	r?: AIResult,
	children: TreeNode[] = [],
): TreeNode {
	return {
		parent,
		node: nodeName,
		id: nodeName,
		depth: currentDepth,
		startTime: r?.data?.metadata?.startTime ?? 0,
		runIndex: r?.runIndex ?? 0,
		children,
	};
}

export function getTreeNodeData(
	nodeName: string,
	workflow: Workflow,
	aiData: AIResult[] | undefined,
): TreeNode[] {
	return getTreeNodeDataRec(undefined, nodeName, 0, workflow, aiData, undefined);
}

function getTreeNodeDataRec(
	parent: TreeNode | undefined,
	nodeName: string,
	currentDepth: number,
	workflow: Workflow,
	aiData: AIResult[] | undefined,
	runIndex: number | undefined,
): TreeNode[] {
	const connections = workflow.connectionsByDestinationNode[nodeName];
	const resultData =
		aiData?.filter(
			(data) => data.node === nodeName && (runIndex === undefined || runIndex === data.runIndex),
		) ?? [];

	if (!connections) {
		return resultData.map((d) => createNode(parent, nodeName, currentDepth, d));
	}

	// Get the first level of children
	const connectedSubNodes = workflow.getParentNodes(nodeName, 'ALL_NON_MAIN', 1);

	const treeNode = createNode(parent, nodeName, currentDepth);
	const children = connectedSubNodes.flatMap((name) => {
		// Only include sub-nodes which have data
		return (
			aiData
				?.filter(
					(data) => data.node === name && (runIndex === undefined || data.runIndex === runIndex),
				)
				.flatMap((data) =>
					getTreeNodeDataRec(treeNode, name, currentDepth + 1, workflow, aiData, data.runIndex),
				) ?? []
		);
	});

	children.sort((a, b) => a.startTime - b.startTime);

	treeNode.children = children;

	if (resultData.length) {
		return resultData.map((r) => createNode(treeNode, nodeName, currentDepth, r, children));
	}

	return [treeNode];
}

export function createAiData(
	nodeName: string,
	workflow: Workflow,
	getWorkflowResultDataByNodeName: (nodeName: string) => ITaskData[] | null,
): AIResult[] {
	const result: AIResult[] = [];
	const connectedSubNodes = workflow.getParentNodes(nodeName, 'ALL_NON_MAIN');

	connectedSubNodes.forEach((node) => {
		const nodeRunData = getWorkflowResultDataByNodeName(node) ?? [];

		nodeRunData.forEach((run, runIndex) => {
			const referenceData = {
				data: getReferencedData(run, false, true)[0],
				node,
				runIndex,
			};

			result.push(referenceData);
		});
	});

	// Sort the data by start time
	result.sort((a, b) => {
		const aTime = a.data?.metadata?.startTime ?? 0;
		const bTime = b.data?.metadata?.startTime ?? 0;
		return aTime - bTime;
	});

	return result;
}

export function getReferencedData(
	taskData: ITaskData,
	withInput: boolean,
	withOutput: boolean,
): IAiDataContent[] {
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
				type: type as NodeConnectionType,
				metadata: {
					executionTime: taskData.executionTime,
					startTime: taskData.startTime,
					subExecution: taskData.metadata?.subExecution,
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
