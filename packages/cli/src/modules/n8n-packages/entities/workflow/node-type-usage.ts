import type { INode } from 'n8n-workflow';

/** One workflow's node list, keyed by the id the usage entries should reference. */
export interface WorkflowNodeTypeSource {
	workflowId: string;
	nodes: INode[];
}

/** A unique `(type, typeVersion)` pair and the workflows that use it. Matches the manifest requirements shape. */
export interface NodeTypeUsage {
	type: string;
	typeVersion: number;
	usedByWorkflows: string[];
}

/**
 * Folds every node of the given workflows into unique `(type, typeVersion)`
 * pairs with deduped `usedByWorkflows`. Disabled nodes still count — they
 * render on canvas and are part of the content. Pure — no registry lookups.
 */
export function collectNodeTypeUsage(workflows: WorkflowNodeTypeSource[]): NodeTypeUsage[] {
	const usage = new Map<string, NodeTypeUsage>();

	for (const { workflowId, nodes } of workflows) {
		for (const node of nodes) {
			const key = `${node.type}@${node.typeVersion}`;
			const entry = usage.get(key);
			if (entry) {
				// Workflows fold sequentially, so a duplicate id can only be the last pushed.
				if (entry.usedByWorkflows.at(-1) !== workflowId) {
					entry.usedByWorkflows.push(workflowId);
				}
				continue;
			}

			usage.set(key, {
				type: node.type,
				typeVersion: node.typeVersion,
				usedByWorkflows: [workflowId],
			});
		}
	}

	return [...usage.values()];
}
