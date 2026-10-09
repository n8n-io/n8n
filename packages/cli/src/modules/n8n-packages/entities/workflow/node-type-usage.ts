import type { INode } from 'n8n-workflow';

import type { PackageNodeTypeRequirement } from '../../spec/requirements.schema';

/** One workflow's node list, keyed by the id the usage entries should reference. */
export interface WorkflowNodeTypeSource {
	workflowId: string;
	nodes: INode[];
}

/** A unique `(type, typeVersion)` pair and the workflows that use it. Matches the manifest requirements shape. */
export type NodeTypeUsage = PackageNodeTypeRequirement;

/**
 * Folds every node of the given workflows into unique `(type, typeVersion)`
 * pairs with unique workflow consumers. Disabled nodes still count — they
 * render on canvas and are part of the content. Pure — no registry lookups.
 */
export function collectNodeTypeUsage(workflows: WorkflowNodeTypeSource[]): NodeTypeUsage[] {
	const usage = new Map<string, { type: string; typeVersion: number; workflowIds: Set<string> }>();

	for (const { workflowId, nodes } of workflows) {
		for (const node of nodes) {
			const key = `${node.type}@${node.typeVersion}`;
			const entry = usage.get(key);
			if (entry) {
				entry.workflowIds.add(workflowId);
				continue;
			}

			usage.set(key, {
				type: node.type,
				typeVersion: node.typeVersion,
				workflowIds: new Set([workflowId]),
			});
		}
	}

	return [...usage.values()].map(({ type, typeVersion, workflowIds }) => ({
		type,
		typeVersion,
		usedBy: [...workflowIds].map((id) => ({ kind: 'workflow', id })),
	}));
}
