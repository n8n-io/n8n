import { createResultOk, type Result } from '@n8n/utils/result';
import type { z } from 'zod';

import type { JsonValue } from '../common';

import type {
	executionResponseSchema,
	responseExpectationSchema,
} from './execution-response.schema';

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
export type UndeliverableMessage = Extract<ExecutionResponse, { type: 'undeliverable' }>;

/**
 * The run is over. Always the last response an execution sends.
 *
 * `lastStep` is the step whose settling ended the run. Its `outputs` are set
 * only when the caller expects `runEnd`. They are also `null` when that step
 * was skipped or failed, so a consumer that needs the data has to look further.
 */
export type EndedMessage = Extract<ExecutionResponse, { type: 'ended' }>;

/** A message that a step produced a response */
export type ResponseMessage = Extract<ExecutionResponse, { type: 'response' }>;

/**
 * What kind of a response the caller expects:
 *
 * - `none`: nothing. The run sends no response.
 * - `runEnd`: the `ended` message, with the outputs of the last step.
 * - `stepResponse`: a response from a step. The `ended` message follows without
 *   outputs, so the caller can tell that no step responded.
 */
export type ResponseExpectation = z.infer<typeof responseExpectationSchema>;

export type ResponseExpectationKind = ResponseExpectation['kind'];

/** An emitter that allows the step execution to produce a response */
export interface ResponseEmitter {
	/**
	 * Sends the payload that `build` returns. The emitter calls `build` only
	 * when the caller expects a step response, so a rejected response costs no
	 * serialization. An error that `build` throws is not caught.
	 */
	send(build: () => JsonValue): Result<void, Error>;
}

/** For a step whose responses nobody wants. It never calls `build`. */
export const noopResponseEmitter: ResponseEmitter = Object.freeze({
	send: () => createResultOk(undefined),
});
