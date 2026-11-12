/**
 * Turns an engine v2 execution back into the v1 `IRunExecutionData` the editor
 * renders. Read path only. `toV1RunData` in `./v1-adapters` serves one step's
 * expression context and trims loops to the active pass; this reports every
 * iteration, and every spawned step as its own run of the target node.
 */

import { deriveLoops, findActionTargetPath } from '@n8n/engine';
import type {
	ActionDeclaration,
	GraphEdge,
	JsonObject,
	RoundDetail,
	StepDetail,
	StepError,
	StepStatus,
	WorkflowGraph,
	WorkflowLoop,
} from '@n8n/engine';
import type {
	ExecutionError,
	ExecutionStatus,
	IPinData,
	IRunData,
	ISourceData,
	ITaskData,
	NodeConnectionType,
} from 'n8n-workflow';
import {
	createRunExecutionData,
	isNodeConnectionType,
	NodeConnectionTypes,
	WorkflowOperationError,
} from 'n8n-workflow';

import { MAIN_CONNECTION_TYPE } from './constants';
import { isJsonObject } from './guards';
import { fromStepInputs } from './io';
import { emptyRun, forwardEdgesByTarget, nodeNamesById, toSourceSlots } from './v1-run-data';

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
	/** The index in `runData[nodeName]`. */
	runIndex: number;
	taskData: ITaskData;
}

/**
 * A spawned step runs one action of a declaring step, for example one tool
 * call of an agent. v1 reports each call as its own run of the target node.
 */
const isSpawned = (step: StepDetail) => step.kind === 'spawned';

/** What a step's input lineage needs, prepared once for the whole execution. */
interface Lineage {
	namesById: Map<string, string>;
	/** Forward edges only, by target node. */
	edgesByTarget: Map<string, GraphEdge[]>;
	loops: WorkflowLoop[];
	lastIterationByNodeId: Map<string, number>;
}

/**
 * @param pinData The pin data the run used. The canvas marks those nodes as pinned, not as executed.
 * @param rounds The rounds of the declaring steps. They give each spawned step its arguments and its order.
 */
export function toV1RunExecutionData(
	graph: WorkflowGraph,
	steps: StepDetail[],
	pinData?: IPinData,
	rounds: RoundDetail[] = [],
) {
	const runs = toStepRuns(graph, steps, rounds);

	// By settle time, not by creation order: parallel branches settle
	// independently, so the row created last is not the step that ran last.
	// A failed action is data for its declaring step, so only graph steps count.
	const bySettleTime = runs
		.filter((run) => !isSpawned(run.step))
		.sort((a, b) => settledAt(a) - settledAt(b));
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

/** When the step reached its current status. `createdAt` is when it was planned. */
function settledAt(run: StepRun): number {
	return Date.parse(run.step.updatedAt);
}

/** @param steps Oldest first, as the data plane orders them. Position is the run order. */
function toStepRuns(graph: WorkflowGraph, steps: StepDetail[], rounds: RoundDetail[]): StepRun[] {
	const lineage = toLineage(graph, steps);
	const calls = new SpawnedCalls(graph, steps, rounds);

	const runs: StepRun[] = [];
	for (const step of steps) {
		const executionStatus = toExecutionStatus(step, calls);
		if (executionStatus === undefined) continue;

		const nodeName = lineage.namesById.get(step.nodeId);
		// v1 keys run data by node name only.
		if (nodeName === undefined) continue;

		if (!isSpawned(step)) {
			const source = toSources(lineage, step);
			const taskData = toTaskData(step, executionStatus, runs.length, source);
			runs.push({ step, nodeName, runIndex: step.iteration, taskData });
			continue;
		}

		const call = calls.get(step);
		// SPIKE: a spawned step without its declaring step or round is not reported.
		if (!call) continue;
		const taskData = toTaskData(step, executionStatus, runs.length, [call.source], call.kind);
		taskData.inputOverride = { [call.kind]: [[{ json: call.arguments }]] };
		runs.push({ step, nodeName, runIndex: call.runIndex, taskData });
	}

	return runs;
}

/**
 * A declaring step waits while its actions run. v1 shows the node as running
 * then, because the node is still busy with the same item.
 *
 * SPIKE: a declaring step that waits on something else after a round (for
 * example a sub-execution) also reads as running.
 */
function toExecutionStatus(step: StepDetail, calls: SpawnedCalls): ExecutionStatus | undefined {
	if (step.status === 'waiting' && calls.hasRounds(step.id)) return 'running';
	return TASK_STATUS_V1.get(step.status);
}

/** The v1 view of one spawned step. */
interface SpawnedCall {
	/** The connection type the target attaches with, for example `ai_tool`. */
	kind: NodeConnectionType;
	/** Sequential for each target node, ordered by declaring step, round and call. */
	runIndex: number;
	/** The node the target attaches to on the action path, at the run of the declaring step. */
	source: ISourceData;
	arguments: JsonObject;
}

/**
 * Maps spawned steps to v1 runs. v1 counts the runs of a tool node across the
 * execution (0, 1, 2 for three calls). The engine gives every call of one pass
 * the iteration of its declaring step, so the run index comes from the order
 * of the calls instead.
 */
class SpawnedCalls {
	private readonly stepsById: Map<string, StepDetail>;
	private readonly positionById: Map<string, number>;
	/** By declaring step id, round and call id. */
	private readonly actions = new Map<string, { index: number; action: ActionDeclaration }>();
	private readonly declaringStepIds: Set<string>;
	private readonly runIndexById = new Map<string, number>();

	constructor(
		private readonly graph: WorkflowGraph,
		steps: StepDetail[],
		rounds: RoundDetail[],
	) {
		this.stepsById = new Map(steps.map((step) => [step.id, step]));
		this.positionById = new Map(steps.map((step, position) => [step.id, position]));
		this.declaringStepIds = new Set(rounds.map((round) => round.stepId));
		for (const round of rounds) {
			round.actions.forEach((action, index) => {
				this.actions.set(actionKey(round.stepId, round.round, action.callId), { index, action });
			});
		}

		// Only a reported step gets a run index, so the runs have no gaps.
		const reported = steps.filter((step) => isSpawned(step) && TASK_STATUS_V1.has(step.status));
		const keys = new Map(reported.map((step) => [step.id, this.orderKey(step)]));
		reported.sort((a, b) => compareKeys(keys.get(a.id) ?? [], keys.get(b.id) ?? []));

		const nextRunByNodeId = new Map<string, number>();
		for (const step of reported) {
			const runIndex = nextRunByNodeId.get(step.nodeId) ?? 0;
			nextRunByNodeId.set(step.nodeId, runIndex + 1);
			this.runIndexById.set(step.id, runIndex);
		}
	}

	hasRounds(stepId: string): boolean {
		return this.declaringStepIds.has(stepId);
	}

	get(step: StepDetail): SpawnedCall | undefined {
		const declaring = this.stepsById.get(step.declaringStepId ?? '');
		const runIndex = this.runIndexById.get(step.id);
		if (!declaring || runIndex === undefined) return undefined;

		const declared = this.declaredAction(step);
		const path = findActionTargetPath(this.graph, declaring.nodeId, step.nodeId);
		const attachedToId = path?.attachedToNodeId ?? declaring.nodeId;
		const attachedTo = this.graph.nodes.find((node) => node.id === attachedToId);

		return {
			kind: path && isNodeConnectionType(path.kind) ? path.kind : NodeConnectionTypes.AiTool,
			runIndex,
			source: {
				previousNode: attachedTo?.name ?? attachedToId,
				previousNodeOutput: 0,
				// SPIKE: for a tool behind a gate (HITL), this is the run of the
				// declaring step, not a run of the gate node. The gate has no run of
				// its own in v2.
				previousNodeRun: this.runIndexOf(declaring),
			},
			arguments:
				declared && isJsonObject(declared.action.arguments) ? declared.action.arguments : {},
		};
	}

	/** A graph step's run is its iteration. A spawned step's run is its call order. */
	private runIndexOf(step: StepDetail): number {
		return isSpawned(step) ? (this.runIndexById.get(step.id) ?? 0) : step.iteration;
	}

	private declaredAction(step: StepDetail) {
		return this.actions.get(
			actionKey(step.declaringStepId ?? '', step.round ?? 0, step.callId ?? ''),
		);
	}

	/**
	 * Data plane position for a graph step. For a spawned step: the key of its
	 * declaring step, then the round, then the place of the call in the round.
	 */
	private orderKey(step: StepDetail): number[] {
		if (!isSpawned(step)) return [this.positionById.get(step.id) ?? 0];
		const declaring = this.stepsById.get(step.declaringStepId ?? '');
		const prefix = declaring ? this.orderKey(declaring) : [this.positionById.size];
		return [...prefix, step.round ?? 0, this.declaredAction(step)?.index ?? 0];
	}
}

const actionKey = (stepId: string, round: number, callId: string) => `${stepId}/${round}/${callId}`;

function compareKeys(a: number[], b: number[]): number {
	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		if (a[i] !== b[i]) return a[i] - b[i];
	}
	return a.length - b.length;
}

function toLineage(graph: WorkflowGraph, steps: StepDetail[]): Lineage {
	const lastIterationByNodeId = new Map<string, number>();
	for (const step of steps) {
		// Spawned steps are not on edges, so no edge lineage reads them.
		if (isSpawned(step)) continue;
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
	connectionType: NodeConnectionType = MAIN_CONNECTION_TYPE,
): ITaskData {
	// TODO(CAT-4234): report real run timing. Row timestamps include queue time.
	const startTime = Date.parse(step.createdAt);

	return {
		startTime,
		executionTime: Math.max(0, Date.parse(step.updatedAt) - startTime),
		executionIndex,
		source,
		executionStatus,
		...(step.outputs === null ? {} : { data: { [connectionType]: fromStepInputs(step.outputs) } }),
		...(step.error === null ? {} : { error: toV1Error(step.error) }),
	};
}

function toRunData(runs: StepRun[]): IRunData {
	const runData: IRunData = {};

	for (const { nodeName, runIndex, taskData } of runs) {
		const tasks = (runData[nodeName] ??= []);
		while (tasks.length < runIndex) {
			tasks.push(emptyRun(tasks.length));
		}
		tasks[runIndex] = taskData;
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
