import type { PolicyViolation } from '@n8n/api-types';
import { ResponseError } from '@n8n/errors';

/**
 * Thrown when a workflow adds or edits a node whose type is marked
 * `deprecated: true`, on save or before an unsaved workflow or node runs.
 * Lists one violation for each offending node in `meta.violations`, in the
 * same shape as policy refusals. Like those, a violation names the node type,
 * so the editor lists each type once and selects every node of that type.
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
