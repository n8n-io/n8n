import { z } from 'zod';

import { jsonValueSchema } from '../common';

/**
 * The one definition of a response's shape. A transport can cross a process
 * boundary, so a frame that arrives is parsed against this before a subscriber
 * ever sees it.
 */
export const executionResponseSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('ended'),
		executionId: z.string().min(1),
		workflowId: z.string().min(1),
		status: z.enum(['completed', 'failed']),
		lastStep: z.object({
			nodeId: z.string().min(1),
			nodeName: z.string().min(1),
			// Must match `StepStatus`.
			status: z.enum(['queued', 'running', 'completed', 'failed', 'skipped', 'cancelled']),
			outputs: z.array(jsonValueSchema).nullable(),
		}),
	}),
]);
