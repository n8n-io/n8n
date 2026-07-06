import { OperationalError } from 'n8n-workflow';

/**
 * Thrown when an Instance AI workflow save loses optimistic-concurrency:
 * the workflow was modified outside the builder's last-known snapshot.
 */
export class WorkflowSaveConflictError extends OperationalError {
	constructor(workflowId: string) {
		super(
			`Workflow ${workflowId} was modified outside this conversation since the last save. Re-fetch with workflows(action="get-as-code"), re-apply your edit, then rebuild.`,
			{ level: 'warning' },
		);
	}
}
