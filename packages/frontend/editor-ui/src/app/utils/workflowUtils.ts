import type { IWorkflowDb, INodeUi } from '@/Interface';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import type { IConnections } from 'n8n-workflow';

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
 * Orphaned nodes (not reachable from any trigger) are dropped.
 * When there are no triggers, returns an empty array.
 */
export function sortNodesByExecutionOrder<T extends ExecutionOrderItem>(
	nodes: T[],
	connectionsBySourceNode: IConnections,
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

	for (const trigger of triggers) {
		if (visited.has(trigger.node.name)) continue;
		visited.add(trigger.node.name);
		result.push(trigger);

		// DFS through all workflow connections from this trigger
		const dfs = (name: string) => {
			const nodeConns = connectionsBySourceNode[name];
			if (!nodeConns) return;
			for (const type of Object.keys(nodeConns)) {
				for (const outputs of nodeConns[type]) {
					for (const conn of outputs ?? []) {
						if (visited.has(conn.node)) continue;
						visited.add(conn.node);
						const item = itemsByName.get(conn.node);
						if (item) {
							result.push(item);
						}
						dfs(conn.node);
					}
				}
			}
		};
		dfs(trigger.node.name);
	}

	return result;
}
