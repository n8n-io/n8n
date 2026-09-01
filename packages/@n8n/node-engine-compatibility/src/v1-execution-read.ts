/**
 * Turns an engine v2 execution back into the v1 `IRunExecutionData` the editor
 * renders. Read path only. `toV1RunData` in `./v1-adapters` serves one step's
 * expression context and trims loops to the active pass; this reports every
 * iteration.
 */

import type { StepDetail, StepError, StepStatus, WorkflowGraph } from '@n8n/engine';
import type {
	ExecutionError,
	ExecutionStatus,
	IRunData,
	ISourceData,
	ITaskData,
} from 'n8n-workflow';
import { createRunExecutionData, WorkflowOperationError } from 'n8n-workflow';

import { MAIN_CONNECTION_TYPE } from './constants';
import { fromStepInputs } from './io';
import { toV1Sources } from './v1-adapters';

/**
 * `queued` and `skipped` get no entry: v1 reports a node that did not run by
 * having no `runData` for it. An entry would make the canvas claim it ran.
 */
const TASK_STATUS_V1 = new Map<StepStatus, ExecutionStatus>([
	['completed', 'success'],
	['failed', 'error'],
	['running', 'running'],
	['cancelled', 'canceled'],
]);

interface StepRun {
	step: StepDetail;
	nodeName: string;
	taskData: ITaskData;
}

export function toV1RunExecutionData(graph: WorkflowGraph, steps: StepDetail[]) {
	const runs = toStepRuns(graph, steps);
	const failed = runs.find((run) => run.step.status === 'failed');

	return createRunExecutionData({
		resultData: {
			runData: toRunData(runs),
			error: failed?.taskData.error,
			lastNodeExecuted: (failed ?? runs.at(-1))?.nodeName,
		},
		// A v2 execution has no resume token. The factory otherwise mints one.
		resumeToken: '',
	});
}

/** @param steps Oldest first, as the data plane orders them. Position is the run order. */
function toStepRuns(graph: WorkflowGraph, steps: StepDetail[]): StepRun[] {
	const namesById = new Map(graph.nodes.map((node) => [node.id, node.name]));
	const sourcesByNodeId = toV1Sources(graph);

	const runs: StepRun[] = [];
	for (const step of steps) {
		const executionStatus = TASK_STATUS_V1.get(step.status);
		if (executionStatus === undefined) continue;

		const nodeName = namesById.get(step.nodeId);
		// v1 keys run data by node name only.
		if (nodeName === undefined) continue;

		runs.push({
			step,
			nodeName,
			taskData: toTaskData(step, executionStatus, runs.length, sourcesByNodeId.get(step.nodeId)),
		});
	}

	return runs;
}

function toTaskData(
	step: StepDetail,
	executionStatus: ExecutionStatus,
	executionIndex: number,
	source: Array<ISourceData | null> | undefined,
): ITaskData {
	// TODO(CAT-4234): report real run timing. Row timestamps include queue time.
	const startTime = Date.parse(step.createdAt);

	return {
		startTime,
		executionTime: Math.max(0, Date.parse(step.updatedAt) - startTime),
		executionIndex,
		// Never `undefined`: the editor's log tree reads `source` unguarded.
		source: source ?? [],
		executionStatus,
		// Every output slot is `main`: no other connection type exists here.
		...(step.outputs === null
			? {}
			: { data: { [MAIN_CONNECTION_TYPE]: fromStepInputs(step.outputs) } }),
		...(step.error === null ? {} : { error: toV1Error(step.error) }),
	};
}

/** v1 reads whatever `ITaskData[]` entry it finds, so a hole would crash it. */
function toRunData(runs: StepRun[]): IRunData {
	const runData: IRunData = {};

	for (const { step, nodeName, taskData } of runs) {
		const tasks = (runData[nodeName] ??= []);
		while (tasks.length < step.iteration) {
			tasks.push(emptyRun(tasks.length));
		}
		tasks[step.iteration] = taskData;
	}

	return runData;
}

/** A pass the node never recorded. One empty slot: zero slots reads as no data. */
function emptyRun(executionIndex: number): ITaskData {
	return {
		startTime: 0,
		executionTime: 0,
		executionIndex,
		source: [],
		data: { [MAIN_CONNECTION_TYPE]: [[]] },
	};
}

/**
 * The data plane holds nothing v1-shaped, so this rebuilds the minimum. Only
 * `name` is worth restoring: `ExecutionBaseError.toJSON` drops `stack`.
 */
function toV1Error(error: StepError): ExecutionError {
	const v1Error = new WorkflowOperationError(error.message);
	v1Error.name = error.name;
	return v1Error;
}
