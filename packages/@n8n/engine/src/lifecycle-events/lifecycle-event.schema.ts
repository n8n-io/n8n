import { z } from 'zod';

import type { JsonValue } from '../common';

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

/**
 * The error a failed step recorded, as persisted. `details` is opaque to the
 * engine, like a step's outputs, so only its presence is validated.
 */
const stepErrorSchema = z.object({
	name: z.string(),
	message: z.string(),
	stack: z.string().optional(),
	details: z.custom<JsonValue>().optional(),
});

/** The one definition of an event's shape. `LifecycleEvent` is inferred from it. */
export const lifecycleEventSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('execution:started'),
		...executionFields,
		// Must match `ExecutionMode`.
		mode: z.enum(['production', 'manual']),
		/** The host's finer execution mode. */
		hostMode: z.string().min(1),
	}),
	z.object({ type: z.literal('execution:completed'), ...executionFields }),
	z.object({ type: z.literal('execution:failed'), ...executionFields }),
	z.object({ type: z.literal('execution:cancelled'), ...executionFields }),
	z.object({ type: z.literal('step:started'), ...stepFields }),
	z.object({
		type: z.literal('step:completed'),
		...stepFields,
		/**
		 * The slots the step produced, exactly as persisted. The one payload that
		 * carries data rather than identifiers, because it saves the host a read
		 * where freshness matters most. A slot's contents are opaque and can be
		 * large, so only the list is validated: walking every value cost the host
		 * more CPU than running the step did.
		 */
		outputs: z.array(z.custom<JsonValue>()),
	}),
	z.object({
		type: z.literal('step:failed'),
		...stepFields,
		/**
		 * Rides along for the same reason outputs do: the host renders the failure
		 * at once, with no read. A sender over its size limit may drop `details`,
		 * then `stack`; the message always arrives.
		 */
		error: stepErrorSchema,
	}),
]);

/** Body of the host's lifecycle event endpoint. */
export const lifecycleEventBatchSchema = z.object({
	events: z.array(lifecycleEventSchema).min(1).max(MAX_LIFECYCLE_EVENTS_PER_BATCH),
});

export type LifecycleEventBatch = z.infer<typeof lifecycleEventBatchSchema>;
