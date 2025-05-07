import {
	type LlmTokenUsageData,
	type IAiDataContent,
	type INodeUi,
	type IExecutionResponse,
} from '@/Interface';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	type IRunData,
	type INodeExecutionData,
	type ITaskData,
	type ITaskDataConnections,
	type NodeConnectionType,
	type Workflow,
} from 'n8n-workflow';
import { type LogEntrySelection } from '../CanvasChat/types/logs';
import { isProxy, isReactive, isRef, toRaw } from 'vue';

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

	// When at root depth, filter AI data to only show executions that were triggered by this node
	// This prevents duplicate entries in logs when a sub-node is connected to multiple root nodes
	// Nodes without source info or with empty source arrays are always included
	const filteredAiData =
		currentDepth === 0
			? aiData?.filter(({ data }) => {
					if (!data?.source || data.source.every((source) => source === null)) {
						return true;
					}

					return data.source.some(
						(source) =>
							source?.previousNode === nodeName &&
							(runIndex === undefined || source.previousNodeRun === runIndex),
					);
				})
			: aiData;

	// Get the first level of children
	const connectedSubNodes = workflow.getParentNodes(nodeName, 'ALL_NON_MAIN', 1);

	const treeNode = createNode(parent, nodeName, currentDepth, runIndex ?? 0);

	// Only include sub-nodes which have data
	const children = (filteredAiData ?? []).flatMap((data) =>
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
				// Include source information in AI content to track which node triggered the execution
				// This enables filtering in the UI to show only relevant executions
				source: taskData.source,
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

export interface ExecutionLogViewData extends IExecutionResponse {
	tree: LogEntry[];
}

export interface LogEntry {
	parent?: LogEntry;
	node: INodeUi;
	id: string;
	children: LogEntry[];
	depth: number;
	runIndex: number;
	runData: ITaskData;
	consumedTokens: LlmTokenUsageData;
}

export interface LatestNodeInfo {
	disabled: boolean;
	deleted: boolean;
	name: string;
}

function getConsumedTokensV2(task: ITaskData): LlmTokenUsageData {
	if (!task.data) {
		return emptyTokenUsageData;
	}

	const tokenUsage = Object.values(task.data)
		.flat()
		.flat()
		.reduce<LlmTokenUsageData>((acc, curr) => {
			const tokenUsageData = curr?.json?.tokenUsage ?? curr?.json?.tokenUsageEstimate;

			if (!tokenUsageData) return acc;

			return addTokenUsageData(acc, {
				...(tokenUsageData as Omit<LlmTokenUsageData, 'isEstimate'>),
				isEstimate: !!curr?.json.tokenUsageEstimate,
			});
		}, emptyTokenUsageData);

	return tokenUsage;
}

function createNodeV2(
	parent: LogEntry | undefined,
	node: INodeUi,
	currentDepth: number,
	runIndex: number,
	runData: ITaskData,
	children: LogEntry[] = [],
): LogEntry {
	return {
		parent,
		node,
		id: `${node.name}:${runIndex}`,
		depth: currentDepth,
		runIndex,
		runData,
		children,
		consumedTokens: getConsumedTokensV2(runData),
	};
}

export function getTreeNodeDataV2(
	nodeName: string,
	runData: ITaskData,
	workflow: Workflow,
	data: IRunData,
	runIndex?: number,
): LogEntry[] {
	const node = workflow.getNode(nodeName);

	return node ? getTreeNodeDataRecV2(undefined, node, runData, 0, workflow, data, runIndex) : [];
}

function getTreeNodeDataRecV2(
	parent: LogEntry | undefined,
	node: INodeUi,
	runData: ITaskData,
	currentDepth: number,
	workflow: Workflow,
	data: IRunData,
	runIndex: number | undefined,
): LogEntry[] {
	// Get the first level of children
	const connectedSubNodes = workflow.getParentNodes(node.name, 'ALL_NON_MAIN', 1);
	const treeNode = createNodeV2(parent, node, currentDepth, runIndex ?? 0, runData);

	const children = connectedSubNodes
		.flatMap((subNodeName) =>
			(data[subNodeName] ?? []).flatMap((t, index) => {
				// At root depth, filter out node executions that weren't triggered by this node
				// This prevents showing duplicate executions when a sub-node is connected to multiple parents
				// Only filter nodes that have source information with valid previousNode references
				const isMatched =
					currentDepth === 0 && t.source.some((source) => source !== null)
						? t.source.some(
								(source) =>
									source?.previousNode === node.name &&
									(runIndex === undefined || source.previousNodeRun === runIndex),
							)
						: runIndex === undefined || index === runIndex;

				if (!isMatched) {
					return [];
				}

				const subNode = workflow.getNode(subNodeName);

				return subNode
					? getTreeNodeDataRecV2(treeNode, subNode, t, currentDepth + 1, workflow, data, index)
					: [];
			}),
		)
		.sort((a, b) => {
			// Sort the data by execution index or start time
			if (a.runData.executionIndex !== undefined && b.runData.executionIndex !== undefined) {
				return a.runData.executionIndex - b.runData.executionIndex;
			}

			const aTime = a.runData.startTime ?? 0;
			const bTime = b.runData.startTime ?? 0;

			return aTime - bTime;
		});

	treeNode.children = children;

	return [treeNode];
}

export function getTotalConsumedTokens(...usage: LlmTokenUsageData[]): LlmTokenUsageData {
	return usage.reduce(addTokenUsageData, emptyTokenUsageData);
}

export function getSubtreeTotalConsumedTokens(treeNode: LogEntry): LlmTokenUsageData {
	return getTotalConsumedTokens(
		treeNode.consumedTokens,
		...treeNode.children.map(getSubtreeTotalConsumedTokens),
	);
}

function findLogEntryToAutoSelectRec(
	data: ExecutionLogViewData,
	subTree: LogEntry[],
	depth: number,
): LogEntry | undefined {
	for (const entry of subTree) {
		const taskData = data.data?.resultData.runData[entry.node.name]?.[entry.runIndex];

		if (taskData?.error) {
			return entry;
		}

		const childAutoSelect = findLogEntryToAutoSelectRec(data, entry.children, depth + 1);

		if (childAutoSelect) {
			return childAutoSelect;
		}

		if (
			data.workflowData.nodes.find((n) => n.name === entry.node.name)?.type ===
			AGENT_LANGCHAIN_NODE_TYPE
		) {
			return entry;
		}
	}

	return depth === 0 ? subTree[0] : undefined;
}

export function createLogEntries(workflow: Workflow, runData: IRunData) {
	const runs = Object.entries(runData)
		.flatMap(([nodeName, taskData]) =>
			workflow.getChildNodes(nodeName, 'ALL_NON_MAIN').length > 0 ||
			workflow.getNode(nodeName)?.disabled
				? [] // skip sub nodes and disabled nodes
				: taskData.map((task, runIndex) => ({
						nodeName,
						task,
						runIndex,
						nodeHasMultipleRuns: taskData.length > 1,
					})),
		)
		.sort((a, b) => {
			if (a.task.executionIndex !== undefined && b.task.executionIndex !== undefined) {
				return a.task.executionIndex - b.task.executionIndex;
			}

			return a.nodeName === b.nodeName
				? a.runIndex - b.runIndex
				: a.task.startTime - b.task.startTime;
		});

	return runs.flatMap(({ nodeName, runIndex, task, nodeHasMultipleRuns }) =>
		getTreeNodeDataV2(
			nodeName,
			task,
			workflow,
			runData,
			nodeHasMultipleRuns ? runIndex : undefined,
		),
	);
}

export function includesLogEntry(log: LogEntry, logs: LogEntry[]): boolean {
	return logs.some(
		(l) =>
			(l.node.name === log.node.name && log.runIndex === l.runIndex) ||
			includesLogEntry(log, l.children),
	);
}

export function findSelectedLogEntry(
	state: LogEntrySelection,
	execution?: ExecutionLogViewData,
): LogEntry | undefined {
	return state.type === 'initial' ||
		state.workflowId !== execution?.workflowData.id ||
		(state.type === 'selected' && !includesLogEntry(state.data, execution.tree))
		? execution
			? findLogEntryToAutoSelectRec(execution, execution.tree, 0)
			: undefined
		: state.type === 'none'
			? undefined
			: state.data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepToRaw<T>(sourceObj: T): T {
	const seen = new WeakMap();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const objectIterator = (input: any): any => {
		if (seen.has(input)) {
			return input;
		}

		if (input !== null && typeof input === 'object') {
			seen.set(input, true);
		}

		if (Array.isArray(input)) {
			return input.map((item) => objectIterator(item));
		}

		if (isRef(input) || isReactive(input) || isProxy(input)) {
			return objectIterator(toRaw(input));
		}

		if (
			input !== null &&
			typeof input === 'object' &&
			Object.getPrototypeOf(input) === Object.prototype
		) {
			return Object.keys(input).reduce((acc, key) => {
				acc[key as keyof typeof acc] = objectIterator(input[key]);
				return acc;
			}, {} as T);
		}

		return input;
	};

	return objectIterator(sourceObj);
}

export function flattenLogEntries(
	entries: LogEntry[],
	collapsedEntryIds: Record<string, boolean>,
	ret: LogEntry[] = [],
): LogEntry[] {
	for (const entry of entries) {
		ret.push(entry);

		if (!collapsedEntryIds[entry.id]) {
			flattenLogEntries(entry.children, collapsedEntryIds, ret);
		}
	}

	return ret;
}
