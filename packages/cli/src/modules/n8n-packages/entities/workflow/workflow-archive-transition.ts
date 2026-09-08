/** The archive step an update needs so the target ends up in the state the package describes. */
export type WorkflowArchiveTransition = 'archive' | 'unarchive';

export function decideWorkflowArchiveTransition(
	packageArchived: boolean | undefined,
	existingArchived: boolean,
): WorkflowArchiveTransition | null {
	if (packageArchived === undefined) return null;
	if (packageArchived === existingArchived) return null;
	return packageArchived ? 'archive' : 'unarchive';
}
