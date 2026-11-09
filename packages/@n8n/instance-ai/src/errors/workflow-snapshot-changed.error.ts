import { OperationalError } from 'n8n-workflow';

/**
 * Thrown when a workflow keeps changing while its source and concurrency token
 * are being read, so no consistent snapshot could be bound to a source file.
 */
export class WorkflowSnapshotChangedError extends OperationalError {
	constructor(workflowId: string) {
		super(
			`Workflow ${workflowId} changed while its source was being read. Run get_workflow_as_code through call_tool again.`,
			{ level: 'warning' },
		);
	}
}
