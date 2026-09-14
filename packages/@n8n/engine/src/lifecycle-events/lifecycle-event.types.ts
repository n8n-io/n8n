import type { z } from 'zod';

import type { lifecycleEventSchema } from './lifecycle-event.schema';

/**
 * Lifecycle events the data plane announces to its host as they happen.
 *
 * A freshness signal, not a replication stream: delivery is at-most-once, and a
 * consumer that needs certainty re-queries the data plane. Silence is not
 * evidence that a step did not run.
 */
export type LifecycleEvent = z.infer<typeof lifecycleEventSchema>;

/**
 * Ships a batch of events to the host. Rejecting drops the batch, so this cannot
 * apply back pressure.
 *
 * The signal aborts once the engine stops waiting. Pass it to the request the
 * callback makes, so an abandoned batch cancels it.
 */
export type LifecycleEventCallback = (
	events: LifecycleEvent[],
	signal: AbortSignal,
) => Promise<void>;
