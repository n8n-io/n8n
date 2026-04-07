import type { IWorkflowDb, INodeUi } from '@/Interface';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import type { IConnections } from 'n8n-workflow';
import { SPLIT_IN_BATCHES_NODE_TYPE } from '@/app/constants';

/**
 * Converts workflow tags from ITag[] (API response format) to string[] (store format)
 * Or keeps original value if already in string[] format
 */
export function convertWorkflowTagsToIds(tags: ITag[] | string[] | undefined): string[] {
	if (!tags || !Array.isArray(tags)) return [];
	if (tags.length === 0) return tags as string[];
	if (typeof tags[0] === 'object' && 'id' in tags[0]) {
		return (tags as ITag[]).map((tag) => tag.id);
	}
	return tags as string[];
}

/**
 * Removes execution data from workflow nodes and workflow-level execution data
 * to ensure clean comparisons in diffs. This prevents execution status, run data,
 * pinned data, and other runtime information from appearing in workflow difference
 * comparisons.
 */
export function removeWorkflowExecutionData(
	workflow: IWorkflowDb | undefined,
): IWorkflowDb | undefined {
	if (!workflow) return workflow;

	// Remove workflow-level execution data and clean up nodes
	const { pinData, ...cleanWorkflow } = workflow;

	const sanitizedWorkflow: IWorkflowDb = {
		...cleanWorkflow,
		nodes: workflow.nodes.map((node: INodeUi) => {
			// Create a clean copy without execution-related data
			const { issues, pinData, ...cleanNode } = node;
			return cleanNode;
		}),
	};

	return sanitizedWorkflow;
}

interface ExecutionOrderItem {
	node: { name: string; position: [number, number] };
	isTrigger: boolean;
}

/**
 * Orders nodes by execution order, grouped by trigger.
 * Iterates triggers (sorted by X position), DFS-ing each trigger's subgraph
 * to collect downstream nodes in execution order (depth-first, matching the
 * backend v1 execution strategy). This lets users complete one full branch
 * before moving to the next. Nodes reachable from multiple triggers appear
 * only under the first trigger visited.
 *
 * AI sub-nodes (tools, memory, etc.) connected via non-main connection types
 * are discovered through connectionsByDestinationNode, mirroring how the
 * backend discovers them on-demand via getInputConnectionData().
 * Sub-nodes are placed before their parent node in the result.
 *
 * Orphaned nodes (not reachable from any trigger) are dropped.
 * When there are no triggers, returns an empty array.
 */
export function sortNodesByExecutionOrder<T extends ExecutionOrderItem>(
	nodes: T[],
	connectionsBySourceNode: IConnections,
	connectionsByDestinationNode: IConnections = {},
	nodeTypes: Record<string, string> = {},
): T[] {
	const triggers = nodes
		.filter((item) => item.isTrigger)
		.sort((a, b) => a.node.position[0] - b.node.position[0]);

	if (triggers.length === 0) return [];

	const itemsByName = new Map<string, T>();
	for (const item of nodes) {
		itemsByName.set(item.node.name, item);
	}

	const result: T[] = [];
	const visited = new Set<string>();

	const addNode = (name: string) => {
		const item = itemsByName.get(name);
		if (item) {
			result.push(item);
		}
	};

	// DFS that visits AI sub-nodes before the node itself,
	// so that sub-nodes (tools, memory, models) appear before their parent (agent).
	const dfs = (name: string) => {
		if (visited.has(name)) return;
		visited.add(name);

		// First, discover AI sub-nodes connected to this node's non-main inputs.
		// Visit them before adding the current node so sub-nodes appear first.
		const destConns = connectionsByDestinationNode[name];
		if (destConns) {
			for (const type of Object.keys(destConns)) {
				if (type === 'main') continue;
				for (const inputs of destConns[type]) {
					for (const conn of inputs ?? []) {
						dfs(conn.node);
					}
				}
			}
		}

		// Add the current node after its sub-nodes
		addNode(name);

		// Then follow outgoing main connections only.
		// Non-main outgoing connections (ai_tool, ai_languageModel, etc.) point from
		// sub-nodes to their parent agents — those are already discovered via
		// connectionsByDestinationNode. Following them here would traverse the
		// main chain out of order when sub-nodes are shared across multiple agents.
		const sourceConns = connectionsBySourceNode[name];
		if (sourceConns?.main) {
			const mainOutputs = sourceConns.main;

			// Loop Over Items (SplitInBatches) V3: output 0 = "done", output 1 = "loop".
			// The execution engine runs the loop body first (repeatedly) and only sends
			// data to "done" after all iterations complete. Process output 1 before
			// output 0 so the sorted order matches execution order.
			if (nodeTypes[name] === SPLIT_IN_BATCHES_NODE_TYPE && mainOutputs.length > 1) {
				for (const idx of [1, 0]) {
					for (const conn of mainOutputs[idx] ?? []) {
						dfs(conn.node);
					}
				}
			} else {
				for (const outputs of mainOutputs) {
					for (const conn of outputs ?? []) {
						dfs(conn.node);
					}
				}
			}
		}
	};

	for (const trigger of triggers) {
		dfs(trigger.node.name);
	}

	return result;
}
