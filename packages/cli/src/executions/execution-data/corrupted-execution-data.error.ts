import { UnexpectedError } from 'n8n-workflow';

import type { ExecutionRef } from './types';

/**
 * Thrown when execution data read from the filesystem store
 * cannot be parsed as valid JSON.
 */
export class CorruptedExecutionDataError extends UnexpectedError {
	constructor(ref: ExecutionRef, cause: unknown) {
		super('Found corrupted execution data', { extra: { ...ref }, cause });
	}
}
