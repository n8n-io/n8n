import '../../openapi-extend';

import { z } from 'zod';

import {
	listTestRunsQueryFieldDocs,
	testCaseExecutionFieldDocs,
	testCaseExecutionListFieldDocs,
	testRunFieldDocs,
	testRunListFieldDocs,
} from './test-run-public.openapi';
import { nullableObjectGuardSchema } from '../../schemas/object-guard.schema';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const testRunStatusSchema = z.enum(['new', 'running', 'completed', 'error', 'cancelled']);
export type TestRunStatusPublic = z.infer<typeof testRunStatusSchema>;

export const testRunFinalResultSchema = z.enum(['success', 'error', 'warning']);

export const testRunSummaryPublicSchema = z.object({
	id: z.string().openapi(testRunFieldDocs.id),
	status: testRunStatusSchema,
	runAt: z.string().datetime().nullable(),
	completedAt: z.string().datetime().nullable(),
	metrics: nullableObjectGuardSchema<Record<string, number | boolean>>().openapi(
		testRunFieldDocs.metrics,
	),
	errorCode: z.string().nullable(),
	errorDetails: nullableObjectGuardSchema<Record<string, unknown>>().openapi(
		testRunFieldDocs.errorDetails,
	),
	finalResult: testRunFinalResultSchema.nullable().openapi(testRunFieldDocs.finalResult),
	testCaseCount: z.number().int().openapi(testRunFieldDocs.testCaseCount),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export type TestRunSummaryPublic = z.infer<typeof testRunSummaryPublicSchema>;

export class TestRunSummaryPublicDto extends Z.class(testRunSummaryPublicSchema.shape) {}

export class TestRunListPublicDto extends Z.class({
	data: z.array(testRunSummaryPublicSchema),
	nextCursor: z.string().nullable().openapi(testRunListFieldDocs.nextCursor),
}) {}

export class ListTestRunsQueryPublicDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
	status: testRunStatusSchema.optional().openapi(listTestRunsQueryFieldDocs.status),
}) {}

export class CreatedTestRunPublicDto extends Z.class({
	id: z.string().openapi(testRunFieldDocs.id),
	status: testRunStatusSchema,
	createdAt: z.string().datetime(),
}) {}

export const testCaseExecutionStatusSchema = z.enum([
	'new',
	'running',
	'evaluation_running',
	'success',
	'error',
	'warning',
	'cancelled',
]);
export type TestCaseExecutionStatusPublic = z.infer<typeof testCaseExecutionStatusSchema>;

export const testCaseExecutionPublicSchema = z.object({
	id: z.string().openapi(testCaseExecutionFieldDocs.id),
	status: testCaseExecutionStatusSchema,
	runAt: z.string().datetime().nullable(),
	completedAt: z.string().datetime().nullable(),
	metrics: nullableObjectGuardSchema<Record<string, number | boolean>>().openapi(
		testCaseExecutionFieldDocs.metrics,
	),
	errorCode: z.string().nullable(),
	errorDetails: nullableObjectGuardSchema<Record<string, unknown>>().openapi(
		testCaseExecutionFieldDocs.errorDetails,
	),
	inputs: nullableObjectGuardSchema<Record<string, unknown>>().openapi(
		testCaseExecutionFieldDocs.inputs,
	),
	outputs: nullableObjectGuardSchema<Record<string, unknown>>().openapi(
		testCaseExecutionFieldDocs.outputs,
	),
	executionId: z.number().int().nullable().openapi(testCaseExecutionFieldDocs.executionId),
});

export type TestCaseExecutionPublic = z.infer<typeof testCaseExecutionPublicSchema>;

export class TestCaseExecutionPublicDto extends Z.class(testCaseExecutionPublicSchema.shape) {}

export class TestCaseExecutionListPublicDto extends Z.class({
	data: z.array(testCaseExecutionPublicSchema),
	nextCursor: z.string().nullable().openapi(testCaseExecutionListFieldDocs.nextCursor),
}) {}

export class ListTestCasesQueryPublicDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
