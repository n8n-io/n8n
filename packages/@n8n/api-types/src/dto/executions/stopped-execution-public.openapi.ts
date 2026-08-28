import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import { ExecutionStatusList, WorkflowExecuteModeList } from 'n8n-workflow';

export const stoppedExecutionFieldDocs = {
	mode: {
		enum: [...WorkflowExecuteModeList],
		example: 'manual',
	},
	startedAt: {
		format: 'date-time',
		description: 'The time at which the execution started.',
	},
	stoppedAt: {
		format: 'date-time',
		description: 'The time at which the execution stopped. Absent when no stop time was recorded.',
	},
	finished: { example: false },
	status: {
		enum: [...ExecutionStatusList],
		example: 'canceled',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const stoppedCountOpenApi: ZodOpenAPIMetadata = {
	description: 'The number of executions that were successfully stopped.',
	example: 5,
};
