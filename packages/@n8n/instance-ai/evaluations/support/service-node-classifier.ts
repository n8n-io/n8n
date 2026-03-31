/**
 * Service node classifier for workflow evaluation.
 *
 * Identifies which nodes in a workflow are "service nodes" that need pin data
 * to execute without real credentials or external infrastructure.
 *
 * Uses an inverted approach: maintains a list of known utility/logic nodes
 * that should run for real. Everything else is classified as a service node
 * and gets pin data. This avoids relying on node.credentials being populated,
 * which Instance AI often leaves empty when building workflows.
 *
 * NOTE: Adapted from @n8n/ai-workflow-builder.ee/evaluations/support/pin-data-generator.ts
 * This should be extracted to a shared package (e.g., @n8n/eval-utils) for reuse
 * by MCP, frontend, and other teams.
 */

import type { WorkflowJSON, NodeJSON } from '@n8n/workflow-sdk';

// ---------------------------------------------------------------------------
// Utility nodes that should execute for real — these don't call external
// services and contain the workflow's internal logic (merging, filtering,
// branching, transforming, etc.)
// ---------------------------------------------------------------------------

const UTILITY_NODES = new Set([
	// Logic / routing
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.filter',
	'n8n-nodes-base.merge',
	'n8n-nodes-base.noOp',

	// Data transformation
	'n8n-nodes-base.set',
	'n8n-nodes-base.sort',
	'n8n-nodes-base.summarize',
	'n8n-nodes-base.splitOut',
	'n8n-nodes-base.aggregate',
	'n8n-nodes-base.itemLists',
	'n8n-nodes-base.renameKeys',
	'n8n-nodes-base.splitInBatches',
	'n8n-nodes-base.removeDuplicates',
	'n8n-nodes-base.limit',
	'n8n-nodes-base.compareDatasets',

	// Special triggers that don't produce useful pin data
	'n8n-nodes-base.errorTrigger',

	// Flow control
	'n8n-nodes-base.wait',
	'n8n-nodes-base.respondToWebhook',
	'n8n-nodes-base.executeWorkflowTrigger',

	// Annotations
	'n8n-nodes-base.stickyNote',
]);

// ---------------------------------------------------------------------------
// AI root node detection
// ---------------------------------------------------------------------------

/**
 * Find node names that are targets of AI-type connections (ai_languageModel,
 * ai_tool, ai_memory, etc.). These are root AI nodes (Agent, Chain) whose
 * sub-nodes can't be individually pinned — pinning the root prevents
 * sub-node execution entirely.
 */
function findAiRootNodeNames(workflow: WorkflowJSON): Set<string> {
	const roots = new Set<string>();
	for (const nodeConns of Object.values(workflow.connections)) {
		for (const [connType, outputs] of Object.entries(nodeConns as Record<string, unknown>)) {
			if (!connType.startsWith('ai_')) continue;
			if (!Array.isArray(outputs)) continue;
			for (const group of outputs) {
				if (!Array.isArray(group)) continue;
				for (const conn of group) {
					if (typeof conn === 'object' && conn !== null && 'node' in conn) {
						const target = (conn as { node: string }).node;
						if (target) roots.add(target);
					}
				}
			}
		}
	}
	return roots;
}

// ---------------------------------------------------------------------------
// AI sub-node detection
// ---------------------------------------------------------------------------

/**
 * Find node names that ARE sub-nodes of AI root nodes (language models, tools,
 * memory, etc.). These are pinned via their root node and should not be
 * pinned individually.
 */
function findAiSubNodeNames(workflow: WorkflowJSON): Set<string> {
	const subNodes = new Set<string>();
	for (const [sourceName, nodeConns] of Object.entries(workflow.connections)) {
		for (const [connType] of Object.entries(nodeConns as Record<string, unknown>)) {
			if (connType.startsWith('ai_')) {
				subNodes.add(sourceName);
			}
		}
	}
	return subNodes;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Identify which nodes in a workflow are service nodes that need pin data
 * to execute without real credentials.
 *
 * Uses an inverted approach: everything that isn't a known utility node
 * is considered a service node. This works regardless of whether
 * node.credentials is populated.
 */
export function identifyServiceNodes(workflow: WorkflowJSON): NodeJSON[] {
	const aiRootNodes = findAiRootNodeNames(workflow);
	const aiSubNodes = findAiSubNodeNames(workflow);

	return workflow.nodes.filter((node) => {
		if (node.disabled) return false;
		if (!node.name) return false;

		// AI sub-nodes (LLM models, tools, memory) are handled via their root
		if (aiSubNodes.has(node.name)) return false;

		// AI root nodes (Agent, Chain) always need pin data
		if (aiRootNodes.has(node.name)) return true;

		// Known utility nodes run for real
		if (UTILITY_NODES.has(node.type)) return false;

		// Everything else is a service node
		return true;
	});
}
