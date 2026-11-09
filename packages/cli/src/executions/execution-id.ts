import { UUID_V7_PATTERN } from '@n8n/constants';
import { v7 as uuidv7 } from 'uuid';

/** Tagged so a v1 id cannot reach a function that only handles v2 executions. */
export type ExecutionIdV2 = string & { readonly __brand: 'ExecutionIdV2' };

/** A v1 id is numeric and a v2 id is a UUID, so the shape alone picks the backend. */
export const isExecutionIdV2 = (id: string): id is ExecutionIdV2 => UUID_V7_PATTERN.test(id);

/** The v1 execution id column is a 32-bit integer (`SERIAL` on Postgres). */
const MAX_EXECUTION_ID_V1 = 2 ** 31 - 1;

/** Only a number that fits the v1 id column can name a row, so a larger one is refused. */
export const isExecutionIdV1 = (id: string): boolean =>
	/^\d+$/.test(id) && Number(id) <= MAX_EXECUTION_ID_V1;

/**
 * Mints an id for a run the control plane hands to the engine.
 *
 * The engine validates this shape on the wire and rejects anything else, so the
 * format is a contract, not a reason to import the engine's generator here.
 */
export const createExecutionIdV2 = (): ExecutionIdV2 => uuidv7() as ExecutionIdV2;
