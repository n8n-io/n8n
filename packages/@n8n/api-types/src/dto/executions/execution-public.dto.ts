import '../../openapi-extend';
import { z } from 'zod';

import {
	customDataOpenApi,
	dataOpenApi,
	deletedExecutionIdOpenApi,
	executionFieldDocs,
	tracingContextOpenApi,
	workflowDataOpenApi,
} from './execution-public.openapi';
import { Z } from '../../zod-class';

// Deliberately loose: `replaceCircularReferences` can leave the string '[Circular Reference]' at
// any depth, so a stricter schema would answer 500 on a valid payload.
const anyObjectSchema = z.custom<Record<string, unknown>>(
	(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
	{ message: 'Must be an object' },
);

const nullableObjectSchema = z.custom<Record<string, unknown> | null>(
	(value) => value === null || (typeof value === 'object' && !Array.isArray(value)),
	{ message: 'Must be an object or null' },
);

// `mode`, `status` and `storedAt` are unconstrained varchar columns, so they publish an enum for
// readers but validate as strings. A historical row may hold a value outside the documented set.
const executionBaseShape = {
	finished: z.boolean().openapi(executionFieldDocs.finished),
	mode: z.string().openapi(executionFieldDocs.mode),
	retryOf: z.string().nullable().openapi(executionFieldDocs.retryOf),
	retrySuccessId: z.string().nullable().openapi(executionFieldDocs.retrySuccessId),
	status: z.string().openapi(executionFieldDocs.status),
	createdAt: z.string().openapi(executionFieldDocs.createdAt),
	startedAt: z.string().nullable().openapi(executionFieldDocs.startedAt),
	stoppedAt: z.string().nullable().openapi(executionFieldDocs.stoppedAt),
	deletedAt: z.string().nullable().openapi(executionFieldDocs.deletedAt),
	workflowId: z.string().openapi(executionFieldDocs.workflowId),
	waitTill: z.string().nullable().openapi(executionFieldDocs.waitTill),
	storedAt: z.string().openapi(executionFieldDocs.storedAt),
	tracingContext: nullableObjectSchema.openapi(tracingContextOpenApi),
	deduplicationKey: z.string().nullable().openapi(executionFieldDocs.deduplicationKey),
	jsonSizeBytes: z.number().openapi(executionFieldDocs.jsonSizeBytes),
	binaryDataSizeBytes: z.number().openapi(executionFieldDocs.binaryDataSizeBytes),
	workflowVersionId: z.string().nullable().openapi(executionFieldDocs.workflowVersionId),
	usedPrivateCredentials: z.boolean().openapi(executionFieldDocs.usedPrivateCredentials),
};

export const executionPublicSchema = z.object({
	id: z.string().openapi(executionFieldDocs.id),
	...executionBaseShape,
	data: anyObjectSchema.optional().openapi(dataOpenApi),
	customData: z.record(z.string()).optional().openapi(customDataOpenApi),
	workflowData: anyObjectSchema.optional().openapi(workflowDataOpenApi),
	dataTooLargeToDisplay: z.boolean().optional().openapi(executionFieldDocs.dataTooLargeToDisplay),
});

export class ExecutionPublicDto extends Z.class(executionPublicSchema.shape) {}

// `id` is a number here and a string everywhere else. The legacy path parameter was declared
// `type: number`, so the validator coerced it. Reproduced deliberately.
export const deletedExecutionPublicSchema = z.object({
	id: z.number().openapi(deletedExecutionIdOpenApi),
	...executionBaseShape,
});

export class DeletedExecutionPublicDto extends Z.class(deletedExecutionPublicSchema.shape) {}
