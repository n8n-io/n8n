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
