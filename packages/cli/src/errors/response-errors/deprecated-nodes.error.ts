import type { PolicyViolation } from '@n8n/api-types';
import { ResponseError } from '@n8n/errors';

/**
 * Thrown when a workflow adds or edits a node whose type is marked
 * `deprecated: true`, on save or before an unsaved workflow or node runs.
 * Lists the offending nodes in `meta.violations`, in the same shape as policy
 * refusals, so the editor can list them and select them on the canvas.
 */
export class DeprecatedNodesError extends ResponseError {
	constructor(
		message: string,
		readonly meta: { violations: PolicyViolation[] },
	) {
		super(message, 400);
		this.name = 'DeprecatedNodesError';
	}
}
