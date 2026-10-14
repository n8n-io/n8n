import { ResponseError } from './abstract/response.error';

export type DeprecatedNodeViolation = {
	kind: 'added' | 'edited';
	nodeName: string;
	nodeType: string;
};

/**
 * Thrown when a workflow adds or edits a node whose type is marked
 * `deprecated: true`, on save or before an unsaved workflow or node runs.
 * Lists the offending nodes in `meta.violations` so callers can act on them
 * without parsing the error message.
 */
export class DeprecatedNodesError extends ResponseError {
	constructor(
		message: string,
		readonly meta: { violations: DeprecatedNodeViolation[] },
	) {
		super(message, 400);
		this.name = 'DeprecatedNodesError';
	}
}
