import { z } from 'zod';

import { jsonValueSchema } from '../common';

/** Cap on one batch, so a sender can never build a body the receiver rejects. */
export const MAX_LIFECYCLE_EVENTS_PER_BATCH = 500;

const executionFields = {
	executionId: z.string().min(1),
	/** Lets a consumer route the event without a round trip. */
	workflowId: z.string().min(1),
	/** When the transition was recorded, ISO-8601. */
	at: z.string().datetime(),
};

const stepFields = {
	executionId: z.string().min(1),
	stepId: z.string().min(1),
	nodeId: z.string().min(1),
	/** Saves a consumer a graph lookup. */
	nodeName: z.string().min(1),
	/** Loop iteration this step ran at; `0` for a node outside a loop. */
	iteration: z.number().int().nonnegative(),
	at: z.string().datetime(),
};

/** The one definition of an event's shape. `LifecycleEvent` is inferred from it. */
export const lifecycleEventSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('execution:started'),
		...executionFields,
		// Must match `ExecutionMode`.
		mode: z.enum(['production', 'manual']),
	}),
	z.object({ type: z.literal('execution:completed'), ...executionFields }),
	z.object({ type: z.literal('execution:failed'), ...executionFields }),
	z.object({ type: z.literal('step:started'), ...stepFields }),
	z.object({
		type: z.literal('step:completed'),
		...stepFields,
		/**
		 * The slots the step produced, exactly as persisted. The one payload that
		 * carries data rather than identifiers, because it saves the host a read
		 * where freshness matters most. A slot's contents are opaque, so only the
		 * list is validated.
		 */
		outputs: z.array(jsonValueSchema),
	}),
	z.object({ type: z.literal('step:failed'), ...stepFields }),
]);

/** Body of the host's lifecycle event endpoint. */
export const lifecycleEventBatchSchema = z.object({
	events: z.array(lifecycleEventSchema).min(1).max(MAX_LIFECYCLE_EVENTS_PER_BATCH),
});

export type LifecycleEventBatch = z.infer<typeof lifecycleEventBatchSchema>;
