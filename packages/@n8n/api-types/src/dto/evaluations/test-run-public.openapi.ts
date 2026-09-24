import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

import { alsoNullable } from '../openapi-nullable';

export const testRunFieldDocs = {
	id: { example: '9f8e7d6c5b4a3210' },
	metrics: alsoNullable({
		type: 'object',
		additionalProperties: true,
		description: "Aggregated metrics collected across the run's test cases.",
	}),
	errorDetails: alsoNullable({ type: 'object', additionalProperties: true }),
	finalResult: {
		description: 'Overall result of the run, derived from its test cases once completed.',
	},
	testCaseCount: { example: 42 },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const testRunListFieldDocs = {
	nextCursor: {
		description:
			'Paginate through test runs by setting the cursor parameter to the nextCursor attribute ' +
			'returned by a previous request. Default value fetches the first "page" of the collection.',
		example: 'MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const listTestRunsQueryFieldDocs = {
	status: { description: 'Status to filter the test runs by.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const testCaseExecutionFieldDocs = {
	id: { example: '1a2b3c4d5e6f7080' },
	metrics: alsoNullable({
		type: 'object',
		additionalProperties: true,
		description: 'Metrics produced by this test case.',
	}),
	errorDetails: alsoNullable({ type: 'object', additionalProperties: true }),
	inputs: alsoNullable({
		type: 'object',
		additionalProperties: true,
		description: 'Input data for this test case.',
	}),
	outputs: alsoNullable({
		type: 'object',
		additionalProperties: true,
		description: 'Output data produced by this test case.',
	}),
	executionId: { description: 'ID of the underlying workflow execution, if still retained.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const testCaseExecutionListFieldDocs = {
	nextCursor: {
		description:
			'Paginate through test cases by setting the cursor parameter to the nextCursor attribute ' +
			'returned by a previous request. Default value fetches the first "page" of the collection.',
		example: 'MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
