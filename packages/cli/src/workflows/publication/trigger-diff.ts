import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import type { INode } from 'n8n-workflow';
import { compareWorkflowsNodes, NodeDiffStatus } from 'n8n-workflow';

// Only these properties affect how a trigger is registered. Comparing more
// (notes, error-handling settings, ...) would deregister and re-register live
// triggers on edits that don't change how they run.
const registrationProps = ['name', 'type', 'typeVersion', 'webhookId', 'credentials', 'parameters'];

function registrationEqual(base: INode | undefined, target: INode | undefined): boolean {
	return isEqual(pick(base, registrationProps), pick(target, registrationProps));
}

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
	const diff = compareWorkflowsNodes(oldTriggerNodes, newTriggerNodes, registrationEqual);

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
