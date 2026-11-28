/**
 * Turns an engine v2 execution back into the v1 `IRunExecutionData` the editor
 * renders. Read path only. `toV1RunData` in `./v1-adapters` serves one step's
 * expression context and trims loops to the active pass; this reports every
 * iteration.
 */

import type { StepDetail, StepError, StepSlots, StepStatus, WorkflowGraph } from '@n8n/engine';
import type {
	INodeExecutionData,
	ExecutionError,
	ExecutionStatus,
	IPinData,
	IRunData,
	ISourceData,
	ITaskData,
	ITaskMetadata,
} from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

import { MAIN_CONNECTION_TYPE } from './constants';
import { fromStepInputs } from './io';
import { fromV1ErrorDetails } from './v1-error-details';
import {
	emptyRun,
	linkOutputSources,
	toSourceLineage,
	toSourcesAt,
	type SourceLineage,
} from './v1-run-data';

/**
 * Only a step that ran gets an entry. v1 reports a node that did not run by
 * having no `runData` for it, and an entry would make the canvas claim it ran.
 * `queued` never started and `skipped` was decided against.
 *
 * A `waiting` step gets an entry, because it did run: it started, and then it
 * suspended. Engine v1 does the same. The run data of a waiting v1 execution
 * holds a task for the paused node, with the status `waiting`.
 *
 * That entry carries no outputs. The step produces none until it resumes.
 * Engine v1 puts the node's pass-through data there instead. This read cannot:
 * those slots live in the step's wait declaration, which `StepDetail` does not
 * report.
 *
 * TODO(CAT-2928): a `cancelled` step gets no entry. That is correct for a step
 * that never started, but `cancelPendingSteps` also cancels the waiting steps
 * when an execution ends, and those steps did run. The canvas hides them.
 */
const TASK_STATUS_V1 = new Map<StepStatus, ExecutionStatus>([
	['completed', 'success'],
	['failed', 'error'],
	['running', 'running'],
	['waiting', 'waiting'],
]);

interface StepRun {
	step: StepDetail;
	nodeName: string;
	taskData: ITaskData;
}

/** An execution this one is linked to, as v1 names it on a task. */
export interface LinkedExecution {
	executionId: string;
	workflowId: string;
}

/**
 * The executions this one is linked to. v1 notes the parent on the task of the
 * sub-execution's trigger, and each sub-execution on the task of the step that started it,
 * which is where the editor offers the links.
 */
export interface ExecutionLinks {
	parent?: LinkedExecution;
	subExecutions?: Array<LinkedExecution & { stepId: string }>;
}

/** @param pinData The pin data the run used. The canvas marks those nodes as pinned, not as executed. */
export function toV1RunExecutionData(
	graph: WorkflowGraph,
	steps: StepDetail[],
	pinData?: IPinData,
	links: ExecutionLinks = {},
) {
	const runs = toStepRuns(graph, steps);
	noteLinks(graph, runs, links);

	// By settle time, not by creation order: parallel branches settle
	// independently, so the row created last is not the step that ran last.
	const bySettleTime = [...runs].sort((a, b) => settledAt(a) - settledAt(b));
	// The failure that ended the execution is the first one to settle.
	const failed = bySettleTime.find((run) => run.step.status === 'failed');

	return createRunExecutionData({
		resultData: {
			runData: toRunData(runs),
			pinData,
			error: failed?.taskData.error,
			lastNodeExecuted: (failed ?? bySettleTime.at(-1))?.nodeName,
		},
		// A read reports what ran. The factory otherwise fills in the runtime
		// structures a run needs, such as the node execution stack.
		executionData: null,
		// A v2 execution has no resume token. The factory otherwise mints one.
		resumeToken: '',
	});
}

/** Writes each link onto the task v1 keeps it on. A link to a step that is not reported is dropped. */
function noteLinks(
	graph: WorkflowGraph,
	runs: StepRun[],
	{ parent, subExecutions = [] }: ExecutionLinks,
) {
	const note = (run: StepRun, metadata: ITaskMetadata) => {
		run.taskData.metadata = { ...run.taskData.metadata, ...metadata };
	};

	if (parent) {
		const triggerIds = new Set(graph.nodes.filter((n) => n.type === 'trigger').map((n) => n.id));
		const triggerRun = runs.find((run) => triggerIds.has(run.step.nodeId));
		if (triggerRun) note(triggerRun, { parentExecution: parent });
	}

	for (const { stepId, ...subExecution } of subExecutions) {
		const run = runs.find(({ step }) => step.id === stepId);
		if (!run) continue;
		note(run, {
			subExecution,
			subExecutionsCount: (run.taskData.metadata?.subExecutionsCount ?? 0) + 1,
		});
	}
}

/** When the step reached its current status. `createdAt` is when it was planned. */
function settledAt(run: StepRun): number {
	return Date.parse(run.step.updatedAt);
}

/** @param steps Oldest first, as the data plane orders them. Position is the run order. */
function toStepRuns(graph: WorkflowGraph, steps: StepDetail[]): StepRun[] {
	const lineage = toLineage(graph, steps);

	const runs: StepRun[] = [];
	for (const step of steps) {
		const executionStatus = TASK_STATUS_V1.get(step.status);
		if (executionStatus === undefined) continue;

		const nodeName = lineage.namesById.get(step.nodeId);
		// v1 keys run data by node name only.
		if (nodeName === undefined) continue;

		runs.push({
			step,
			nodeName,
			taskData: toTaskData(
				step,
				executionStatus,
				runs.length,
				toSourcesAt(lineage, step.nodeId, step.iteration),
				lineage.namesById,
			),
		});
	}

	return runs;
}

function toLineage(graph: WorkflowGraph, steps: StepDetail[]): SourceLineage {
	const lastIterationByNodeId = new Map<string, number>();
	for (const step of steps) {
		// Only a reported pass counts. A pass v1 never hears about, such as a body
		// step skipped on the last pass, would name a run that has no `runData`.
		if (!TASK_STATUS_V1.has(step.status)) continue;
		const seen = lastIterationByNodeId.get(step.nodeId);
		if (seen === undefined || step.iteration > seen) {
			lastIterationByNodeId.set(step.nodeId, step.iteration);
		}
	}

	const completedOutputs = new Map<string, Map<number, StepSlots>>();
	for (const step of steps) {
		if (step.status !== 'completed' || step.outputs === null) continue;
		const byIteration = completedOutputs.get(step.nodeId) ?? new Map<number, StepSlots>();
		byIteration.set(step.iteration, step.outputs);
		completedOutputs.set(step.nodeId, byIteration);
	}

	return toSourceLineage(graph, lastIterationByNodeId, (nodeId, iteration) =>
		completedOutputs.get(nodeId)?.get(iteration),
	);
}

function toTaskData(
	step: StepDetail,
	executionStatus: ExecutionStatus,
	executionIndex: number,
	source: Array<ISourceData | null>,
	namesById: Map<string, string>,
): ITaskData {
	// TODO(CAT-4234): report real run timing. Row timestamps include queue time.
	const startTime = Date.parse(step.createdAt);

	return {
		startTime,
		executionTime: Math.max(0, Date.parse(step.updatedAt) - startTime),
		executionIndex,
		source,
		executionStatus,
		// Every output slot is `main`: no other connection type exists here.
		...(step.outputs === null
			? {}
			: { data: { [MAIN_CONNECTION_TYPE]: toMainOutputs(step, namesById) } }),
		...(step.error === null ? {} : { error: toV1Error(step.error) }),
	};
}

function toMainOutputs(step: StepDetail, namesById: Map<string, string>): INodeExecutionData[][] {
	return linkOutputSources(fromStepInputs(step.outputs ?? []), step.outputSources, namesById);
}

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

/** `stack` is not restored: `ExecutionBaseError.toJSON` drops it anyway. */
function toV1Error(error: StepError): ExecutionError {
	return fromV1ErrorDetails(error.name, error.message, error.details);
}
