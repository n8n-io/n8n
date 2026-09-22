import { extractWorkflowRequirements } from '../entities/workflow/references/extract-workflow-requirements';
import type { PreparedWorkflow } from '../entities/workflow/workflow-import.types';

/**
 * A sub-workflow reference from a selected (or closure-pulled) workflow to an id the package does
 * not carry. The caller decides whether it is a real gap: it is only missing when the destination
 * does not hold it either.
 */
export interface SelectionExternalReference {
	/** Source id of the workflow that holds the reference. */
	sourceWorkflowId: string;
	/** Name of the referencing workflow, for the blocking issue. */
	name: string;
	/** Source id of the referenced workflow that is outside the package. */
	referencedWorkflowId: string;
}

export interface SelectionClosure {
	/** The selection plus the in-package sub-workflows it transitively needs. */
	selectedWorkflows: PreparedWorkflow[];
	/** References that point outside the package. */
	externalReferences: SelectionExternalReference[];
}

/**
 * Reduces the package workflows to a cherry-pick selection plus its sub-workflow closure. Follows
 * sub-workflow references within the package (BFS) to pull dependencies in; references to ids the
 * package does not carry are reported as external references for the caller to check against the
 * destination.
 */
export function computeSelectionClosure(
	allWorkflows: PreparedWorkflow[],
	selectedIds: ReadonlySet<string>,
): SelectionClosure {
	const bySourceId = new Map(allWorkflows.map((workflow) => [workflow.sourceWorkflowId, workflow]));
	const includedIds = new Set<string>();
	const externalReferences: SelectionExternalReference[] = [];

	const queue = [...selectedIds].filter((id) => bySourceId.has(id));
	while (queue.length > 0) {
		const id = queue.shift()!;
		if (includedIds.has(id)) continue;
		includedIds.add(id);

		const workflow = bySourceId.get(id)!;
		for (const { referencedWorkflowId } of extractWorkflowRequirements(workflow.entity)) {
			if (bySourceId.has(referencedWorkflowId)) {
				if (!includedIds.has(referencedWorkflowId)) queue.push(referencedWorkflowId);
			} else {
				externalReferences.push({
					sourceWorkflowId: id,
					name: workflow.entity.name,
					referencedWorkflowId,
				});
			}
		}
	}

	const selectedWorkflows = allWorkflows.filter((workflow) =>
		includedIds.has(workflow.sourceWorkflowId),
	);
	return { selectedWorkflows, externalReferences };
}
