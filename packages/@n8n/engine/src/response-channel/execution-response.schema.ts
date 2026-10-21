import { z } from 'zod';

import { jsonValueSchema } from '../common';
// Direct path, not the `../execution` barrel: the barrel pulls in the handlers,
// which import this module back.
import { SETTLED_STEP_STATUSES } from '../execution/execution.types';

/** The response kinds a caller can expect. */
export const RESPONSE_EXPECTATION_KINDS = ['none', 'runEnd', 'stepResponse', 'stream'] as const;

/**
 * What the caller of an execution waits for. The caller sets it at start, and
 * the engine stores it with the execution. `strict`, so a misspelled key fails.
 */
export const responseExpectationSchema = z
	.object({
		kind: z.enum(RESPONSE_EXPECTATION_KINDS),
	})
	.strict();

/**
 * The one definition of a response's shape. A frame can cross a process
 * boundary, so it is parsed against this before a handler sees it.
 */
export const executionResponseSchema = z
	.discriminatedUnion('type', [
		z.object({
			type: z.literal('undeliverable'),
			executionId: z.string().min(1),
			error: z.object({
				code: z.string().min(1),
				message: z.string().min(1),
			}),
		}),
		z.object({
			type: z.literal('response'),
			executionId: z.string().min(1),
			// A missing or undefined payload means an empty response.
			payload: jsonValueSchema.optional(),
		}),
		z.object({
			type: z.literal('chunk'),
			executionId: z.string().min(1),
			payload: jsonValueSchema,
		}),
		z.object({
			type: z.literal('ended'),
			executionId: z.string().min(1),
			workflowId: z.string().min(1),
			status: z.enum(['completed', 'failed', 'cancelled']),
			// `null` for a cancelled run: a cancel ends the run without a step settling.
			lastStep: z
				.object({
					nodeId: z.string().min(1),
					nodeName: z.string().min(1),
					status: z.enum(SETTLED_STEP_STATUSES),
					outputs: z.array(jsonValueSchema).nullable(),
					error: z.object({ name: z.string(), message: z.string() }).optional(),
				})
				.nullable(),
		}),
	])
	// A settled run names the step that ended it, and only a cancelled run has
	// none. The pairing lives here because a discriminated union cannot nest.
	.superRefine((response, ctx) => {
		if (response.type !== 'ended') return;
		if ((response.status === 'cancelled') === (response.lastStep === null)) return;
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['lastStep'],
			message: 'lastStep is null exactly when the run was cancelled',
		});
	});
