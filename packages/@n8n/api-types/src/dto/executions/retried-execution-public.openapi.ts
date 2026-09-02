import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

import {
	customDataOpenApi,
	dataOpenApi,
	executionFieldDocs,
	workflowDataOpenApi,
} from './execution-public.openapi';
import { alsoNullable } from '../openapi-nullable';

export const retriedExecutionIdOpenApi: ZodOpenAPIMetadata = {
	description: 'ID of the new execution that the retry started.',
	example: '1001',
};

export const retriedExecutionModeOpenApi: ZodOpenAPIMetadata = {
	...executionFieldDocs.mode,
	example: 'retry',
};

export const retriedExecutionStartedAtOpenApi: ZodOpenAPIMetadata = {
	...executionFieldDocs.startedAt,
	description: 'The time at which the new execution started.',
};

export const retriedExecutionDataOpenApi: ZodOpenAPIMetadata = {
	...dataOpenApi,
	description: 'Run data of the new execution.',
};

export const retriedExecutionWorkflowDataOpenApi: ZodOpenAPIMetadata = {
	...workflowDataOpenApi,
	description:
		'The workflow as it was saved when the original execution ran. `loadWorkflow` changes which ' +
		'workflow the retry runs, not what this field reports.',
};

export const retriedExecutionCustomDataOpenApi: ZodOpenAPIMetadata = {
	...customDataOpenApi,
	description: 'Execution metadata carried over from the original execution.',
};

export const retriedExecutionAnnotationOpenApi: ZodOpenAPIMetadata = {
	description: 'Annotation on the original execution. Absent when it carries none.',
};

export const executionAnnotationVoteOpenApi: ZodOpenAPIMetadata = alsoNullable({
	// `AnnotationVote` is a bare union type with no runtime list to derive from.
	enum: ['up', 'down'],
	description: 'Vote left on the original execution.',
});

export const loadWorkflowOpenApi: ZodOpenAPIMetadata = {
	description:
		'Whether to load the currently saved workflow to execute instead of the one saved at the ' +
		'time of the execution. If set to true, it will retry with the latest version of the workflow.',
};
