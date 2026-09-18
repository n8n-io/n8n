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

/**
 * The run is over. Always the last response an execution sends.
 *
 * `lastStep` is the step whose settling ended the run. Its `outputs` are `null`
 * when that step was skipped or failed, so a consumer that needs the data has
 * to look further. The engine reports what ended the run, not what a caller
 * would like to answer with.
 */
export type EndedMessage = Extract<ExecutionResponse, { type: 'ended' }>;
