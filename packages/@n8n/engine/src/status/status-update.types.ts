import type { z } from 'zod';

import type { statusUpdateSchema } from './status-update.schema';

/**
 * Lifecycle events the data plane announces to its host as they happen.
 *
 * A freshness signal for realtime UI and metrics, not a replication stream: the
 * data plane stays the source of truth, delivery is at-most-once, and a consumer
 * that needs certainty re-queries it. Skipped and cancelled steps announce
 * nothing, so silence is not evidence that a step did not run.
 */
export type StatusUpdate = z.infer<typeof statusUpdateSchema>;

/**
 * Ships a batch of updates to the host. Rejecting reports a failed delivery;
 * the engine logs and drops the batch rather than failing anything, so this
 * cannot be used to apply back pressure.
 *
 * The signal aborts when the send outlives its deadline and the engine stops
 * waiting for it. Pass it to the request the callback makes, so an abandoned
 * batch cancels that request instead of leaving it running.
 */
export type StatusCallback = (updates: StatusUpdate[], signal: AbortSignal) => Promise<void>;
