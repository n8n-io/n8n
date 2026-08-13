import { UnexpectedError } from 'n8n-workflow';

import type { ExecutionRef } from './types';

/**
 * Thrown when an update targets an execution whose data bundle is
 * missing from its backing store — the entity exists, but the data
 * needed to merge a partial update is gone.
 */
export class MissingExecutionDataError extends UnexpectedError {
	constructor(ref: ExecutionRef) {
		super('Missing execution data', { extra: { ...ref } });
	}
}
