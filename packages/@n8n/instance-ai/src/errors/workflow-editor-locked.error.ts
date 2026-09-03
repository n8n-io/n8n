import { OperationalError } from 'n8n-workflow';

/**
 * Thrown when an Instance AI workflow write is refused because a user holds the
 * editor write lock — someone has the workflow open on the canvas and is
 * actively editing it, so writing would overwrite work in progress.
 */
export class WorkflowEditorLockedError extends OperationalError {
	constructor(readonly workflowId: string) {
		super(
			`Workflow ${workflowId} is being edited by a user in the n8n editor right now, so it cannot be modified. ` +
				'Tell the user to finish or close their editing session, then retry.',
			{ level: 'warning' },
		);
	}
}

export function isWorkflowEditorLockedError(error: unknown): boolean {
	if (error instanceof WorkflowEditorLockedError) return true;
	return error instanceof Error && error.cause instanceof WorkflowEditorLockedError;
}
