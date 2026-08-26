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

const anyObjectSchema = z.custom<Record<string, unknown>>(
	(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
	{ message: 'Must be an object' },
);

const tracingContextSchema = z
	.object({ traceparent: z.string(), tracestate: z.string().optional() })
	.nullable();

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
	tracingContext: tracingContextSchema.openapi(tracingContextOpenApi),
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

export const deletedExecutionPublicSchema = z.object({
	id: z.number().openapi(deletedExecutionIdOpenApi),
	...executionBaseShape,
});

export class DeletedExecutionPublicDto extends Z.class(deletedExecutionPublicSchema.shape) {}

// The list item is much smaller than the single-execution response. Key order reaches both the
// response body and the generated spec, so it mirrors what the endpoint already returns.
export const executionListItemPublicSchema = executionPublicSchema
	.pick({
		id: true,
		finished: true,
		mode: true,
		retryOf: true,
		retrySuccessId: true,
		status: true,
		startedAt: true,
		stoppedAt: true,
		workflowId: true,
		waitTill: true,
	})
	.extend({
		storedAt: executionPublicSchema.shape.storedAt.optional(),
		jsonSizeBytes: executionPublicSchema.shape.jsonSizeBytes.optional(),
		workflowVersionId: executionPublicSchema.shape.workflowVersionId.optional(),
		data: executionPublicSchema.shape.data,
		workflowData: executionPublicSchema.shape.workflowData,
		customData: executionPublicSchema.shape.customData,
	});

export class ExecutionListPublicDto extends Z.class({
	data: z.array(executionListItemPublicSchema),
	nextCursor: z.string().nullable(),
}) {}
