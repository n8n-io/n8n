import { type LlmTokenUsageData, type IAiDataContent } from '@/Interface';
import { addTokenUsageData, emptyTokenUsageData } from '@/utils/aiUtils';
import {
	type INodeExecutionData,
	type ITaskData,
	type ITaskDataConnections,
	type NodeConnectionType,
	type Workflow,
} from 'n8n-workflow';
import { splitTextBySearch } from '@/utils/stringUtils';
import { escapeHtml } from 'xss';
import type MarkdownIt from 'markdown-it';
import { unescapeAll } from 'markdown-it/lib/common/utils';

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
	runIndex: number,
): TreeNode[] {
	return getTreeNodeDataRec(undefined, nodeName, 0, workflow, aiData, runIndex);
}

function getTreeNodeDataRec(
	parent: TreeNode | undefined,
	nodeName: string,
	currentDepth: number,
	workflow: Workflow,
	aiData: AIResult[] | undefined,
	runIndex: number,
): TreeNode[] {
	const connections = workflow.connectionsByDestinationNode[nodeName];
	const resultData =
		aiData?.filter((data) => data.node === nodeName && runIndex === data.runIndex) ?? [];

	if (!connections) {
		return resultData.map((d) => createNode(parent, nodeName, currentDepth, d.runIndex, d));
	}

	// Filter AI data to only show executions that were triggered by this node
	// This prevents duplicate entries in logs when a sub-node is connected to multiple root nodes
	// Nodes without source info or with empty source arrays are always included
	const filteredAiData = aiData?.filter(({ data }) => {
		if (!data?.source || data.source.every((source) => source === null)) {
			return true;
		}

		return data.source.some(
			(source) => source?.previousNode === nodeName && source.previousNodeRun === runIndex,
		);
	});

	// Get the first level of children
	const connectedSubNodes = workflow.getParentNodes(nodeName, 'ALL_NON_MAIN', 1);

	const treeNode = createNode(parent, nodeName, currentDepth, runIndex);

	// Only include sub-nodes which have data
	const children = (filteredAiData ?? []).flatMap((data) =>
		connectedSubNodes.includes(data.node)
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

export function createHtmlFragmentWithSearchHighlight(
	text: string,
	search: string | undefined,
): string {
	const escaped = escapeHtml(text);

	return search
		? splitTextBySearch(escaped, search)
				.map((part) => (part.isMatched ? `<mark>${part.content}</mark>` : part.content))
				.join('')
		: escaped;
}

export function createSearchHighlightPlugin(search: string | undefined) {
	return (md: MarkdownIt) => {
		md.renderer.rules.text = (tokens, idx) =>
			createHtmlFragmentWithSearchHighlight(tokens[idx].content, search);

		md.renderer.rules.code_inline = (tokens, idx, _, __, slf) =>
			`<code${slf.renderAttrs(tokens[idx])}>${createHtmlFragmentWithSearchHighlight(tokens[idx].content, search)}</code>`;

		md.renderer.rules.code_block = (tokens, idx, _, __, slf) =>
			`<pre${slf.renderAttrs(tokens[idx])}><code>${createHtmlFragmentWithSearchHighlight(tokens[idx].content, search)}</code></pre>\n`;

		md.renderer.rules.fence = (tokens, idx, options, _, slf) => {
			const token = tokens[idx];
			const info = token.info ? unescapeAll(token.info).trim() : '';
			let langName = '';
			let langAttrs = '';

			if (info) {
				const arr = info.split(/(\s+)/g);
				langName = arr[0];
				langAttrs = arr.slice(2).join('');
			}

			const highlighted =
				options.highlight?.(token.content, langName, langAttrs) ??
				createHtmlFragmentWithSearchHighlight(token.content, search);

			if (highlighted.indexOf('<pre') === 0) {
				return highlighted + '\n';
			}

			return `<pre><code${slf.renderAttrs(token)}>${highlighted}</code></pre>\n`;
		};
	};
}
