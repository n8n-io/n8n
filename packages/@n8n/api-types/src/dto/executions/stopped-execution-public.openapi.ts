import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

import { executionFieldDocs } from './execution-public.openapi';

export const stoppedExecutionFieldDocs = {
	mode: executionFieldDocs.mode,
	// Not `alsoNullable` like the shared docs: this endpoint always answers with a date.
	startedAt: {
		format: 'date-time',
		description: 'The time at which the execution started.',
	},
	stoppedAt: {
		format: 'date-time',
		description: 'The time at which the execution stopped. Absent when no stop time was recorded.',
	},
	finished: { ...executionFieldDocs.finished, example: false },
	status: { ...executionFieldDocs.status, example: 'canceled' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const stoppedCountOpenApi: ZodOpenAPIMetadata = {
	description: 'The number of executions that were successfully stopped.',
	example: 5,
};
