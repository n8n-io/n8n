import { z } from 'zod';

import { jsonValueSchema } from '../common';
// Direct path, not the `../execution` barrel: the barrel pulls in the handlers,
// which import this module back.
import { SETTLED_STEP_STATUSES } from '../execution/execution.types';

/**
 * The one definition of a response's shape. A frame can cross a process
 * boundary, so it is parsed against this before a handler sees it.
 */
export const executionResponseSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('failure'),
		executionId: z.string().min(1),
		error: z.object({
			code: z.string().min(1),
			message: z.string().min(1),
		}),
	}),
	z.object({
		type: z.literal('response'),
		executionId: z.string().min(1),
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
		status: z.enum(['completed', 'failed']),
		lastStep: z.object({
			nodeId: z.string().min(1),
			nodeName: z.string().min(1),
			status: z.enum(SETTLED_STEP_STATUSES),
			outputs: z.array(jsonValueSchema).nullable(),
			error: z.object({ name: z.string(), message: z.string() }).optional(),
		}),
	}),
]);
