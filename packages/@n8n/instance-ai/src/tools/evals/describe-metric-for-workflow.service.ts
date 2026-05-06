import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { isRecord } from './column-ref-utils';

/**
 * Walks `workflow.connections` to find all source nodes that connect into
 * `targetNodeName` via the given connection type (e.g. 'ai_tool', 'ai_languageModel').
 * Returns the source node names. Empty array if none.
 */
function findSourceNodesByConnectionType(
	workflow: WorkflowJSON,
	targetNodeName: string,
	connectionType: string,
): string[] {
	const sources: string[] = [];
	const connections = workflow.connections ?? {};
	for (const [sourceName, byType] of Object.entries(connections)) {
		if (!isRecord(byType)) continue;
		const slot = byType[connectionType];
		if (!Array.isArray(slot)) continue;
		for (const inner of slot) {
			if (!Array.isArray(inner)) continue;
			for (const conn of inner) {
				if (isRecord(conn) && conn.node === targetNodeName) {
					sources.push(sourceName);
				}
			}
		}
	}
	return sources;
}

/**
 * Returns names of langchain "tool" nodes wired into the agent via `ai_tool`.
 * Includes both pure tool nodes and Agent-as-tool patterns.
 */
function getAgentToolNames(workflow: WorkflowJSON, agentNodeName: string): string[] {
	return findSourceNodesByConnectionType(workflow, agentNodeName, 'ai_tool');
}

/**
 * Returns names of retriever / vector-store nodes wired into the agent via any
 * ai_* connection type. Detection is by node TYPE, not connection type — we
 * check whether the source node type matches retriever/vectorStore patterns.
 */
function getAgentRetrieverNames(workflow: WorkflowJSON, agentNodeName: string): string[] {
	const connections = workflow.connections ?? {};
	const candidates = new Set<string>();
	for (const [sourceName, byType] of Object.entries(connections)) {
		if (!isRecord(byType)) continue;
		for (const [connType, slot] of Object.entries(byType)) {
			if (!connType.startsWith('ai_')) continue;
			if (!Array.isArray(slot)) continue;
			for (const inner of slot) {
				if (!Array.isArray(inner)) continue;
				for (const conn of inner) {
					if (isRecord(conn) && conn.node === agentNodeName) {
						candidates.add(sourceName);
					}
				}
			}
		}
	}

	const nodeTypes = new Map<string, string>();
	for (const node of workflow.nodes ?? []) {
		if (typeof node.name === 'string' && typeof node.type === 'string') {
			nodeTypes.set(node.name, node.type);
		}
	}

	return [...candidates].filter((name) => {
		const type = (nodeTypes.get(name) ?? '').toLowerCase();
		return /\.(retriever|vectorstore)/.test(type);
	});
}

function formatNameList(names: string[]): string {
	if (names.length === 0) return '';
	if (names.length === 1) return `\`${names[0]}\``;
	if (names.length === 2) return `\`${names[0]}\`, \`${names[1]}\``;
	const last = names[names.length - 1];
	const head = names
		.slice(0, -1)
		.map((n) => `\`${n}\``)
		.join(', ');
	return `${head}, \`${last}\``;
}

/**
 * Returns a one-line description of how `metricId` applies to the given
 * workflow's agent. Inspects connections to find tools and retrievers.
 */
export function describeMetricForWorkflow(
	workflow: WorkflowJSON,
	agentNodeName: string,
	metricId: string,
): string {
	switch (metricId) {
		case 'correctness':
			return `Compares ${agentNodeName}'s response to a ground-truth column in your dataset`;
		case 'tool_use': {
			const tools = getAgentToolNames(workflow, agentNodeName);
			if (tools.length === 0) {
				return 'Add tools to your agent first to use this metric';
			}
			return `Verifies the agent picks correctly between ${formatNameList(tools)}`;
		}
		case 'relevance': {
			const retrievers = getAgentRetrieverNames(workflow, agentNodeName);
			if (retrievers.length === 0) {
				return 'Rates retrieved context relevance — best for RAG workflows';
			}
			return `Rates whether retrieved context from ${formatNameList(retrievers)} matches the user query`;
		}
		case 'helpfulness':
			return "Rates whether the agent's response addresses the user's intent";
		default:
			return '';
	}
}

/**
 * Returns the ID of the metric most workflow-specific for `agentNodeName`:
 * - If the agent has tools → `tool_use`.
 * - Else if the agent has a retriever/vector store → `relevance`.
 * - Else → `correctness`.
 *
 * Used to mark a single option with " (recommended)" in the selection widget.
 */
export function recommendedMetricId(workflow: WorkflowJSON, agentNodeName: string): string {
	if (getAgentToolNames(workflow, agentNodeName).length > 0) return 'tool_use';
	if (getAgentRetrieverNames(workflow, agentNodeName).length > 0) return 'relevance';
	return 'correctness';
}
