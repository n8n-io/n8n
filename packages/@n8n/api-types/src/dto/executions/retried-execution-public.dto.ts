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

export const retriedExecutionPublicSchema = z.object({
	id: z.string().openapi(retriedExecutionIdOpenApi),
	mode: executionPublicSchema.shape.mode.openapi(retriedExecutionModeOpenApi),
	startedAt: executionPublicSchema.shape.startedAt.openapi(retriedExecutionStartedAtOpenApi),
	workflowId: executionPublicSchema.shape.workflowId,
	finished: executionPublicSchema.shape.finished,
	retryOf: executionPublicSchema.shape.retryOf,
	status: executionPublicSchema.shape.status,
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
