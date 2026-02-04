import type { WorkflowMetadata } from '../types';

/**
 * Reducer for appending arrays with null/empty check.
 * Only appends if the update is a non-empty array.
 */
export function appendArrayReducer<T>(current: T[], update: T[] | undefined | null): T[] {
	return update && update.length > 0 ? [...current, ...update] : current;
}

/**
 * Reducer for caching workflow templates, deduplicating by template ID.
 * Merges new templates with existing ones, avoiding duplicates.
 */
export function cachedTemplatesReducer(
	current: WorkflowMetadata[],
	update: WorkflowMetadata[] | undefined | null,
): WorkflowMetadata[] {
	if (!update || update.length === 0) {
		return current;
	}

	// Build a map of existing templates by ID for fast lookup
	const existingById = new Map(current.map((wf) => [wf.templateId, wf]));

	// Add new templates that don't already exist
	for (const workflow of update) {
		if (!existingById.has(workflow.templateId)) {
			existingById.set(workflow.templateId, workflow);
		}
	}

	return Array.from(existingById.values());
}
