import { UserError } from 'n8n-workflow';

/**
 * Raised when a compare-and-swap overwrite lost to a concurrent one. The
 * caller's bytes were discarded rather than silently overwriting whatever landed
 * first, so it can decide whether to retry.
 */
export class ProjectFileConcurrentModificationError extends UserError {
	constructor(name: string) {
		super(`The file '${name}' was modified concurrently. Try again.`, { level: 'warning' });
	}
}
