import { isRecord } from '@n8n/utils/is-record';
import type {
	IConnections,
	IDataObject,
	INode,
	INodeParameters,
	IPinData,
	IRunExecutionData,
	ITaskDataConnections,
	ITaskDataConnectionsSource,
	IWorkflowSettings,
} from 'n8n-workflow';
import { z } from 'zod/v4';

import { CODE_TASK_CONTRACT_VERSION } from './constants';
import { CODE_EXECUTION_MODES, WORKFLOW_EXECUTE_MODES } from './execution-modes';

/**
 * An object of an n8n type. Only the top level is checked, because a full
 * check costs too much on large execution data.
 */
const objectOf = <T>() => z.custom<T>(isRecord, { error: 'Expected an object' });

const nonNegativeInt = z.number().int().nonnegative();

const workflowSchema = z.object({
	id: z.string().optional(),
	name: z.string().optional(),
	active: z.boolean(),
	nodes: z.array(objectOf<INode>()),
	connections: objectOf<IConnections>(),
	settings: objectOf<IWorkflowSettings>().optional(),
	staticData: objectOf<IDataObject>().optional(),
	pinData: objectOf<IPinData>().optional(),
});

/** The values of the additional data of the execution that the built-ins use. */
const additionalDataSchema = z.object({
	executionId: z.string().optional(),
	restartExecutionId: z.string().optional(),
	restApiUrl: z.string(),
	instanceBaseUrl: z.string(),
	formWaitingBaseUrl: z.string(),
	webhookBaseUrl: z.string(),
	webhookWaitingBaseUrl: z.string(),
	webhookTestBaseUrl: z.string(),
	currentNodeParameters: objectOf<INodeParameters>().optional(),
	executionTimeoutTimestamp: z.number().optional(),
	userId: z.string().optional(),
	variables: objectOf<IDataObject>(),
	evaluationRunId: z.string().optional(),
});

const envProviderStateSchema = z.object({
	isProcessAvailable: z.boolean(),
	isEnvAccessBlocked: z.boolean(),
	env: z.record(z.string(), z.string()),
});

/** The execution data that the task can read, for example with `$input` or `$('Node')`. */
const taskDataSchema = z.object({
	workflow: workflowSchema,
	inputData: objectOf<ITaskDataConnections>(),
	connectionInputSource: objectOf<ITaskDataConnectionsSource>().nullable(),
	node: objectOf<INode>(),
	runExecutionData: objectOf<IRunExecutionData>(),
	runIndex: nonNegativeInt,
	itemIndex: nonNegativeInt,
	activeNodeName: z.string(),
	siblingParameters: objectOf<INodeParameters>(),
	mode: z.enum(WORKFLOW_EXECUTE_MODES),
	envProviderState: envProviderStateSchema,
	defaultReturnRunIndex: z.number().int(),
	selfData: objectOf<IDataObject>(),
	contextNodeName: z.string(),
	additionalData: additionalDataSchema,
});

/** The part of the input items that the task runs on. */
const chunkSchema = z.object({
	startIndex: nonNegativeInt,
	count: nonNegativeInt,
});

/** The content of the task input file (`task.json`). n8n writes it, the runtime reads it. */
export const codeTaskInputSchema = z
	.object({
		version: z.literal(CODE_TASK_CONTRACT_VERSION),
		taskId: z.string().min(1),
		language: z.literal('javascript'),
		code: z.string().min(1),
		nodeMode: z.enum(CODE_EXECUTION_MODES),
		continueOnFail: z.boolean(),
		/** Only for the `runOnceForEachItem` mode. */
		chunk: chunkSchema.optional(),
		/** More globals for the user code, for example `query` of the Code Tool. */
		additionalProperties: z.record(z.string(), z.unknown()).optional(),
		data: taskDataSchema,
	})
	.refine((input) => input.chunk === undefined || input.nodeMode === 'runOnceForEachItem', {
		path: ['chunk'],
		error: 'A chunk is only allowed in the runOnceForEachItem mode',
	});

export type CodeTaskInput = z.infer<typeof codeTaskInputSchema>;
export type CodeTaskData = CodeTaskInput['data'];
export type CodeTaskChunk = z.infer<typeof chunkSchema>;
