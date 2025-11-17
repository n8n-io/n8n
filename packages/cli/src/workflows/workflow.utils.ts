/**
 * Adds computed active field to workflow for API responses.
 * Derives active from activeVersionId for frontend compatibility.
 */
export function toWorkflow<T extends { activeVersionId?: string | null | undefined }>(
	workflow: T,
): T & { active: boolean } {
	return {
		...workflow,
		active: workflow.activeVersionId !== null && workflow.activeVersionId !== undefined,
	};
}

/**
 * Transforms array of workflows, adding active field to each.
 */
export function toWorkflows<T extends { activeVersionId?: string | null | undefined }>(
	workflows: T[],
): Array<T & { active: boolean }> {
	return workflows.map(toWorkflow);
}
