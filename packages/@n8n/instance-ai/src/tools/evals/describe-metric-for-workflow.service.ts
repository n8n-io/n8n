import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { isRecord } from './column-ref-utils';
import type { MetricId } from './metric-catalog';

type RecommendedMetricId = Exclude<MetricId, 'helpfulness'>;

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
		case 'helpfulness':
			return "Rates whether the agent's response addresses the user's intent";
		default:
			return '';
	}
}

/**
 * Returns the ID of the metric most workflow-specific for `agentNodeName`:
 * - If the agent has tools → `tool_use`.
 * - Else → `correctness`.
 *
 * Used to mark a single option with " (recommended)" in the selection widget.
 */
export function recommendedMetricId(
	workflow: WorkflowJSON,
	agentNodeName: string,
): RecommendedMetricId {
	if (getAgentToolNames(workflow, agentNodeName).length > 0) return 'tool_use';
	return 'correctness';
}
