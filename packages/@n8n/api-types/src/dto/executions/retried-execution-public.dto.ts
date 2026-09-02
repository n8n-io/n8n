import '../../openapi-extend';
import { z } from 'zod';

import { executionPublicSchema } from './execution-public.dto';
import {
	executionAnnotationVoteOpenApi,
	retriedExecutionAnnotationOpenApi,
	retriedExecutionCustomDataOpenApi,
	retriedExecutionDataOpenApi,
	retriedExecutionIdOpenApi,
	retriedExecutionModeOpenApi,
	retriedExecutionStartedAtOpenApi,
	retriedExecutionWorkflowDataOpenApi,
} from './retried-execution-public.openapi';
import { objectGuardSchema } from '../../schemas/object-guard.schema';
import { Z } from '../../zod-class';

const executionAnnotationPublicSchema = z.object({
	id: z.number(),
	vote: z.string().nullable().openapi(executionAnnotationVoteOpenApi),
	tags: z.array(z.object({ id: z.string(), name: z.string() })),
});

/**
 * Retry answers with its own shape: it drops ten of the fields every other execution response
 * carries, always sends `data`, `workflowData` and `customData`, and is the only one with
 * `annotation`. The entity fields come off `executionPublicSchema` so the `finished` deprecation
 * and the runtime-derived enums stay in one place.
 */
export const retriedExecutionPublicSchema = z.object({
	id: z.string().openapi(retriedExecutionIdOpenApi),
	mode: executionPublicSchema.shape.mode.openapi(retriedExecutionModeOpenApi),
	startedAt: executionPublicSchema.shape.startedAt.openapi(retriedExecutionStartedAtOpenApi),
	workflowId: executionPublicSchema.shape.workflowId,
	finished: executionPublicSchema.shape.finished,
	retryOf: executionPublicSchema.shape.retryOf,
	status: executionPublicSchema.shape.status,
	// `IRun.waitTill` is `Date | null | undefined`, and the response drops the key when it is
	// undefined instead of sending null.
	waitTill: executionPublicSchema.shape.waitTill.optional(),
	data: objectGuardSchema<Record<string, unknown>>().openapi(retriedExecutionDataOpenApi),
	workflowData: objectGuardSchema<Record<string, unknown>>().openapi(
		retriedExecutionWorkflowDataOpenApi,
	),
	customData: z.record(z.string()).openapi(retriedExecutionCustomDataOpenApi),
	annotation: executionAnnotationPublicSchema.optional().openapi(retriedExecutionAnnotationOpenApi),
	storedAt: executionPublicSchema.shape.storedAt,
});

export class RetriedExecutionPublicDto extends Z.class(retriedExecutionPublicSchema.shape) {}
