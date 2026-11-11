export type ReviewRequirementScope = 'instance' | 'project' | 'workflow';

export type ReviewRequirementSources = {
	instance: boolean;
	project: boolean;
	workflow: boolean;
};

/** True when any scope requires approval. */
export function effectiveReviewRequirement(sources: ReviewRequirementSources): boolean {
	return sources.instance || sources.project || sources.workflow;
}

/**
 * The highest scope that already requires approval.
 * A lower scope can add a requirement. It cannot turn one off.
 */
export function reviewRequirementLockedBy(
	sources: ReviewRequirementSources,
): 'instance' | 'project' | null {
	if (sources.instance) return 'instance';
	if (sources.project) return 'project';
	return null;
}

/** A project row can only be locked by the instance. */
export function projectRequirementLockedBy(instance: boolean): 'instance' | null {
	return instance ? 'instance' : null;
}

export function rejectsTurningRequirementOff(locked: boolean, requested: boolean): boolean {
	return locked && requested === false;
}
