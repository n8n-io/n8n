import type { AutoPublishMode } from 'dto/source-control/pull-work-folder-request.dto';

/**
 * Determines if a workflow should be activated during import based on auto-publish settings.
 *
 * @param isNewWorkflow - Whether this is a new workflow (created) or existing (modified)
 * @param wasPublished - Whether the local workflow was previously active/published
 * @param isNowArchived - Whether the remote workflow is currently archived
 * @param autoPublish - The auto-publish mode selected by the user
 */
export function shouldActivateWorkflow(params: {
	isNewWorkflow: boolean;
	wasPublished: boolean;
	isNowArchived: boolean;
	autoPublish: AutoPublishMode;
}): boolean {
	const { isNewWorkflow, wasPublished, isNowArchived, autoPublish } = params;

	// Archived workflows should never be activated
	if (isNowArchived) {
		return false;
	}

	if (autoPublish === 'all') {
		return true;
	}

	// For 'published' mode, only activate existing workflows that were previously active
	if (autoPublish === 'published' && !isNewWorkflow && wasPublished) {
		return true;
	}

	return false;
}
