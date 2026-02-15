import { UnexpectedError } from 'n8n-workflow';

import type { ExecutionRef } from './types';

/**
 * Thrown when the filesystem store fails to persist execution data,
 * e.g. due to permission issues or disk space.
 */
export class ExecutionDataWriteError extends UnexpectedError {
	constructor(ref: ExecutionRef, cause: unknown) {
		super('Failed to write execution data', { extra: { ...ref }, cause });
	}
}
