/**
 * Turns an engine v2 execution back into the v1 `IRunExecutionData` the editor
 * renders. Read path only. `toV1RunData` in `./v1-adapters` serves one step's
 * expression context and trims loops to the active pass; this reports every
 * iteration.
 */

import { deriveLoops } from '@n8n/engine';
import type {
	GraphEdge,
	StepDetail,
	StepError,
	StepStatus,
	WorkflowGraph,
	WorkflowLoop,
} from '@n8n/engine';
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
import { emptyRun, forwardEdgesByTarget, nodeNamesById, toSourceSlots } from './v1-run-data';

/**
 * Only a step that ran gets an entry. v1 reports a node that did not run by
 * having no `runData` for it, and an entry would make the canvas claim it ran.
 * `queued` never started, `skipped` was decided against, and `cancelled` is
 * reachable only through `cancelQueuedSteps`, which cancels queued rows.
 */
const TASK_STATUS_V1 = new Map<StepStatus, ExecutionStatus>([
	['completed', 'success'],
	['failed', 'error'],
	['running', 'running'],
]);

interface StepRun {
	step: StepDetail;
	nodeName: string;
	taskData: ITaskData;
}

/** What a step's input lineage needs, prepared once for the whole execution. */
interface Lineage {
	namesById: Map<string, string>;
	/** Forward edges only, by target node. */
	edgesByTarget: Map<string, GraphEdge[]>;
	loops: WorkflowLoop[];
	lastIterationByNodeId: Map<string, number>;
}

export function toV1RunExecutionData(graph: WorkflowGraph, steps: StepDetail[]) {
	const runs = toStepRuns(graph, steps);

	// By settle time, not by creation order: parallel branches settle
	// independently, so the row created last is not the step that ran last.
	const bySettleTime = [...runs].sort((a, b) => settledAt(a) - settledAt(b));
	// The failure that ended the execution is the first one to settle.
	const failed = bySettleTime.find((run) => run.step.status === 'failed');

	return createRunExecutionData({
		resultData: {
			runData: toRunData(runs),
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
			taskData: toTaskData(step, executionStatus, runs.length, toSources(lineage, step)),
		});
	}

	return runs;
}

function toLineage(graph: WorkflowGraph, steps: StepDetail[]): Lineage {
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

	return {
		namesById: nodeNamesById(graph),
		edgesByTarget: forwardEdgesByTarget(graph),
		loops: deriveLoops(graph),
		lastIterationByNodeId,
	};
}

/** Unlike the execute path, a read reports which pass of the predecessor fed each one. */
function toSources(lineage: Lineage, step: StepDetail): Array<ISourceData | null> {
	return toSourceSlots(lineage.edgesByTarget.get(step.nodeId) ?? [], lineage.namesById, (edge) =>
		toPreviousNodeRun(lineage, edge, step.iteration),
	);
}

/**
 * Which run of the predecessor fed this pass. The cases follow `classifyEdge`
 * in the engine's `iteration-mapping`: an edge inside one loop keeps the pass,
 * an edge leaving a loop reads its last pass, and anything else reads run 0.
 */
function toPreviousNodeRun(lineage: Lineage, edge: GraphEdge, iteration: number): number {
	const sourceLoop = lineage.loops.find((loop) => loop.memberIds.has(edge.from));
	// `plain` or `entry`: the predecessor ran once.
	if (!sourceLoop) return 0;
	// `intra`: both ends share a pass.
	if (sourceLoop.memberIds.has(edge.to)) return iteration;
	// `exit`: the predecessor's terminal pass.
	return lineage.lastIterationByNodeId.get(edge.from) ?? 0;
}

function toTaskData(
	step: StepDetail,
	executionStatus: ExecutionStatus,
	executionIndex: number,
	source: Array<ISourceData | null>,
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
			: { data: { [MAIN_CONNECTION_TYPE]: fromStepInputs(step.outputs) } }),
		...(step.error === null ? {} : { error: toV1Error(step.error) }),
	};
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

/**
 * The data plane holds nothing v1-shaped, so this rebuilds the minimum. Only
 * `name` is worth restoring: `ExecutionBaseError.toJSON` drops `stack`.
 */
function toV1Error(error: StepError): ExecutionError {
	const v1Error = new WorkflowOperationError(error.message);
	v1Error.name = error.name;
	return v1Error;
}
