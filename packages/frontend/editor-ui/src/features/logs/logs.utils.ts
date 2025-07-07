import type { IExecutionResponse, INodeUi, LlmTokenUsageData, IWorkflowDb } from '@/Interface';
import { addTokenUsageData, emptyTokenUsageData, isChatNode } from '@/utils/aiUtils';
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
} from 'n8n-workflow';
import type { LogEntry, LogEntrySelection, LogTreeCreationContext } from './logs.types';
import { isProxy, isReactive, isRef, toRaw } from 'vue';
import { CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { type ChatMessage } from '@n8n/chat/types';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import { v4 as uuid } from 'uuid';
import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';

function getConsumedTokens(task: ITaskData): LlmTokenUsageData {
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
		consumedTokens: runData ? getConsumedTokens(runData) : emptyTokenUsageData,
		workflow: context.workflow,
		executionId: context.executionId,
		execution: context.data,
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

		return createLogTreeRec({
			...context,
			parent: treeNode,
			ancestorRunIndexes: [...context.ancestorRunIndexes, runIndex ?? 0],
			workflow,
			executionId: subExecutionLocator.executionId,
			data: subWorkflowRunData,
		});
	}

	// Get the first level of children
	const connectedSubNodes = context.workflow.getParentNodes(node.name, 'ALL_NON_MAIN', 1);

	function isMatchedSource(source: ISourceData | null): boolean {
		return (
			(source?.previousNode === node.name ||
				(isPlaceholderLog(treeNode) && source?.previousNode === TOOL_EXECUTOR_NODE_NAME)) &&
			(runIndex === undefined || source.previousNodeRun === runIndex)
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

function findLogEntryToAutoSelect(subTree: LogEntry[]): LogEntry | undefined {
	const entryWithError = findLogEntryRec((e) => !!e.runData?.error, subTree);

	if (entryWithError) {
		return entryWithError;
	}

	const entryForAiAgent = findLogEntryRec(
		(entry) =>
			entry.node.type === AGENT_LANGCHAIN_NODE_TYPE ||
			(entry.parent?.node.type === AGENT_LANGCHAIN_NODE_TYPE && isPlaceholderLog(entry.parent)),
		subTree,
	);

	if (entryForAiAgent) {
		return entryForAiAgent;
	}

	return subTree[subTree.length - 1];
}

export function createLogTree(
	workflow: Workflow,
	response: IExecutionResponse,
	workflows: Record<string, Workflow> = {},
	subWorkflowData: Record<string, IRunExecutionData> = {},
) {
	return createLogTreeRec({
		parent: undefined,
		ancestorRunIndexes: [],
		executionId: response.id,
		workflow,
		workflows,
		data: response.data ?? { resultData: { runData: {} } },
		subWorkflowData,
	});
}

function createLogTreeRec(context: LogTreeCreationContext) {
	const runData = context.data.resultData.runData;

	return Object.entries(runData)
		.flatMap<{
			node: INode;
			task?: ITaskData;
			runIndex?: number;
			nodeHasMultipleRuns: boolean;
		}>(([nodeName, taskData]) => {
			const node = context.workflow.getNode(nodeName);

			if (node === null) {
				return [];
			}

			const childNodes = context.workflow.getChildNodes(nodeName, 'ALL_NON_MAIN');

			if (childNodes.length === 0) {
				// The node is root node
				return taskData.map((task, runIndex) => ({
					node,
					task,
					runIndex,
					nodeHasMultipleRuns: taskData.length > 1,
				}));
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
		})
		.flatMap(({ node, runIndex, task, nodeHasMultipleRuns }) =>
			getTreeNodeData(node, task, nodeHasMultipleRuns ? runIndex : undefined, context),
		)
		.sort(sortLogEntries);
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

			if (found === undefined && !isExecuting) {
				for (let runIndex = selection.entry.runIndex - 1; runIndex >= 0; runIndex--) {
					const fallback = findLogEntryRec(
						(e) =>
							e.workflow.id === selection.entry.workflow.id &&
							e.node.id === selection.entry.node.id &&
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

function sortLogEntries(a: LogEntry, b: LogEntry): number {
	if (a.runData === undefined) {
		return a.children.length > 0 ? sortLogEntries(a.children[0], b) : 0;
	}

	if (b.runData === undefined) {
		return b.children.length > 0 ? sortLogEntries(a, b.children[0]) : 0;
	}

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
	return findSubExecutionLocator(entry) !== undefined;
}

export function findSubExecutionLocator(entry: LogEntry): RelatedExecution | undefined {
	const metadata = entry.runData?.metadata?.subExecution;

	if (metadata) {
		return { workflowId: metadata.workflowId, executionId: metadata.executionId };
	}

	return parseErrorMetadata(entry.runData?.error)?.subExecution;
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
		const responseData = get(nodeResponseData, 'data.main[0][0].json');
		const text = extractResponseText(responseData) ?? emptyText;

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
	const paths = ['output', 'text', 'response.text'];
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
): ChatMessage[] {
	if (!workflowExecutionData?.data) {
		return [];
	}

	const userMessage = extractChatInput(
		workflowExecutionData.workflowData,
		workflowExecutionData.data.resultData,
	);
	const botMessage = extractBotResponse(
		workflowExecutionData.data.resultData,
		workflowExecutionData.id,
		emptyText,
	);

	return [...(userMessage ? [userMessage] : []), ...(botMessage ? [botMessage] : [])];
}

export function isSubNodeLog(logEntry: LogEntry): boolean {
	return logEntry.parent !== undefined && logEntry.parent.executionId === logEntry.executionId;
}

export function isPlaceholderLog(treeNode: LogEntry): boolean {
	return treeNode.runData === undefined;
}
