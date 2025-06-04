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
} from 'n8n-workflow';
import type { LogEntry, LogEntrySelection, LogTreeCreationContext } from './logs.types';
import { isProxy, isReactive, isRef, toRaw } from 'vue';
import { CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { type ChatMessage } from '@n8n/chat/types';
import get from 'lodash-es/get';
import isEmpty from 'lodash-es/isEmpty';
import { v4 as uuid } from 'uuid';

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
		consumedTokens: getConsumedTokens(runData),
		workflow: context.workflow,
		executionId: context.executionId,
		execution: context.data,
	};
}

export function getTreeNodeData(
	nodeName: string,
	runData: ITaskData,
	runIndex: number | undefined,
	context: LogTreeCreationContext,
): LogEntry[] {
	const node = context.workflow.getNode(nodeName);

	return node ? getTreeNodeDataRec(node, runData, context, runIndex) : [];
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
				? getTreeNodeDataRec(
						subNode,
						t,
						{ ...context, depth: context.depth + 1, parent: treeNode },
						index,
					)
				: [];
		}),
	);
}

function getTreeNodeDataRec(
	node: INodeUi,
	runData: ITaskData,
	context: LogTreeCreationContext,
	runIndex: number | undefined,
): LogEntry[] {
	const treeNode = createNode(node, context, runIndex ?? 0, runData);
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
		getTreeNodeData(nodeName, runData, nodeHasMultipleRuns ? runIndex : undefined, context),
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
