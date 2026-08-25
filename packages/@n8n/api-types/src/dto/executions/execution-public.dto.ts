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

// Execution payloads carry whatever the run produced, so the value space is open: arbitrary node
// output, error objects, binary references, and — because `replaceCircularReferences` rewrites any
// repeated object — the literal string '[Circular Reference]' at any depth. Validate the container
// only. A stricter schema would answer 500 on a payload we never saw locally.
const anyObjectSchema = z.custom<Record<string, unknown>>(
	(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
	{ message: 'Must be an object' },
);

const nullableObjectSchema = z.custom<Record<string, unknown> | null>(
	(value) => value === null || (typeof value === 'object' && !Array.isArray(value)),
	{ message: 'Must be an object or null' },
);

// `mode`, `status` and `storedAt` are varchar columns with no database constraint, so a historical
// row can hold a value outside the documented set. The enum is published for readers; the schema
// stays a plain string so an unexpected value does not break the response.
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

// The delete response reports `id` as a number. The legacy path parameter is declared
// `type: number`, so express-openapi-validator coerced it and the handler spread the coerced value
// over the entity. Reproduced deliberately — see API-205.
export const deletedExecutionPublicSchema = z.object({
	id: z.number().openapi(deletedExecutionIdOpenApi),
	...executionBaseShape,
});

export class DeletedExecutionPublicDto extends Z.class(deletedExecutionPublicSchema.shape) {}
