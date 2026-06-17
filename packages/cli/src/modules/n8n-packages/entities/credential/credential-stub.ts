import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

/** Package workflow ids that must not be published because they use stubbed credentials. */
export function workflowsBlockedFromPublish(
	requirements: PackageCredentialRequirement[] | undefined,
	stubbedSourceIds: ReadonlySet<string>,
): Set<string> {
	const blocked = new Set<string>();

	for (const requirement of requirements ?? []) {
		if (!stubbedSourceIds.has(requirement.id)) continue;

		for (const sourceWorkflowId of requirement.usedByWorkflows) {
			blocked.add(sourceWorkflowId);
		}
	}

	return blocked;
}
