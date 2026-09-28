import { UnexpectedError } from 'n8n-workflow';

import type { ExecutionRef } from './types';

/**
 * Thrown when a merge needs the stored run data but the bundle read back does not
 * carry it as a string. Reaching this means the read was narrowed to the workflow
 * snapshot for an update that has to carry the run data over, or the `data` column
 * holds something other than a serialized bundle.
 */
export class UnreadableRunDataError extends UnexpectedError {
	constructor(ref: ExecutionRef) {
		super('Execution data bundle carries no readable run data', { extra: { ...ref } });
	}
}
