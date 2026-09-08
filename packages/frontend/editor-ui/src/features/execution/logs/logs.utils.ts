import type { INodeUi, LlmTokenUsageData, IWorkflowDb } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { addTokenUsageData, emptyTokenUsageData, isChatNode } from '@/app/utils/aiUtils';
import {
	NodeConnectionTypes,
	type IDataObject,
	AGENT_LANGCHAIN_NODE_TYPE,
	type IRunExecutionData,
	type ITaskData,
	type ITaskStartedData,
	type Workflow,
	type INode,
	type ISourceData,
	parseErrorMetadata,
	type RelatedExecution,
	type INodeExecutionData,
	type IWorkflowGroup,
	createEmptyRunExecutionData,
	createRunExecutionData,
} from 'n8n-workflow';
import {
	type GroupBoundaryRunData,
	type LogEntry,
	type LogEntrySelection,
	type LogTreeCreationContext,
	type LogTreeFilter,
	type NodeLogEntry,
	type GroupLogEntry,
	isNodeLog,
	isGroupLog,
} from './logs.types';
import { CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';
import type {
	GroupExecutionStatus,
	NodeExecutionSnapshot,
} from '@/features/workflows/canvas/canvas.types';
import { aggregateGroupExecution } from '@/features/workflows/canvas/composables/useCanvasMapping.groups';
import { type ChatMessage } from '@n8n/chat/types';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import { v4 as uuid } from 'uuid';
import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';

export function getConsumedTokens(task: Array<INodeExecutionData | null>): LlmTokenUsageData {
	const tokenUsage = task.reduce<LlmTokenUsageData>((acc, curr) => {
		const tokenUsageData = curr?.json?.tokenUsage ?? curr?.json?.tokenUsageEstimate;

		if (!tokenUsageData) return acc;

		return addTokenUsageData(acc, {
			...(tokenUsageData as Omit<LlmTokenUsageData, 'isEstimate'>),
			isEstimate: !!curr?.json.tokenUsageEstimate,
		});
	}, emptyTokenUsageData);

	return tokenUsage;
}

function getConsumedTokensFromTaskData(runData: ITaskData) {
	return getConsumedTokens(
		Object.values(runData.data ?? {})
			.flat()
			.flat(),
	);
}

function createNode(
	node: INodeUi,
	context: LogTreeCreationContext,
	runIndex: number,
	runData: ITaskData | undefined,
	children: LogEntry[] = [],
): NodeLogEntry {
	return {
		type: 'node',
		parent: context.parent,
		node,
		// The ID consists of workflow ID, node ID and run index (including ancestor's), which
		// makes it possible to identify the same log across different executions
		id: `${context.workflow.id}:${node.id}:${[...context.ancestorRunIndexes, runIndex].join(':')}`,
		runIndex,
		runData,
		children,
		consumedTokens: runData ? getConsumedTokensFromTaskData(runData) : emptyTokenUsageData,
		workflow: context.workflow,
		executionId: context.executionId,
		execution: context.data,
		isSubExecution: context.isSubExecution,
	};
}

function getChildNodes(
	treeNode: LogEntry,
	node: INodeUi,
	runIndex: number | undefined,
	context: LogTreeCreationContext,
) {
	const subExecutionLocator = findSubExecutionLocator(treeNode);

	if (subExecutionLocator !== undefined) {
		const workflow = context.workflows[subExecutionLocator.workflowId];
		const subWorkflowRunData = context.subWorkflowData[subExecutionLocator.executionId];

		if (!workflow || !subWorkflowRunData) {
			return [];
		}

		return createLogTreeRec(undefined, {
			...context,
			parent: treeNode,
			ancestorRunIndexes: [...context.ancestorRunIndexes, runIndex ?? 0],
			workflow,
			executionId: subExecutionLocator.executionId,
			data: subWorkflowRunData,
			isSubExecution: true,
			nodeGroups: context.subWorkflowNodeGroups[subExecutionLocator.workflowId] ?? [],
		});
	}

	// Get the first level of children
	const connectedSubNodes = context.workflow.getParentNodes(node.name, 'ALL_NON_MAIN', 1);

	function isMatchedSource(source: ISourceData | null): boolean {
		return (
			(source?.previousNode === node.name ||
				(isPlaceholderLog(treeNode) && source?.previousNode === TOOL_EXECUTOR_NODE_NAME)) &&
			(runIndex === undefined || (source.previousNodeRun ?? 0) === runIndex)
		);
	}

	return connectedSubNodes.flatMap((subNodeName) =>
		(context.data.resultData.runData[subNodeName] ?? []).flatMap((t, index) => {
			// Filter out node executions that weren't triggered by this node
			// This prevents showing duplicate executions when a sub-node is connected to multiple parents
			// Only filter nodes that have source information with valid previousNode references
			const isMatched = t.source.some((source) => source !== null)
				? t.source.some(isMatchedSource)
				: runIndex === undefined || index === runIndex;

			if (!isMatched) {
				return [];
			}

			const subNode = context.workflow.getNode(subNodeName);

			return subNode
				? getTreeNodeData(subNode, t, index, {
						...context,
						ancestorRunIndexes: [...context.ancestorRunIndexes, runIndex ?? 0],
						parent: treeNode,
					})
				: [];
		}),
	);
}

export function getTreeNodeData(
	node: INodeUi,
	runData: ITaskData | undefined,
	runIndex: number | undefined,
	context: LogTreeCreationContext,
): LogEntry[] {
	const treeNode = createNode(node, context, runIndex ?? 0, runData);
	const children = getChildNodes(treeNode, node, runIndex, context).sort(sortLogEntries);

	if ((runData === undefined || node.disabled) && children.length === 0) {
		return [];
	}

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

/**
 * Aggregate timing for a group segment: summed execution time of its member
 * node runs, and the start time of the first one. Pass `now` to count elapsed
 * time for still-running members so the total ticks up during live executions.
 */
export function getGroupTiming(
	group: GroupLogEntry,
	now?: number,
): { startTime: number; executionTime: number } | undefined {
	let startTime: number | undefined;
	let executionTime = 0;

	for (const child of group.children) {
		if (!isNodeLog(child) || child.runData === undefined) {
			continue;
		}

		const memberRunData = child.runData;
		const isActive =
			memberRunData.executionStatus === 'running' || memberRunData.executionStatus === 'waiting';

		executionTime +=
			isActive && now !== undefined
				? Math.max(0, now - memberRunData.startTime)
				: memberRunData.executionTime;
		startTime =
			startTime === undefined
				? memberRunData.startTime
				: Math.min(startTime, memberRunData.startTime);
	}

	return startTime === undefined ? undefined : { startTime, executionTime };
}

/** Build the per-member snapshot the group rollup consumes, from a member's run data. */
function snapshotFromRunData(runData: ITaskData | undefined): NodeExecutionSnapshot {
	const status = runData?.executionStatus;
	return {
		running: status === 'running',
		waitingForNext: false,
		waiting: undefined,
		// Crashed nodes carry no error object but must not read as success (mirrors canvas)
		hasExecutionError: status === 'error' || status === 'crashed' || Boolean(runData?.error),
		hasValidationError: false,
		status,
		dirty: false,
		iterations: 0,
	};
}

/**
 * Aggregate execution status for a group segment. Groups have no run data of
 * their own, so reuse the canvas group rollup (`aggregateGroupExecution`) over
 * the members' run data, keeping the logs badge consistent with the canvas one.
 */
export function getGroupExecutionStatus(group: GroupLogEntry): GroupExecutionStatus | undefined {
	const snapshots = new Map<string, NodeExecutionSnapshot>();

	function collect(entries: LogEntry[]) {
		for (const entry of entries) {
			if (isNodeLog(entry)) {
				snapshots.set(entry.id, snapshotFromRunData(entry.runData));
			}
			collect(entry.children);
		}
	}
	collect(group.children);

	return aggregateGroupExecution(
		[...snapshots.keys()],
		(id) => snapshots.get(id) ?? snapshotFromRunData(undefined),
	);
}

function findLogEntryToAutoSelect(subTree: LogEntry[]): LogEntry | undefined {
	const entryWithError = findLogEntryRec((e) => isNodeLog(e) && !!e.runData?.error, subTree);

	if (entryWithError) {
		return entryWithError;
	}

	const entryForAiAgent = findLogEntryRec(
		(entry) =>
			(isNodeLog(entry) && entry.node.type === AGENT_LANGCHAIN_NODE_TYPE) ||
			(entry.parent !== undefined &&
				isNodeLog(entry.parent) &&
				entry.parent.node.type === AGENT_LANGCHAIN_NODE_TYPE &&
				isPlaceholderLog(entry.parent)),
		subTree,
	);

	if (entryForAiAgent) {
		return entryForAiAgent;
	}

	return subTree[subTree.length - 1];
}

function createLogTreeRec(
	filter: LogTreeFilter | undefined,
	context: LogTreeCreationContext,
): LogEntry[] {
	const runData = context.data.resultData.runData;

	const intermediateResult = Object.entries(runData).flatMap<{
		node: INode;
		task?: ITaskData;
		runIndex?: number;
		nodeHasMultipleRuns: boolean;
	}>(([nodeName, taskData]) => {
		const node = context.workflow.getNode(nodeName);

		if (node === null || (filter && filter.rootNodeId !== node.id)) {
			return [];
		}

		const childNodes = context.workflow.getChildNodes(nodeName, 'ALL_NON_MAIN');

		if (childNodes.length === 0) {
			// The node is root node
			const taskDataList = taskData.map((task, runIndex) => ({
				node,
				task,
				runIndex,
				nodeHasMultipleRuns: taskData.length > 1,
			}));

			return filter
				? taskDataList.filter((item) => item.runIndex === filter.rootNodeRunIndex)
				: taskDataList;
		}

		// The node is sub node
		if (childNodes.some((child) => (runData[child] ?? []).length > 0)) {
			return [];
		}

		// The sub node has data but its children don't: this can happen for partial execution of tools.
		// In this case, we insert first child as placeholder so that the node is included in the tree.
		const firstChild = context.workflow.getNode(childNodes[0]);

		if (firstChild === null) {
			return [];
		}

		return [{ node: firstChild, nodeHasMultipleRuns: false }];
	});

	// Deduplicate placeholder entries (entries without task data)
	// This prevents duplicate parent nodes when multiple child nodes try to insert the same placeholder
	const seenPlaceholders = new Set<string>();
	const deduplicated = intermediateResult.filter((entry) => {
		// Keep all entries with actual task data
		if (entry.task !== undefined) {
			return true;
		}

		// For placeholders, keep only the first occurrence of each node
		if (seenPlaceholders.has(entry.node.id)) {
			return false;
		}

		seenPlaceholders.add(entry.node.id);
		return true;
	});

	const result = deduplicated
		.flatMap(({ node, runIndex, task, nodeHasMultipleRuns }) =>
			getTreeNodeData(node, task, nodeHasMultipleRuns ? runIndex : undefined, context),
		)
		.sort(sortLogEntries);

	// Group view filters to a single root node's subtree, so skip group folding there
	return filter === undefined ? groupContiguousEntries(result, context) : result;
}

function isMemberNodeName(
	name: string,
	memberIds: Set<string>,
	workflow: LogTreeCreationContext['workflow'],
): boolean {
	const node = workflow.getNode(name);
	return node !== null && memberIds.has(node.id);
}

function computeGroupBoundaries(
	group: GroupLogEntry,
	context: LogTreeCreationContext,
): GroupLogEntry['boundaries'] {
	const memberIds = new Set(group.group.nodeIds);
	const executedChildren = group.children.filter(
		(c): c is NodeLogEntry => isNodeLog(c) && c.runData !== undefined,
	);

	const inputs: GroupBoundaryRunData[] = [];
	const outputs: GroupBoundaryRunData[] = [];
	// One entry per distinct boundary crossing (edge), deduped so loops don't multiply them
	const seenInputEdges = new Set<string>();
	// Output edges map to their slot in `outputs` so a later run can replace it (see upsertOutput)
	const outputEdgeIndex = new Map<string, number>();
	// Disambiguate the selector label when one member node has several crossings on the same side
	const inputLabelCount = new Map<string, number>();
	const outputLabelCount = new Map<string, number>();

	function makeLabel(counts: Map<string, number>, nodeId: string, name: string): string {
		const seen = counts.get(nodeId) ?? 0;
		counts.set(nodeId, seen + 1);
		return seen === 0 ? name : `${name} (${seen + 1})`;
	}

	function upsertOutput(edge: string, entry: NodeLogEntry, id: string, overrideOutputs?: number[]) {
		const existing = outputEdgeIndex.get(edge);
		if (existing !== undefined) {
			// Children iterate in run order, so a repeated edge means a later run supersedes an
			// earlier one (a loop's group-leaving output only carries data on its final run).
			outputs[existing] = { ...outputs[existing], id, entry };
			return;
		}
		outputEdgeIndex.set(edge, outputs.length);
		outputs.push({
			id,
			label: makeLabel(outputLabelCount, entry.node.id, entry.node.name),
			entry,
			overrideOutputs,
		});
	}

	for (const child of executedChildren) {
		const sources = child.runData?.source ?? [];

		// Input crossings: each incoming connection from a non-member is its own input
		if (sources.length === 0) {
			// Entry/trigger member: data originates inside the group here
			const edge = `${child.node.id}|origin`;
			if (!seenInputEdges.has(edge)) {
				seenInputEdges.add(edge);
				inputs.push({
					id: `${child.id}:in`,
					label: makeLabel(inputLabelCount, child.node.id, child.node.name),
					entry: child,
				});
			}
		}

		sources.forEach((source, index) => {
			if (!source || isMemberNodeName(source.previousNode, memberIds, context.workflow)) {
				return;
			}

			const edge = `${child.node.id}|${source.previousNode}|${source.previousNodeOutput ?? 0}`;
			if (seenInputEdges.has(edge)) {
				return;
			}

			seenInputEdges.add(edge);
			inputs.push({
				id: `${child.id}:in:${index}`,
				label: makeLabel(inputLabelCount, child.node.id, child.node.name),
				entry: child,
				sourceIndex: index,
			});
		});

		// Output crossings: each output branch leaving the group, plus terminal members
		const mainConnections = context.workflow.connectionsBySourceNode[child.node.name]?.main ?? [];
		const isTerminal = mainConnections.every((targets) => (targets ?? []).length === 0);

		if (isTerminal) {
			upsertOutput(`${child.node.id}|out`, child, `${child.id}:out`);
		}

		mainConnections.forEach((targets, outputIndex) => {
			const leavesGroup = (targets ?? []).some(
				(t) => t && !isMemberNodeName(t.node, memberIds, context.workflow),
			);
			if (!leavesGroup) {
				return;
			}

			// Only scope to a branch when the node has more than one output
			upsertOutput(
				`${child.node.id}|out|${outputIndex}`,
				child,
				`${child.id}:out:${outputIndex}`,
				mainConnections.length > 1 ? [outputIndex] : undefined,
			);
		});
	}

	// Fallbacks keep a selectable IO pane even when no crossing is detected
	if (inputs.length === 0 && executedChildren.length > 0) {
		const first = executedChildren[0];
		inputs.push({ id: first.id, label: first.node.name, entry: first });
	}

	if (outputs.length === 0 && executedChildren.length > 0) {
		const last = executedChildren[executedChildren.length - 1];
		outputs.push({ id: last.id, label: last.node.name, entry: last });
	}

	return { inputs, outputs };
}

function finalizeGroupEntry(group: GroupLogEntry, context: LogTreeCreationContext): void {
	group.hasError = getGroupExecutionStatus(group) === 'error';
	group.boundaries = computeGroupBoundaries(group, context);
}

/**
 * Groups consecutive top-level entries from the same canvas group into execution
 * segments. The same group may produce multiple segments if its entries are
 * separated by other groups or ungrouped entries.
 */
function groupContiguousEntries(entries: LogEntry[], context: LogTreeCreationContext): LogEntry[] {
	if (context.nodeGroups.length === 0) {
		return entries;
	}

	const nodeIdToGroup = new Map<string, IWorkflowGroup>();
	for (const group of context.nodeGroups) {
		for (const nodeId of group.nodeIds) {
			nodeIdToGroup.set(nodeId, group);
		}
	}

	const result: LogEntry[] = [];
	const segmentCountByGroup = new Map<string, number>();
	let current: GroupLogEntry | undefined;

	for (const entry of entries) {
		const group = isNodeLog(entry) ? nodeIdToGroup.get(entry.node.id) : undefined;

		if (group === undefined) {
			current = undefined;
			result.push(entry);
			continue;
		}

		if (current === undefined || current.group.id !== group.id) {
			const segmentIndex = segmentCountByGroup.get(group.id) ?? 0;
			segmentCountByGroup.set(group.id, segmentIndex + 1);
			// Ancestor run indexes (like node ids) keep repeated sub-executions of the same group distinct
			const runPath = [...context.ancestorRunIndexes, segmentIndex].join(':');
			current = {
				type: 'group',
				group,
				segmentIndex,
				hasError: false,
				boundaries: { inputs: [], outputs: [] },
				parent: context.parent,
				id: `${context.workflow.id}:group:${group.id}:${runPath}`,
				children: [],
				runIndex: 0,
				consumedTokens: emptyTokenUsageData,
				workflow: context.workflow,
				executionId: context.executionId,
				execution: context.data,
				isSubExecution: context.isSubExecution,
			};
			result.push(current);
		}

		entry.parent = current;
		current.children.push(entry);
	}

	for (const entry of result) {
		if (isGroupLog(entry)) {
			finalizeGroupEntry(entry, context);
		}
	}

	return result;
}

export function createLogTree(
	workflow: Workflow,
	response: IExecutionResponse,
	workflows: Record<string, Workflow> = {},
	subWorkflowData: Record<string, IRunExecutionData> = {},
	filter?: LogTreeFilter,
	nodeGroups: IWorkflowGroup[] = [],
	subWorkflowNodeGroups: Record<string, IWorkflowGroup[]> = {},
): LogEntry[] {
	return createLogTreeRec(filter, {
		parent: undefined,
		ancestorRunIndexes: [],
		executionId: response.id,
		workflow,
		workflows,
		data: response.data ?? createEmptyRunExecutionData(),
		subWorkflowData,
		isSubExecution: false,
		nodeGroups,
		subWorkflowNodeGroups,
	});
}

export function findLogEntryById(id: string, entries: LogEntry[]) {
	return findLogEntryRec((entry) => entry.id === id, entries);
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
	isExecuting: boolean,
): LogEntry | undefined {
	switch (selection.type) {
		case 'initial':
			return isExecuting ? undefined : findLogEntryToAutoSelect(entries);
		case 'none':
			return undefined;
		case 'selected': {
			const found = findLogEntryRec((e) => e.id === selection.entry.id, entries);
			const target = selection.entry;

			if (found === undefined && !isExecuting && isNodeLog(target)) {
				for (let runIndex = target.runIndex - 1; runIndex >= 0; runIndex--) {
					const fallback = findLogEntryRec(
						(e) =>
							isNodeLog(e) &&
							e.workflow.id === target.workflow.id &&
							e.node.id === target.node.id &&
							e.runIndex === runIndex,
						entries,
					);

					if (fallback !== undefined) {
						return fallback;
					}
				}
			}

			return found;
		}
	}
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

function sortLogEntries(a: LogEntry, b: LogEntry): number {
	// Group entries (and placeholder nodes) carry no run data; sort by their first child instead
	const aRunData = isNodeLog(a) ? a.runData : undefined;
	const bRunData = isNodeLog(b) ? b.runData : undefined;

	if (aRunData === undefined) {
		return a.children.length > 0 ? sortLogEntries(a.children[0], b) : 0;
	}

	if (bRunData === undefined) {
		return b.children.length > 0 ? sortLogEntries(a, b.children[0]) : 0;
	}

	// We rely on execution index only when startTime is different
	// Because it is reset to 0 when execution is waited, and therefore not necessarily unique
	if (aRunData.startTime === bRunData.startTime) {
		return aRunData.executionIndex - bRunData.executionIndex;
	}

	return aRunData.startTime - bRunData.startTime;
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
					.filter((task) => {
						// To remove duplicate runs, we check if there's an exact match in the final tasks
						// An exact match means the task has the same executionIndex AND startTime
						// This handles AI agent cases where the same execution appears in both
						// startData (from nodeExecuteBefore events) and final results
						const hasExactMatch = tasks.some(
							(t) => t.executionIndex === task.executionIndex && t.startTime === task.startTime,
						);

						if (hasExactMatch) {
							return false; // Filter out duplicates
						}

						// Keep tasks from startData that started after all existing tasks
						// This handles cases like Wait and Form nodes that emit multiple websocket events
						return tasks.every((t) => t.startTime < task.startTime);
					})
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
	return findSubExecutionLocator(entry) !== undefined;
}

export function findSubExecutionLocator(entry: LogEntry): RelatedExecution | undefined {
	const runData = isNodeLog(entry) ? entry.runData : undefined;
	const metadata = runData?.metadata?.subExecution;

	if (metadata) {
		return { workflowId: metadata.workflowId, executionId: metadata.executionId };
	}

	return parseErrorMetadata(runData?.error)?.subExecution;
}

export function getDefaultCollapsedEntries(entries: LogEntry[]): Record<string, boolean> {
	const ret: Record<string, boolean> = {};

	function collect(children: LogEntry[]) {
		for (const entry of children) {
			if (hasSubExecution(entry) && entry.children.length === 0) {
				ret[entry.id] = true;
			}

			// Groups start collapsed unless a descendant execution errored
			if (isGroupLog(entry) && !entry.hasError) {
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

export function getInputKey(node: INodeUi): string {
	if (node.type === MANUAL_CHAT_TRIGGER_NODE_TYPE && node.typeVersion < 1.1) {
		return 'input';
	}
	if (node.type === CHAT_TRIGGER_NODE_TYPE) {
		return 'chatInput';
	}

	return 'chatInput';
}

function extractChatInput(
	workflow: IWorkflowDb,
	resultData: IRunExecutionData['resultData'],
): ChatMessage | undefined {
	const chatTrigger = workflow.nodes.find(isChatNode);

	if (chatTrigger === undefined) {
		return undefined;
	}

	const inputKey = getInputKey(chatTrigger);
	const runData = (resultData.runData[chatTrigger.name] ?? [])[0];
	const message = runData?.data?.[NodeConnectionTypes.Main]?.[0]?.[0]?.json?.[inputKey];

	if (runData === undefined || typeof message !== 'string') {
		return undefined;
	}

	return {
		text: message,
		sender: 'user',
		id: uuid(),
	};
}

export function extractBotResponse(
	resultData: IRunExecutionData['resultData'],
	executionId: string,
	emptyText?: string,
): ChatMessage | undefined {
	const lastNodeExecuted = resultData.lastNodeExecuted;

	if (!lastNodeExecuted) return undefined;

	const nodeResponseDataArray = get(resultData.runData, lastNodeExecuted) ?? [];

	const nodeResponseData = nodeResponseDataArray[nodeResponseDataArray.length - 1];

	let responseMessage: string;

	if (get(nodeResponseData, 'error')) {
		responseMessage = '[ERROR: ' + get(nodeResponseData, 'error.message') + ']';
	} else {
		// Check all output branches for response data, not just the first one
		const mainOutputs = get(nodeResponseData, 'data.main');
		let text: string | undefined;

		if (mainOutputs && Array.isArray(mainOutputs)) {
			for (const branch of mainOutputs) {
				if (branch?.[0]?.json) {
					const responseData = branch[0].json;
					text = extractResponseText(responseData);
					if (text) {
						break; // Found a valid response, stop searching
					}
				}
			}
		}

		// Fall back to emptyText if no valid response found
		text = text ?? emptyText;

		if (!text) {
			return undefined;
		}

		responseMessage = text;
	}

	return {
		text: responseMessage,
		sender: 'bot',
		id: executionId ?? uuid(),
	};
}

/** Extracts response message from workflow output */
function extractResponseText(responseData?: IDataObject): string | undefined {
	if (!responseData || isEmpty(responseData)) {
		return undefined;
	}

	// Paths where the response message might be located
	const paths = ['output', 'text', 'response.text', 'message'];
	const matchedPath = paths.find((path) => get(responseData, path));

	if (!matchedPath) return JSON.stringify(responseData, null, 2);

	const matchedOutput = get(responseData, matchedPath);
	if (typeof matchedOutput === 'object') {
		return '```json\n' + JSON.stringify(matchedOutput, null, 2) + '\n```';
	}

	return matchedOutput?.toString() ?? '';
}

export function restoreChatHistory(
	workflowExecutionData: IExecutionResponse | null,
	emptyText?: string,
	redactedText?: string,
): ChatMessage[] {
	if (!workflowExecutionData?.data) {
		return [];
	}

	const isRedacted = workflowExecutionData.data.redactionInfo?.isRedacted === true;

	const userMessage = extractChatInput(
		workflowExecutionData.workflowData,
		workflowExecutionData.data.resultData,
	);

	if (isRedacted) {
		const messages: ChatMessage[] = userMessage ? [userMessage] : [];
		if (redactedText) {
			messages.push({
				text: redactedText,
				sender: 'bot',
				id: workflowExecutionData.id ?? uuid(),
			});
		}
		return messages;
	}

	const botMessage = extractBotResponse(
		workflowExecutionData.data.resultData,
		workflowExecutionData.id,
		emptyText,
	);

	return [...(userMessage ? [userMessage] : []), ...(botMessage ? [botMessage] : [])];
}

export async function processFiles(data: File[] | undefined) {
	if (!data || data.length === 0) return [];

	const filePromises = data.map(async (file) => {
		// We do not need to await here as it will be awaited on the return by Promise.all
		// eslint-disable-next-line @typescript-eslint/return-await
		return new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = () =>
				resolve({
					name: file.name,
					type: file.type,
					data: reader.result as string,
				});

			reader.onerror = () =>
				reject(new Error(`Error reading file: ${reader.error?.message ?? 'Unknown error'}`));

			reader.readAsDataURL(file);
		});
	});

	return await Promise.all(filePromises);
}

export function isSubNodeLog(logEntry: LogEntry): boolean {
	// A group parent is a visual wrapper, not an execution parent
	return (
		logEntry.parent !== undefined &&
		isNodeLog(logEntry.parent) &&
		logEntry.parent.executionId === logEntry.executionId
	);
}

export function isPlaceholderLog(treeNode: LogEntry): boolean {
	return isNodeLog(treeNode) && treeNode.runData === undefined;
}

/**
 * Creates a copy of execution data just deep enough to keeps logs immutable and not reactive.
 * We deliberately avoid full deep copy here for performance reason.
 *
 * TODO: use shallowRef() for execution data in workflows store to make this unnecessary.
 */
export function copyExecutionData(executionData: IExecutionResponse): IExecutionResponse {
	return {
		...executionData,
		data: createRunExecutionData({
			...executionData.data,
			resultData: {
				...executionData.data?.resultData,
				runData: Object.fromEntries(
					Object.entries(executionData.data?.resultData.runData ?? {}).map(([k, v]) => [k, [...v]]),
				),
			},
		}),
	};
}
