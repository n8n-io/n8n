import { UnexpectedError } from 'n8n-workflow';

import type { ExecutionRef } from './types';

/**
 * Thrown when an update targets an fs-mode execution whose bundle is
 * absent on disk — the entity exists, but the data needed to merge a
 * partial update with the existing bundle is gone.
 */
export class MissingExecutionDataError extends UnexpectedError {
	constructor(ref: ExecutionRef) {
		super('Missing execution data on filesystem', { extra: { ...ref } });
	}
}
