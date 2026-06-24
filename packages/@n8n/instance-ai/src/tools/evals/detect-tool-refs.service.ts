import { isRecord } from '@n8n/utils';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	collectStrings,
	extractNamedRefMatches,
	findAgentSubComponents,
	nodeHasName,
} from './column-ref-utils';

export interface ToolRef {
	/** Source node name extracted from the expression (the node we'll pin). */
	sourceNodeName: string;
	/** Field on the source node referenced after `.item.json.` */
	field: string;
	/** Sub-component (tool/memory/...) whose parameter holds the expression. */
	toolNodeName: string;
}

/**
 * Walks `main` connections downstream from `startNodeName`, returning the set
 * of reachable node names (excluding the start itself). Used to identify
 * nodes that will execute during an eval run (and therefore should NOT be
 * pinned, since pinned data would shadow their real output).
 */
function reachableDownstreamMain(workflow: WorkflowJSON, startNodeName: string): Set<string> {
	const reached = new Set<string>();
	const queue: string[] = [startNodeName];
	while (queue.length > 0) {
		const current = queue.shift()!;
		const slot = workflow.connections?.[current]?.main;
		if (!Array.isArray(slot)) continue;
		for (const inner of slot) {
			if (!Array.isArray(inner)) continue;
			for (const conn of inner) {
				if (!isRecord(conn) || typeof conn.node !== 'string') continue;
				if (reached.has(conn.node)) continue;
				reached.add(conn.node);
				queue.push(conn.node);
			}
		}
	}
	return reached;
}

/**
 * Detects named cross-node references inside the AI agent's sub-components
 * (tools, memory, output parsers — anything wired in via `ai_*`). Filters
 * out refs that:
 *   - point to nodes not present in the workflow,
 *   - point to the agent itself,
 *   - point to nodes downstream of the agent (those execute during eval).
 *
 * Each remaining ref names a node whose data must be supplied via `pinData`
 * for eval runs to see realistic context.
 */
export function detectToolRefs(workflow: WorkflowJSON, agentNodeName: string): ToolRef[] {
	const agent = (workflow.nodes ?? []).find((n) => nodeHasName(n) && n.name === agentNodeName);
	if (!agent) {
		throw new Error(`Agent node "${agentNodeName}" not found in workflow`);
	}

	const subComponents = findAgentSubComponents(workflow, agentNodeName);
	if (subComponents.length === 0) return [];

	const nodesByName = new Map(
		(workflow.nodes ?? []).filter(nodeHasName).map((n) => [n.name, n] as const),
	);
	const downstream = reachableDownstreamMain(workflow, agentNodeName);

	const seen = new Set<string>();
	const result: ToolRef[] = [];
	for (const toolNodeName of subComponents) {
		const toolNode = nodesByName.get(toolNodeName);
		if (!toolNode) continue;
		const matches = collectStrings(toolNode.parameters).flatMap((text) =>
			extractNamedRefMatches(text),
		);
		for (const m of matches) {
			if (m.nodeName === agentNodeName) continue;
			if (downstream.has(m.nodeName)) continue;
			if (!nodesByName.has(m.nodeName)) continue;
			const key = `${toolNodeName}\x00${m.nodeName}\x00${m.field}`;
			if (seen.has(key)) continue;
			seen.add(key);
			result.push({
				sourceNodeName: m.nodeName,
				field: m.field,
				toolNodeName,
			});
		}
	}
	return result;
}
