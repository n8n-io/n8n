import {
	type LlmTokenUsageData,
	type IAiDataContent,
	type INodeUi,
	type IExecutionResponse,
} from '@/Interface';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	type INodeExecutionData,
	type ITaskData,
	type ITaskDataConnections,
	type NodeConnectionType,
	type Workflow,
	type ITaskStartedData,
	type IRunExecutionData,
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

export interface LogEntry {
	parent?: LogEntry;
	node: INodeUi;
	id: string;
	children: LogEntry[];
	depth: number;
	runIndex: number;
	runData: ITaskData;
	consumedTokens: LlmTokenUsageData;
	workflow: Workflow;
	executionId: string;
	execution: IRunExecutionData;
}

export interface LogTreeCreationContext {
	parent: LogEntry | undefined;
	depth: number;
	workflow: Workflow;
	executionId: string;
	data: IRunExecutionData;
	workflows: Record<string, Workflow>;
	subWorkflowData: Record<string, IRunExecutionData>;
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
	node: INodeUi,
	context: LogTreeCreationContext,
	runIndex: number,
	runData: ITaskData,
	children: LogEntry[] = [],
): LogEntry {
	return {
		parent: context.parent,
		node,
		id: `${context.workflow.id}:${node.name}:${context.executionId}:${runIndex}`,
		depth: context.depth,
		runIndex,
		runData,
		children,
		consumedTokens: getConsumedTokensV2(runData),
		workflow: context.workflow,
		executionId: context.executionId,
		execution: context.data,
	};
}

export function getTreeNodeDataV2(
	nodeName: string,
	runData: ITaskData,
	runIndex: number | undefined,
	context: LogTreeCreationContext,
): LogEntry[] {
	const node = context.workflow.getNode(nodeName);

	return node ? getTreeNodeDataRecV2(node, runData, context, runIndex) : [];
}

function getChildNodes(
	treeNode: LogEntry,
	node: INodeUi,
	runIndex: number | undefined,
	context: LogTreeCreationContext,
) {
	if (hasSubExecution(treeNode)) {
		const workflowId = treeNode.runData.metadata?.subExecution?.workflowId;
		const executionId = treeNode.runData.metadata?.subExecution?.executionId;
		const workflow = workflowId ? context.workflows[workflowId] : undefined;
		const subWorkflowRunData = executionId ? context.subWorkflowData[executionId] : undefined;

		if (!workflow || !subWorkflowRunData || !executionId) {
			return [];
		}

		return createLogTreeRec({
			...context,
			parent: treeNode,
			depth: context.depth + 1,
			workflow,
			executionId,
			data: subWorkflowRunData,
		});
	}

	// Get the first level of children
	const connectedSubNodes = context.workflow.getParentNodes(node.name, 'ALL_NON_MAIN', 1);
	const isExecutionRoot =
		treeNode.parent === undefined || treeNode.executionId !== treeNode.parent.executionId;

	return connectedSubNodes.flatMap((subNodeName) =>
		(context.data.resultData.runData[subNodeName] ?? []).flatMap((t, index) => {
			// At root depth, filter out node executions that weren't triggered by this node
			// This prevents showing duplicate executions when a sub-node is connected to multiple parents
			// Only filter nodes that have source information with valid previousNode references
			const isMatched =
				isExecutionRoot && t.source.some((source) => source !== null)
					? t.source.some(
							(source) =>
								source?.previousNode === node.name &&
								(runIndex === undefined || source.previousNodeRun === runIndex),
						)
					: runIndex === undefined || index === runIndex;

			if (!isMatched) {
				return [];
			}

			const subNode = context.workflow.getNode(subNodeName);

			return subNode
				? getTreeNodeDataRecV2(
						subNode,
						t,
						{ ...context, depth: context.depth + 1, parent: treeNode },
						index,
					)
				: [];
		}),
	);
}

function getTreeNodeDataRecV2(
	node: INodeUi,
	runData: ITaskData,
	context: LogTreeCreationContext,
	runIndex: number | undefined,
): LogEntry[] {
	const treeNode = createNodeV2(node, context, runIndex ?? 0, runData);
	const children = getChildNodes(treeNode, node, runIndex, context).sort(sortLogEntries);

	treeNode.children = children;

	return [treeNode];
}

export function getTotalConsumedTokens(...usage: LlmTokenUsageData[]): LlmTokenUsageData {
	return usage.reduce(addTokenUsageData, emptyTokenUsageData);
}

export function getSubtreeTotalConsumedTokens(
	treeNode: LogEntry,
	includeSubWorkflow: boolean,
): LlmTokenUsageData {
	const executionId = treeNode.executionId;

	function calculate(currentNode: LogEntry): LlmTokenUsageData {
		if (!includeSubWorkflow && currentNode.executionId !== executionId) {
			return emptyTokenUsageData;
		}

		return getTotalConsumedTokens(
			currentNode.consumedTokens,
			...currentNode.children.map(calculate),
		);
	}

	return calculate(treeNode);
}

function findLogEntryToAutoSelectRec(subTree: LogEntry[], depth: number): LogEntry | undefined {
	for (const entry of subTree) {
		if (entry.runData?.error) {
			return entry;
		}

		const childAutoSelect = findLogEntryToAutoSelectRec(entry.children, depth + 1);

		if (childAutoSelect) {
			return childAutoSelect;
		}

		if (entry.node.type === AGENT_LANGCHAIN_NODE_TYPE) {
			return entry;
		}
	}

	return depth === 0 ? subTree[0] : undefined;
}

export function createLogTree(
	workflow: Workflow,
	response: IExecutionResponse,
	workflows: Record<string, Workflow> = {},
	subWorkflowData: Record<string, IRunExecutionData> = {},
) {
	return createLogTreeRec({
		parent: undefined,
		depth: 0,
		executionId: response.id,
		workflow,
		workflows,
		data: response.data ?? { resultData: { runData: {} } },
		subWorkflowData,
	});
}

function createLogTreeRec(context: LogTreeCreationContext) {
	const runs = Object.entries(context.data.resultData.runData)
		.flatMap(([nodeName, taskData]) =>
			context.workflow.getChildNodes(nodeName, 'ALL_NON_MAIN').length > 0 ||
			context.workflow.getNode(nodeName)?.disabled
				? [] // skip sub nodes and disabled nodes
				: taskData.map((task, runIndex) => ({
						nodeName,
						runData: task,
						runIndex,
						nodeHasMultipleRuns: taskData.length > 1,
					})),
		)
		.sort(sortLogEntries);

	return runs.flatMap(({ nodeName, runIndex, runData, nodeHasMultipleRuns }) =>
		getTreeNodeDataV2(nodeName, runData, nodeHasMultipleRuns ? runIndex : undefined, context),
	);
}

export function findLogEntryRec(
	isMatched: (entry: LogEntry) => boolean,
	entries: LogEntry[],
): LogEntry | undefined {
	for (const entry of entries) {
		if (isMatched(entry)) {
			return entry;
		}

		const child = findLogEntryRec(isMatched, entry.children);

		if (child) {
			return child;
		}
	}

	return undefined;
}

export function findSelectedLogEntry(
	selection: LogEntrySelection,
	entries: LogEntry[],
): LogEntry | undefined {
	switch (selection.type) {
		case 'initial':
			return findLogEntryToAutoSelectRec(entries, 0);
		case 'none':
			return undefined;
		case 'selected': {
			const entry = findLogEntryRec((e) => e.id === selection.id, entries);

			if (entry) {
				return entry;
			}

			return findLogEntryToAutoSelectRec(entries, 0);
		}
	}
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

export function getEntryAtRelativeIndex(
	entries: LogEntry[],
	id: string,
	relativeIndex: number,
): LogEntry | undefined {
	const offset = entries.findIndex((e) => e.id === id);

	return offset === -1 ? undefined : entries[offset + relativeIndex];
}

function sortLogEntries<T extends { runData: ITaskData }>(a: T, b: T) {
	// We rely on execution index only when startTime is different
	// Because it is reset to 0 when execution is waited, and therefore not necessarily unique
	if (a.runData.startTime === b.runData.startTime) {
		return a.runData.executionIndex - b.runData.executionIndex;
	}

	return a.runData.startTime - b.runData.startTime;
}

export function mergeStartData(
	startData: { [nodeName: string]: ITaskStartedData[] },
	response: IExecutionResponse,
): IExecutionResponse {
	if (!response.data) {
		return response;
	}

	const nodeNames = [
		...new Set(
			Object.keys(startData).concat(Object.keys(response.data.resultData.runData)),
		).values(),
	];
	const runData = Object.fromEntries(
		nodeNames.map<[string, ITaskData[]]>((nodeName) => {
			const tasks = response.data?.resultData.runData[nodeName] ?? [];
			const mergedTasks = tasks.concat(
				(startData[nodeName] ?? [])
					.filter((task) =>
						// To remove duplicate runs, we check start time in addition to execution index
						// because nodes such as Wait and Form emits multiple websocket events with
						// different execution index for a single run
						tasks.every(
							(t) => t.startTime < task.startTime && t.executionIndex !== task.executionIndex,
						),
					)
					.map<ITaskData>((task) => ({
						...task,
						executionTime: 0,
						executionStatus: 'running',
					})),
			);

			return [nodeName, mergedTasks];
		}),
	);

	return {
		...response,
		data: {
			...response.data,
			resultData: {
				...response.data.resultData,
				runData,
			},
		},
	};
}

export function hasSubExecution(entry: LogEntry): boolean {
	return !!entry.runData.metadata?.subExecution;
}

export function getDefaultCollapsedEntries(entries: LogEntry[]): Record<string, boolean> {
	const ret: Record<string, boolean> = {};

	function collect(children: LogEntry[]) {
		for (const entry of children) {
			if (hasSubExecution(entry) && entry.children.length === 0) {
				ret[entry.id] = true;
			}

			collect(entry.children);
		}
	}

	collect(entries);

	return ret;
}

export function getDepth(entry: LogEntry): number {
	let depth = 0;
	let currentEntry = entry;

	while (currentEntry.parent !== undefined) {
		currentEntry = currentEntry.parent;
		depth++;
	}

	return depth;
}
