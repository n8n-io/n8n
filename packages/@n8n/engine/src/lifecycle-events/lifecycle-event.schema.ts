import { z } from 'zod';

import { jsonValueSchema } from '../common';

/**
 * Cap on one batch, shared by the publisher's buffer and this schema, so a
 * flush can never build a body the receiver would reject.
 */
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
	/** The graph node's human-readable name, so a consumer needs no graph lookup. */
	nodeName: z.string().min(1),
	/** Loop iteration this step ran at; `0` for a node outside a loop. */
	iteration: z.number().int().nonnegative(),
	at: z.string().datetime(),
};

/**
 * Wire schema for one lifecycle event, and the single definition of its shape:
 * `LifecycleEvent` is inferred from it, so the emitter's type and the receiver's
 * validation cannot drift.
 */
export const lifecycleEventSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('execution:started'),
		...executionFields,
		// Kept in step with `ExecutionMode` by a type-level assertion in
		// `lifecycle-event.schema.test.ts`.
		mode: z.enum(['production', 'manual']),
	}),
	z.object({ type: z.literal('execution:completed'), ...executionFields }),
	z.object({ type: z.literal('execution:failed'), ...executionFields }),
	z.object({ type: z.literal('step:started'), ...stepFields }),
	z.object({
		type: z.literal('step:completed'),
		...stepFields,
		/**
		 * The slots the step produced, exactly as persisted.
		 *
		 * The one payload that carries data rather than identifiers: the emitting
		 * handler already holds it, and shipping it saves the host a read per step
		 * on the path where freshness matters most. Error detail and execution run
		 * data stay off the wire — those are re-queried.
		 *
		 * Only the slot list is validated. The engine owns exactly one level of
		 * structure, and a slot's contents are step-type-specific and opaque.
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
