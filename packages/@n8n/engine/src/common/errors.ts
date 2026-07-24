/**
 * Thrown when the engine reaches a code path that isn't implemented yet.
 *
 * The engine deliberately avoids `n8n-workflow`/`@n8n/core`, so we can't use
 * n8n's shared error classes here. TODO(CAT-3799): consolidate the engine's
 * local error types into a shared, dependency-light lib when we extract common
 * code.
 */
export class UnimplementedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UnimplementedError';
	}
}
