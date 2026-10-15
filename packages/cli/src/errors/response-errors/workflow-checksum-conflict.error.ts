import { ConflictError } from '@n8n/errors';

/**
 * The caller saved against a workflow checksum that is no longer current:
 * someone else changed the workflow after the caller read it. A subclass so
 * callers can tell a stale save apart from other 409s, such as a webhook clash
 * during reactivation.
 */
export class WorkflowChecksumConflictError extends ConflictError {
	constructor() {
		super(
			'Your most recent changes may be lost, because someone else just updated this workflow. Open this workflow in a new tab to see those new updates.',
		);
	}
}
