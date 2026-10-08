import { ResponseError } from './abstract/response.error';

export type DeprecatedNodeViolation = {
	kind: 'added' | 'edited';
	nodeName: string;
	nodeType: string;
};

/**
 * Thrown when a workflow save would introduce, or modify in place, a node
 * whose type is marked `deprecated: true`. Carries the full list of offending
 * nodes in `meta.violations` so callers can act on them without parsing the
 * error message.
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
