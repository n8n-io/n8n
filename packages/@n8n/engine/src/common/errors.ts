/**
 * Thrown when the engine reaches a code path that isn't implemented yet.
 *
 * Local because the engine avoids depending on `n8n-workflow`/`@n8n/core`.
 * TODO(CAT-3798): move the engine's error types to a shared lib.
 */
export class UnimplementedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UnimplementedError';
	}
}

/**
 * Thrown when the engine hits state that shouldn't be reachable — a bug rather
 * than bad input or an unbuilt path.
 */
export class UnexpectedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UnexpectedError';
	}
}
