import { z } from 'zod';

import type { JsonValue } from '../common';

/** Cap on one batch, so a sender can never build a body the receiver rejects. */
export const MAX_LIFECYCLE_EVENTS_PER_BATCH = 500;

/**
 * Cap on the bytes one batch puts on the wire. The count cap alone cannot
 * bound a body, because a `step:completed` event carries the step's outputs.
 *
 * The publisher enforces both byte caps when it cuts a batch. This schema does
 * not: the receiver has already parsed the body, and measuring it again would
 * serialize every output a second time. The receiver's body size limit is the
 * backstop, so keep it above this cap.
 */
export const MAX_LIFECYCLE_EVENT_BATCH_BYTES = 4 * 1024 * 1024;

/**
 * Cap on the serialized outputs one `step:completed` event may carry. Past it
 * the publisher ships the event without `outputs`, so one large step cannot
 * fill a batch on its own or exceed the batch cap by itself.
 */
export const MAX_STEP_COMPLETED_OUTPUTS_BYTES = 1024 * 1024;

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
		 *
		 * Absent when the outputs were over `MAX_STEP_COMPLETED_OUTPUTS_BYTES`. The
		 * step still completed; a consumer that needs the outputs must read them
		 * from the data plane.
		 */
		outputs: z.array(z.custom<JsonValue>()).optional(),
	}),
	z.object({ type: z.literal('step:failed'), ...stepFields }),
]);

/** Body of the host's lifecycle event endpoint. */
export const lifecycleEventBatchSchema = z.object({
	events: z.array(lifecycleEventSchema).min(1).max(MAX_LIFECYCLE_EVENTS_PER_BATCH),
});

export type LifecycleEventBatch = z.infer<typeof lifecycleEventBatchSchema>;
