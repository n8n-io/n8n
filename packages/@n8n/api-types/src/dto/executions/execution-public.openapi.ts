import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';
import { ExecutionStatusList, WorkflowExecuteModeList } from 'n8n-workflow';

import { alsoNullable } from '../openapi-nullable';

export const executionFieldDocs = {
	id: { example: '1000' },
	finished: {
		example: true,
		deprecated: true,
		description: 'Whether the execution ran to completion. Use `status` instead.',
	},
	mode: {
		enum: [...WorkflowExecuteModeList],
		example: 'manual',
	},
	retryOf: alsoNullable({
		description: 'ID of the execution this one is a retry of.',
	}),
	retrySuccessId: alsoNullable({
		description: 'ID of the retry that succeeded, if this execution failed and a retry did not.',
		example: '2',
	}),
	status: {
		enum: [...ExecutionStatusList],
	},
	createdAt: { format: 'date-time' },
	startedAt: alsoNullable({
		format: 'date-time',
		description: 'Null until the execution leaves the queue and starts running.',
	}),
	stoppedAt: alsoNullable({
		format: 'date-time',
		description: 'The time at which the execution stopped. Null while it has not stopped yet.',
	}),
	deletedAt: alsoNullable({
		format: 'date-time',
		description: 'Always null. Soft-deleted executions are not returned.',
	}),
	workflowId: { example: '1000' },
	waitTill: alsoNullable({
		format: 'date-time',
		description: 'The time at which a waiting execution resumes.',
	}),
	storedAt: {
		enum: ['db', 'fs', 's3', 'az'],
		description: 'Where the execution data is stored.',
	},
	deduplicationKey: alsoNullable({
		description: 'Key used to stop a duplicate execution from being created.',
	}),
	jsonSizeBytes: {
		description: 'Size of the stored execution data in bytes. 0 means unknown.',
		example: 0,
	},
	binaryDataSizeBytes: {
		description: 'Size of the stored binary data in bytes. 0 means unknown.',
		example: 0,
	},
	workflowVersionId: alsoNullable({
		description: 'ID of the workflow version this execution ran.',
	}),
	usedPrivateCredentials: {
		description: 'Whether the execution used credentials that are not shared with the project.',
		example: false,
	},
	dataTooLargeToDisplay: {
		description:
			'Present and true when the execution data was larger than ' +
			'`EXECUTIONS_DATA_MAX_DISPLAY_SIZE`. `data` is then empty and `jsonSizeBytes` holds the ' +
			'real size. Use `ignoreDataSizeLimit` to read it anyway.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const deletedExecutionIdOpenApi: ZodOpenAPIMetadata = {
	description:
		'ID of the deleted execution. This endpoint returns it as a number, where every other ' +
		'execution endpoint returns a string.',
	example: 1000,
};

export const dataOpenApi: ZodOpenAPIMetadata = {
	type: 'object',
	additionalProperties: true,
	description: 'Detailed execution data. Only included when `includeData` is `true`.',
	properties: {
		redactionInfo: {
			type: 'object',
			nullable: true,
			description: 'Present when execution data has been redacted.',
			properties: {
				isRedacted: { type: 'boolean', description: 'Whether the execution data was redacted.' },
				reason: { type: 'string', description: 'The reason for redaction.' },
				canReveal: {
					type: 'boolean',
					description: 'Whether the current user has permission to reveal the redacted data.',
				},
			},
		},
	},
};

export const workflowDataOpenApi: ZodOpenAPIMetadata = {
	type: 'object',
	additionalProperties: true,
	description:
		'The workflow as it was saved when the execution ran. Only included when `includeData` is ' +
		'`true`. Older executions carry more fields than newer ones.',
};

export const customDataOpenApi: ZodOpenAPIMetadata = {
	type: 'object',
	additionalProperties: { type: 'string' },
	description:
		'Execution metadata set by the workflow. Only included when `includeData` is `true`.',
};

export const tracingContextOpenApi: ZodOpenAPIMetadata = {
	description: 'W3C trace context propagated with the execution.',
};
