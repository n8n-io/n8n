import type { z } from 'zod';

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
