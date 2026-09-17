import type { z } from 'zod';

import type { JsonValue } from '../common';
import type { executionResponseSchema } from './execution-response.schema';

/**
 * A response an execution produces for whoever started it.
 *
 * Distinct from a lifecycle event, which reports that something happened. This
 * is the answer itself, and something is waiting for it.
 *
 * Inferred from the schema, so the wire shape and the type cannot drift.
 */
export type ExecutionResponse = z.infer<typeof executionResponseSchema>;

/** The intended response could not be produced or carried. */
export type FailureMessage = Extract<ExecutionResponse, { type: 'failure' }>;

/**
 * The run is over. Always the last response an execution sends.
 *
 * `lastStep` is the step the run answers from: the step that settled last with
 * an outcome of its own, which is its outputs or its error. A skip carries
 * neither, so it is never reported, and a consumer never has to look a second
 * step up.
 */
export type EndedMessage = Extract<ExecutionResponse, { type: 'ended' }>;

/** The one answer the caller waits for, produced while the run is still going. */
export type ResponseMessage = Extract<ExecutionResponse, { type: 'response' }>;

/**
 * One step's view of the channel. The channel fills in the execution id, so a
 * step executor carries no routing state.
 */
export interface ResponseEmitter {
	send(payload: JsonValue): void;
}

/** For a step whose responses nobody wants. */
export const noopResponseEmitter: ResponseEmitter = Object.freeze({ send: () => {} });
