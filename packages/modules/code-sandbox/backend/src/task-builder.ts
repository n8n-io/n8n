import type { CodeTaskRequest } from '@n8n/backend-services';
import {
	CODE_TASK_CONTRACT_VERSION,
	parseCodeTaskInput,
	type CodeTaskChunk,
	type CodeTaskInput,
} from '@n8n/code-task-contract';
import { UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import {
	createRunExecutionData,
	type IRunExecutionData,
	type ITaskDataConnections,
} from 'n8n-workflow';

/** The default max input size of the code daemon. */
export const MAX_TASK_INPUT_BYTES = 64 * 1024 * 1024;

/** Drops the execution stack and the waiting data, which the code cannot read, to keep `task.json` small. */
function toTaskRunExecutionData(runExecutionData: IRunExecutionData): IRunExecutionData {
	const { executionData } = runExecutionData;

	return createRunExecutionData({
		startData: runExecutionData.startData,
		resultData: runExecutionData.resultData,
		executionData: executionData
			? {
					contextData: executionData.contextData,
					metadata: executionData.metadata,
					nodeExecutionStack: [],
					waitingExecution: {},
					waitingExecutionSource: null,
				}
			: undefined,
		resumeToken: runExecutionData.resumeToken,
	});
}

function toChunkInputData(
	inputData: ITaskDataConnections,
	{ startIndex, count }: CodeTaskChunk,
): ITaskDataConnections {
	const items = inputData.main?.[0];
	if (!items) return inputData;

	return { ...inputData, main: [items.slice(startIndex, startIndex + count)] };
}

function toTaskData(request: CodeTaskRequest): unknown {
	const { workflow } = request;

	return {
		workflow: {
			id: workflow.id,
			name: workflow.name,
			active: workflow.active,
			nodes: Object.values(workflow.nodes),
			connections: workflow.connectionsBySourceNode,
			settings: workflow.settings,
			staticData: workflow.staticData,
			pinData: workflow.pinData,
		},
		inputData: request.inputData,
		connectionInputSource: request.executeData?.source ?? null,
		node: request.node,
		runExecutionData: toTaskRunExecutionData(request.runExecutionData),
		runIndex: request.runIndex,
		itemIndex: request.itemIndex,
		activeNodeName: request.activeNodeName,
		siblingParameters: request.siblingParameters,
		mode: request.mode,
		envProviderState: request.envProviderState,
		// -1 selects the last run of a node in `$('Node')`
		defaultReturnRunIndex: -1,
		selfData: {},
		contextNodeName: request.activeNodeName,
		additionalData: request.additionalData,
	};
}

/**
 * Builds the content of `task.json` for a JS task. The file holds all the data,
 * because n8n does not yet parse the code to find the data that the code uses.
 */
export function buildTaskInput(taskId: string, request: CodeTaskRequest): Buffer {
	if (request.taskType !== 'javascript') {
		throw new UserError(`The code sandbox cannot run ${request.taskType} code yet`);
	}

	const settings = isRecord(request.settings) ? request.settings : {};
	if (settings.code === '') throw new UserError(`The node "${request.node.name}" has no code`);

	const parsed = parseCodeTaskInput({
		version: CODE_TASK_CONTRACT_VERSION,
		taskId,
		language: 'javascript',
		code: settings.code,
		nodeMode: settings.nodeMode,
		continueOnFail: settings.continueOnFail,
		chunk: settings.chunk,
		additionalProperties: settings.additionalProperties,
		data: toTaskData(request),
	});
	if (!parsed.ok) throw parsed.error;

	const { chunk, data } = parsed.result;
	const input: CodeTaskInput = chunk
		? { ...parsed.result, data: { ...data, inputData: toChunkInputData(data.inputData, chunk) } }
		: parsed.result;

	const tooLarge = () =>
		new UserError(
			`The data of node "${request.node.name}" is too large for the code sandbox. The max is ${MAX_TASK_INPUT_BYTES / 1024 / 1024} MiB.`,
		);

	let content: Buffer;
	try {
		content = Buffer.from(JSON.stringify(input));
	} catch (error) {
		// `JSON.stringify` throws a `RangeError` for a string of more than about 512 MiB
		if (error instanceof RangeError) throw tooLarge();
		throw error;
	}
	if (content.length > MAX_TASK_INPUT_BYTES) throw tooLarge();

	return content;
}
