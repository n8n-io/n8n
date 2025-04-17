import { type LlmTokenUsageData, type INodeUi, type IExecutionResponse } from '@/Interface';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	type IRunData,
	type ITaskData,
	type Workflow,
} from 'n8n-workflow';
import { type LogEntrySelection } from '../types/logs';

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

function createNode(
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
		consumedTokens: getConsumedTokens(runData),
	};
}

export function getTreeNodeData(
	nodeName: string,
	runData: ITaskData,
	workflow: Workflow,
	data: IRunData,
	runIndex?: number,
): LogEntry[] {
	const node = workflow.getNode(nodeName);

	return node ? getTreeNodeDataRec(undefined, node, runData, 0, workflow, data, runIndex) : [];
}

function getTreeNodeDataRec(
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
	const treeNode = createNode(parent, node, currentDepth, runIndex ?? 0, runData);
	const children = connectedSubNodes
		.flatMap((subNodeName) =>
			(data[subNodeName] ?? []).flatMap((t, index) => {
				if (runIndex !== undefined && index !== runIndex) {
					return [];
				}

				const subNode = workflow.getNode(subNodeName);

				return subNode
					? getTreeNodeDataRec(treeNode, subNode, t, currentDepth + 1, workflow, data, index)
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

export function getConsumedTokens(task: ITaskData): LlmTokenUsageData {
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

export function getTotalConsumedTokens(...usage: LlmTokenUsageData[]): LlmTokenUsageData {
	return usage.reduce(addTokenUsageData, emptyTokenUsageData);
}

export function getSubtreeTotalConsumedTokens(treeNode: LogEntry): LlmTokenUsageData {
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
			return getTreeNodeData(nodeName, task, workflow, runData, undefined);
		}

		return getTreeNodeData(nodeName, task, workflow, runData, runIndex);
	});
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
