import { type LlmTokenUsageData, type IAiDataContent, type INodeUi } from '@/Interface';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	type IRunData,
	type INodeExecutionData,
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
	consumedTokens: LlmTokenUsageData;
}

function createNode(
	parent: TreeNode | undefined,
	nodeName: string,
	currentDepth: number,
	runIndex: number,
	r?: AIResult,
	children: TreeNode[] = [],
): TreeNode {
	return {
		parent,
		node: nodeName,
		id: `${nodeName}:${runIndex}`,
		depth: currentDepth,
		startTime: r?.data?.metadata?.startTime ?? 0,
		runIndex,
		children,
		consumedTokens: getConsumedTokens(r?.data),
	};
}

export function getTreeNodeData(
	nodeName: string,
	workflow: Workflow,
	aiData: AIResult[] | undefined,
	runIndex?: number,
): TreeNode[] {
	return getTreeNodeDataRec(undefined, nodeName, 0, workflow, aiData, runIndex);
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
		return resultData.map((d) => createNode(parent, nodeName, currentDepth, d.runIndex, d));
	}

	// Get the first level of children
	const connectedSubNodes = workflow.getParentNodes(nodeName, 'ALL_NON_MAIN', 1);

	const treeNode = createNode(parent, nodeName, currentDepth, runIndex ?? 0);

	// Only include sub-nodes which have data
	const children = (aiData ?? []).flatMap((data) =>
		connectedSubNodes.includes(data.node) && (runIndex === undefined || data.runIndex === runIndex)
			? getTreeNodeDataRec(treeNode, data.node, currentDepth + 1, workflow, aiData, data.runIndex)
			: [],
	);

	treeNode.children = children;

	if (resultData.length) {
		return resultData.map((r) =>
			createNode(parent, nodeName, currentDepth, r.runIndex, r, children),
		);
	}

	return [treeNode];
}

export function createAiData(
	nodeName: string,
	workflow: Workflow,
	getWorkflowResultDataByNodeName: (nodeName: string) => ITaskData[] | null,
): AIResult[] {
	return workflow
		.getParentNodes(nodeName, 'ALL_NON_MAIN')
		.flatMap((node) =>
			(getWorkflowResultDataByNodeName(node) ?? []).map((task, index) => ({ node, task, index })),
		)
		.sort((a, b) => {
			// Sort the data by execution index or start time
			if (a.task.executionIndex !== undefined && b.task.executionIndex !== undefined) {
				return a.task.executionIndex - b.task.executionIndex;
			}

			const aTime = a.task.startTime ?? 0;
			const bTime = b.task.startTime ?? 0;

			return aTime - bTime;
		})
		.map(({ node, task, index }) => ({
			data: getReferencedData(task, false, true)[0],
			node,
			runIndex: index,
		}));
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

const emptyTokenUsageData: LlmTokenUsageData = {
	completionTokens: 0,
	promptTokens: 0,
	totalTokens: 0,
	isEstimate: false,
};

function addTokenUsageData(one: LlmTokenUsageData, another: LlmTokenUsageData): LlmTokenUsageData {
	return {
		completionTokens: one.completionTokens + another.completionTokens,
		promptTokens: one.promptTokens + another.promptTokens,
		totalTokens: one.totalTokens + another.totalTokens,
		isEstimate: one.isEstimate || another.isEstimate,
	};
}

export function getConsumedTokens(outputRun: IAiDataContent | undefined): LlmTokenUsageData {
	if (!outputRun?.data) {
		return emptyTokenUsageData;
	}

	const tokenUsage = outputRun.data.reduce<LlmTokenUsageData>(
		(acc: LlmTokenUsageData, curr: INodeExecutionData) => {
			const tokenUsageData = curr.json?.tokenUsage ?? curr.json?.tokenUsageEstimate;

			if (!tokenUsageData) return acc;

			return addTokenUsageData(acc, {
				...(tokenUsageData as Omit<LlmTokenUsageData, 'isEstimate'>),
				isEstimate: !!curr.json.tokenUsageEstimate,
			});
		},
		emptyTokenUsageData,
	);

	return tokenUsage;
}

export function getTotalConsumedTokens(...usage: LlmTokenUsageData[]): LlmTokenUsageData {
	return usage.reduce(addTokenUsageData, emptyTokenUsageData);
}

export function getSubtreeTotalConsumedTokens(treeNode: TreeNode): LlmTokenUsageData {
	return getTotalConsumedTokens(
		treeNode.consumedTokens,
		...treeNode.children.map(getSubtreeTotalConsumedTokens),
	);
}

export function formatTokenUsageCount(
	usage: LlmTokenUsageData,
	field: 'total' | 'prompt' | 'completion',
) {
	const count =
		field === 'total'
			? usage.totalTokens
			: field === 'completion'
				? usage.completionTokens
				: usage.promptTokens;

	return usage.isEstimate ? `~${count}` : count.toLocaleString();
}

export function findLogEntryToAutoSelect(
	tree: TreeNode[],
	nodesByName: Record<string, INodeUi>,
	runData: IRunData,
): TreeNode | undefined {
	return findLogEntryToAutoSelectRec(tree, nodesByName, runData, 0);
}

function findLogEntryToAutoSelectRec(
	tree: TreeNode[],
	nodesByName: Record<string, INodeUi>,
	runData: IRunData,
	depth: number,
): TreeNode | undefined {
	for (const entry of tree) {
		const taskData = runData[entry.node]?.[entry.runIndex];

		if (taskData?.error) {
			return entry;
		}

		const childAutoSelect = findLogEntryToAutoSelectRec(
			entry.children,
			nodesByName,
			runData,
			depth + 1,
		);

		if (childAutoSelect) {
			return childAutoSelect;
		}

		if (nodesByName[entry.node]?.type === AGENT_LANGCHAIN_NODE_TYPE) {
			return entry;
		}
	}

	return depth === 0 ? tree[0] : undefined;
}

export function createLogEntries(workflow: Workflow, runData: IRunData) {
	const runs = Object.entries(runData)
		.filter(([nodeName]) => workflow.getChildNodes(nodeName, 'ALL_NON_MAIN').length === 0)
		.flatMap(([nodeName, taskData]) =>
			taskData.map((task, runIndex) => ({ nodeName, task, runIndex })),
		)
		.sort((a, b) => {
			if (a.task.executionIndex !== undefined && b.task.executionIndex !== undefined) {
				return a.task.executionIndex - b.task.executionIndex;
			}

			return a.nodeName === b.nodeName
				? a.runIndex - b.runIndex
				: a.task.startTime - b.task.startTime;
		});

	return runs.flatMap(({ nodeName, runIndex, task }) => {
		if (workflow.getParentNodes(nodeName, 'ALL_NON_MAIN').length > 0) {
			return getTreeNodeData(
				nodeName,
				workflow,
				createAiData(nodeName, workflow, (node) => runData[node] ?? []),
				undefined,
			);
		}

		return getTreeNodeData(
			nodeName,
			workflow,
			[
				{
					data: getReferencedData(task, false, true)[0],
					node: nodeName,
					runIndex,
				},
			],
			runIndex,
		);
	});
}
