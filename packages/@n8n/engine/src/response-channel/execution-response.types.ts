import type { z } from 'zod';

import type { executionResponseSchema } from './execution-response.schema';

/**
 * A response that an execution sends to its caller.
 *
 * Unlike a lifecycle event, which reports that something happened, a response
 * provides information that the caller is waiting for.
 *
 * A response can:
 * 1. Notify a trigger node when an execution ends.
 * 2. Send data from a node back to a trigger node.
 *
 * For example, the Respond to Webhook node sends a response back to the
 * Webhook node.
 */
export type ExecutionResponse = z.infer<typeof executionResponseSchema>;

/** The intended response could not be produced or carried. */
export type FailureMessage = Extract<ExecutionResponse, { type: 'failure' }>;

/**
 * The run is over. Always the last response an execution sends.
 *
 * `lastStep` is the step whose settling ended the run. Its `outputs` are `null`
 * when that step was skipped or failed, so a consumer that needs the data has
 * to look further.
 */
export type EndedMessage = Extract<ExecutionResponse, { type: 'ended' }>;
