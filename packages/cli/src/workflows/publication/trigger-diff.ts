import type { INode } from 'n8n-workflow';
import { compareWorkflowsNodes, NodeDiffStatus } from 'n8n-workflow';

/**
 * The trigger nodes that need to be deregistered (`toRemove`) and registered
 * (`toAdd`) to move a workflow's active triggers from `oldTriggerNodes` to
 * `newTriggerNodes`. A modified trigger appears in both lists (remove-then-add);
 * an unchanged trigger appears in neither.
 */
export interface TriggerDiff {
	toAdd: Set<INode['id']>;
	toRemove: Set<INode['id']>;
}

/**
 * Computes the trigger-level diff between two versions of a workflow. Both
 * inputs must already be filtered to the enabled trigger-like nodes of their
 * version, so a disabled trigger is treated as absent: enabling it yields an
 * add, disabling it yields a remove.
 */
export function computeTriggerDiff(
	oldTriggerNodes: INode[],
	newTriggerNodes: INode[],
): TriggerDiff {
	const diff = compareWorkflowsNodes(oldTriggerNodes, newTriggerNodes);

	const toAdd: Set<INode['id']> = new Set();
	const toRemove: Set<INode['id']> = new Set();

	for (const [nodeId, { status }] of diff) {
		switch (status) {
			case NodeDiffStatus.Added:
				toAdd.add(nodeId);
				break;
			case NodeDiffStatus.Deleted:
				toRemove.add(nodeId);
				break;
			case NodeDiffStatus.Modified:
				toRemove.add(nodeId);
				toAdd.add(nodeId);
				break;
			case NodeDiffStatus.Eq:
				break;
		}
	}

	return { toAdd, toRemove };
}
