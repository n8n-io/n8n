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
import type {
	LogEntry,
	LogEntrySelection,
	LogGroupEntry,
	LogTreeCreationContext,
	LogTreeEntry,
	LogTreeFilter,
} from './logs.types';
import { isLogGroupEntry } from './logs.types';
import type { NodeExecutionSnapshot } from '@/features/workflows/canvas/canvas.types';
import { aggregateGroupExecutionFromSnapshots } from '@/features/workflows/canvas/groupExecutionStatus';
import { CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';
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
): LogEntry {
	return {
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
	treeNode: LogTreeEntry,
	includeSubWorkflow: boolean,
): LlmTokenUsageData {
	const executionId = treeNode.executionId;

	function calculate(currentNode: LogTreeEntry): LlmTokenUsageData {
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

function findLogEntryToAutoSelect(subTree: LogTreeEntry[]): LogTreeEntry | undefined {
	const entryWithError = findLogEntryRec((e) => !isLogGroupEntry(e) && !!e.runData?.error, subTree);

	if (entryWithError) {
		return entryWithError;
	}

	const entryForAiAgent = findLogEntryRec(
		(entry) =>
			!isLogGroupEntry(entry) &&
			(entry.node.type === AGENT_LANGCHAIN_NODE_TYPE ||
				(entry.parent !== undefined &&
					!isLogGroupEntry(entry.parent) &&
					entry.parent.node.type === AGENT_LANGCHAIN_NODE_TYPE &&
					isPlaceholderLog(entry.parent))),
		subTree,
	);

	if (entryForAiAgent) {
		return entryForAiAgent;
	}

	// Prefer a concrete node entry as the default selection; fall back to the
	// last entry (which may be a group) only if nothing else is available.
	return (
		[...subTree].reverse().find((entry) => !isLogGroupEntry(entry)) ?? subTree[subTree.length - 1]
	);
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

	return result;
}

export function createLogTree(
	workflow: Workflow,
	response: IExecutionResponse,
	workflows: Record<string, Workflow> = {},
	subWorkflowData: Record<string, IRunExecutionData> = {},
	filter?: LogTreeFilter,
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
	});
}

/** Roll a single member run's task data into a snapshot for status aggregation. */
function snapshotFromLogEntry(entry: LogEntry): NodeExecutionSnapshot {
	const status = entry.runData?.executionStatus;

	return {
		running: status === 'running',
		waitingForNext: false,
		waiting: undefined,
		// In the logs view an error is signalled by the error object or the status;
		// `crashed` folds into error too.
		hasExecutionError: !!entry.runData?.error || status === 'error' || status === 'crashed',
		hasValidationError: false,
		status,
		dirty: false,
		iterations: 1,
	};
}

/**
 * Wrap the top-level root entries that belong to a node group inside a
 * synthetic {@link LogGroupEntry}, mirroring how AI sub-nodes nest under their
 * parent. Only groups with at least one executed member are emitted, and a
 * group is placed at the position of its earliest member so the final list
 * stays in chronological order. Ungrouped roots are left untouched.
 *
 * Operates only on the top-level entries of a single execution; sub-execution
 * subtrees keep their own structure. Context (workflow id, execution, etc.) is
 * derived from the wrapped member entries, which all share it.
 */
export function wrapLogEntriesInGroups(
	roots: LogEntry[],
	nodeGroups: IWorkflowGroup[],
): LogTreeEntry[] {
	if (nodeGroups.length === 0) {
		return roots;
	}

	const groupByNodeId = new Map<string, IWorkflowGroup>();
	for (const group of nodeGroups) {
		for (const nodeId of group.nodeIds) {
			groupByNodeId.set(nodeId, group);
		}
	}

	const result: LogTreeEntry[] = [];
	const groupEntryById = new Map<string, LogGroupEntry>();

	for (const root of roots) {
		const group = groupByNodeId.get(root.node.id);

		if (!group) {
			result.push(root);
			continue;
		}

		const existing = groupEntryById.get(group.id);

		if (existing) {
			existing.children.push(root);
			root.parent = existing;
			continue;
		}

		const groupEntry: LogGroupEntry = {
			parent: root.parent,
			group,
			id: `group:${root.workflow.id}:${group.id}`,
			children: [root],
			consumedTokens: emptyTokenUsageData,
			executionStatus: undefined,
			executedMemberCount: 0,
			// Reassigned below once children are finalized.
			inputLogEntry: root,
			outputLogEntry: root,
			workflow: root.workflow,
			executionId: root.executionId,
			execution: root.execution,
			isSubExecution: root.isSubExecution,
		};
		root.parent = groupEntry;
		groupEntryById.set(group.id, groupEntry);
		result.push(groupEntry);
	}

	for (const groupEntry of groupEntryById.values()) {
		groupEntry.children.sort(sortLogEntries);
		groupEntry.inputLogEntry = groupEntry.children[0];
		groupEntry.outputLogEntry = groupEntry.children[groupEntry.children.length - 1];
		groupEntry.executedMemberCount = new Set(
			groupEntry.children.map((child) => child.node.id),
		).size;
		groupEntry.consumedTokens = getTotalConsumedTokens(
			...groupEntry.children.map((child) => getSubtreeTotalConsumedTokens(child, false)),
		);
		groupEntry.executionStatus = aggregateGroupExecutionFromSnapshots(
			groupEntry.children.map(snapshotFromLogEntry),
		);
	}

	return result.sort(sortLogEntries);
}

/**
 * Root member entries of a group — members not targeted by any main connection
 * from another member. These are the entry points where data first enters the
 * group's internal flow. Deduplicated by node ID (first run only); RunData's
 * own run selector handles additional runs. Falls back to
 * {@link LogGroupEntry.inputLogEntry} when no root is found.
 */
export function getGroupInputEntries(group: LogGroupEntry): LogEntry[] {
	const members = dedupeMembersByNodeId(group.children);
	const memberNames = new Set(members.map((m) => m.node.name));

	// Collect every node name that is targeted by a main connection from a member.
	const internalTargets = new Set<string>();
	for (const member of members) {
		const outputs = group.workflow.connectionsBySourceNode[member.node.name]?.main ?? [];
		for (const connections of outputs) {
			for (const connection of connections ?? []) {
				if (memberNames.has(connection.node)) {
					internalTargets.add(connection.node);
				}
			}
		}
	}

	const roots = members.filter((m) => !internalTargets.has(m.node.name));
	return roots.length > 0 ? roots : [group.inputLogEntry];
}

/**
 * Leaf member entries of a group — members with no outgoing main connection to
 * another member. These are the last nodes in each internal branch, regardless
 * of whether they pass data externally. Deduplicated by node ID (first run
 * only); RunData's own run selector handles additional runs. Falls back to
 * {@link LogGroupEntry.outputLogEntry} when no leaf is found.
 */
export function getGroupOutputEntries(group: LogGroupEntry): LogEntry[] {
	const members = dedupeMembersByNodeId(group.children);
	const memberNames = new Set(members.map((m) => m.node.name));

	const leaves = members.filter((member) => {
		const outputs = group.workflow.connectionsBySourceNode[member.node.name]?.main ?? [];
		// A leaf has no main output targeting another member.
		return !outputs.some((connections) =>
			(connections ?? []).some((connection) => memberNames.has(connection.node)),
		);
	});

	return leaves.length > 0 ? leaves : [group.outputLogEntry];
}

function dedupeMembersByNodeId(children: LogEntry[]): LogEntry[] {
	const seen = new Set<string>();
	const result: LogEntry[] = [];

	for (const child of children) {
		if (seen.has(child.node.id)) continue;
		seen.add(child.node.id);
		result.push(child);
	}

	return result;
}

export function findLogEntryById(id: string, entries: LogTreeEntry[]) {
	return findLogEntryRec((entry) => entry.id === id, entries);
}

export function findLogEntryRec(
	isMatched: (entry: LogTreeEntry) => boolean,
	entries: LogTreeEntry[],
): LogTreeEntry | undefined {
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
	entries: LogTreeEntry[],
	isExecuting: boolean,
): LogTreeEntry | undefined {
	switch (selection.type) {
		case 'initial':
			return isExecuting ? undefined : findLogEntryToAutoSelect(entries);
		case 'none':
			return undefined;
		case 'selected': {
			const selectedEntry = selection.entry;
			const found = findLogEntryRec((e) => e.id === selectedEntry.id, entries);

			// Run-index fallback only applies to node entries; groups have no run index.
			if (found === undefined && !isExecuting && !isLogGroupEntry(selectedEntry)) {
				for (let runIndex = selectedEntry.runIndex - 1; runIndex >= 0; runIndex--) {
					const fallback = findLogEntryRec(
						(e) =>
							!isLogGroupEntry(e) &&
							e.workflow.id === selectedEntry.workflow.id &&
							e.node.id === selectedEntry.node.id &&
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

export function flattenLogEntries<T extends LogTreeEntry = LogTreeEntry>(
	entries: T[],
	collapsedEntryIds: Record<string, boolean>,
	ret: T[] = [],
): T[] {
	for (const entry of entries) {
		ret.push(entry);

		if (!collapsedEntryIds[entry.id]) {
			// children are always LogEntry[]; for callers that pass LogEntry[] (T=LogEntry)
			// or LogTreeEntry[] (T=LogTreeEntry) the element type is compatible.
			flattenLogEntries(entry.children as T[], collapsedEntryIds, ret);
		}
	}

	return ret;
}

export function getEntryAtRelativeIndex(
	entries: LogTreeEntry[],
	id: string,
	relativeIndex: number,
): LogTreeEntry | undefined {
	const offset = entries.findIndex((e) => e.id === id);

	return offset === -1 ? undefined : entries[offset + relativeIndex];
}

/** Run data of a tree entry, or undefined for group entries (which carry none). */
function getEntryRunData(entry: LogTreeEntry): ITaskData | undefined {
	return isLogGroupEntry(entry) ? undefined : entry.runData;
}

function sortLogEntries(a: LogTreeEntry, b: LogTreeEntry): number {
	const aRunData = getEntryRunData(a);
	const bRunData = getEntryRunData(b);

	// Entries without run data (groups, sub-execution placeholders) sort by their
	// earliest child, keeping them in chronological order with concrete runs.
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
	const metadata = entry.runData?.metadata?.subExecution;

	if (metadata) {
		return { workflowId: metadata.workflowId, executionId: metadata.executionId };
	}

	return parseErrorMetadata(entry.runData?.error)?.subExecution;
}

export function getDefaultCollapsedEntries(entries: LogTreeEntry[]): Record<string, boolean> {
	const ret: Record<string, boolean> = {};

	function collect(children: LogTreeEntry[]) {
		for (const entry of children) {
			if (isLogGroupEntry(entry)) {
				// Groups load collapsed by default, except when a member errored —
				// surface the failure by expanding the group on first open.
				if (entry.executionStatus !== 'error') {
					ret[entry.id] = true;
				}
			} else if (hasSubExecution(entry) && entry.children.length === 0) {
				ret[entry.id] = true;
			}

			collect(entry.children);
		}
	}

	collect(entries);

	return ret;
}

export function getDepth(entry: LogTreeEntry): number {
	let depth = 0;
	let currentEntry: LogTreeEntry = entry;

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

export function isSubNodeLog(logEntry: LogTreeEntry): boolean {
	const parent = logEntry.parent;

	// A node nested under a group is a regular node, not an AI sub-node.
	return (
		parent !== undefined && !isLogGroupEntry(parent) && parent.executionId === logEntry.executionId
	);
}

export function isPlaceholderLog(treeNode: LogTreeEntry): boolean {
	return !isLogGroupEntry(treeNode) && treeNode.runData === undefined;
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
