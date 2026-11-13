/**
 * Run-data adapter: turns runtime step status events into the run data that
 * the editor canvas reads (`IRunData`: node name -> one `ITaskData` per run).
 *
 * - One step occurrence is one run of its node, so loop iterations become
 *   several runs of one node.
 * - Parallel branches are separate step nodes, so several nodes can run at
 *   the same time.
 * - Events can arrive out of order. The adapter orders them by `seq` and
 *   ignores duplicates, so the result depends only on the set of events.
 */
import type {
	ExecutionStatus,
	GenericValue,
	IConnections,
	IDataObject,
	INode,
	INodeParameters,
	INodeExecutionData,
	ISourceData,
	ITaskData,
	NodeConnectionType,
	NodeParameterValueType,
} from 'n8n-workflow';

import type { Canvas } from '../compiler/projection.ts';

export type StepEventStatus = 'started' | 'completed' | 'failed' | 'waiting' | 'retrying';

/** A status event that the runtime emits for one attempt of one step run. */
export interface StepStatusEvent {
	executionId: string;
	stepId: string;
	/** The 0-based occurrence of the step in the execution (the loop position). */
	occurrence?: number;
	/** Alias of `occurrence`. */
	loopPosition?: number;
	attempt: number;
	/** Order of the event in the execution. Higher is later. */
	seq: number;
	status: StepEventStatus;
	/** Milliseconds since the epoch. */
	time?: number;
	/** `completed`: the effect result. `failed`: `{ message }`. */
	data?: unknown;
	/** The output of the node that the result goes to. The default is 0. */
	output?: number;
}

/** The error of a failed task. The editor reads `error` as a plain object. */
export interface TaskError {
	name: string;
	message: string;
}

/** `ITaskData` with a plain error object instead of an error class. */
export type TaskData = Omit<ITaskData, 'error'> & { error?: TaskError };

export interface CanvasRunData {
	executionId: string;
	/** Node name -> runs, in occurrence order. */
	runData: Record<string, TaskData[]>;
	/** Node id -> status of the last run, as `executionStatusByNodeId` holds it. */
	statusByNodeId: Record<string, ExecutionStatus>;
	/** Node ids with a run that has started and not ended. */
	runningNodeIds: string[];
	/** Events of other executions or for unknown steps. */
	ignored: StepStatusEvent[];
}

const STATUS: Record<StepEventStatus, ExecutionStatus> = {
	started: 'running',
	retrying: 'running',
	waiting: 'waiting',
	completed: 'success',
	failed: 'error',
};

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toGeneric(v: unknown): GenericValue {
	if (v === null || v === undefined) return v;
	if (
		typeof v === 'string' ||
		typeof v === 'number' ||
		typeof v === 'boolean' ||
		typeof v === 'object'
	) {
		return v;
	}
	if (typeof v === 'bigint' || typeof v === 'symbol') return v.toString();
	return '[function]';
}

function toDataObject(v: Record<string, unknown>): IDataObject {
	const out: IDataObject = {};
	for (const [k, value] of Object.entries(v)) out[k] = toGeneric(value);
	return out;
}

function toParameterValue(v: unknown): NodeParameterValueType {
	if (
		v === null ||
		v === undefined ||
		typeof v === 'string' ||
		typeof v === 'number' ||
		typeof v === 'boolean'
	) {
		return v;
	}
	if (Array.isArray(v)) {
		if (v.every(isRecord)) return v.map(toParameters);
		return v.map((x) =>
			x === null ||
			x === undefined ||
			typeof x === 'string' ||
			typeof x === 'number' ||
			typeof x === 'boolean'
				? x
				: JSON.stringify(x),
		);
	}
	if (isRecord(v)) return toParameters(v);
	return JSON.stringify(toGeneric(v)) ?? null;
}

/** Converts canvas parameters to node parameters. */
export function toParameters(v: Record<string, unknown>): INodeParameters {
	const out: INodeParameters = {};
	for (const [k, value] of Object.entries(v)) out[k] = toParameterValue(value);
	return out;
}

/** Turns an effect result into items: arrays give one item each, other values one item. */
export function toItems(result: unknown): INodeExecutionData[] {
	if (result === undefined) return [];
	const list = Array.isArray(result) ? result : [result];
	return list.map((x) => ({ json: isRecord(x) ? toDataObject(x) : { value: toGeneric(x) } }));
}

function occurrenceOf(e: StepStatusEvent): number {
	return e.occurrence ?? e.loopPosition ?? 0;
}

/** The first node that connects to `name`, for `ITaskData.source`. */
function sources(canvas: Canvas): Map<string, ISourceData> {
	const out = new Map<string, ISourceData>();
	for (const [from, { main }] of Object.entries(canvas.connections)) {
		main.forEach((targets, output) => {
			for (const t of targets) {
				if (!out.has(t.node)) out.set(t.node, { previousNode: from, previousNodeOutput: output });
			}
		});
	}
	return out;
}

/** Builds canvas run data from all events seen so far for one execution. */
export function buildRunData(
	events: StepStatusEvent[],
	canvas: Canvas,
	executionId: string = events[0]?.executionId ?? '',
): CanvasRunData {
	const byId = new Map(canvas.nodes.map((n) => [n.id, n]));
	const source = sources(canvas);
	const ignored: StepStatusEvent[] = [];
	const seen = new Set<number>();
	const ordered = events
		.filter((e) => {
			if (e.executionId !== executionId || !byId.has(e.stepId)) {
				ignored.push(e);
				return false;
			}
			// The runtime numbers events once; a repeated seq is a duplicate delivery.
			if (seen.has(e.seq)) return false;
			seen.add(e.seq);
			return true;
		})
		.sort((a, b) => a.seq - b.seq);

	interface Run {
		nodeId: string;
		occurrence: number;
		firstSeq: number;
		startTime: number;
		endTime: number | null;
		status: ExecutionStatus;
		data?: { output: number; items: INodeExecutionData[] };
		error?: TaskError;
		attempts: number;
	}
	const runs = new Map<string, Run>();
	for (const e of ordered) {
		const key = `${e.stepId}\u0000${occurrenceOf(e)}`;
		const time = e.time ?? 0;
		let run = runs.get(key);
		if (!run) {
			run = {
				nodeId: e.stepId,
				occurrence: occurrenceOf(e),
				firstSeq: e.seq,
				startTime: time,
				endTime: null,
				status: 'running',
				attempts: 0,
			};
			runs.set(key, run);
		}
		run.status = STATUS[e.status];
		run.attempts = Math.max(run.attempts, e.attempt + 1);
		if (e.status === 'started' && run.startTime === 0) run.startTime = time;
		if (e.status === 'completed') {
			run.endTime = time;
			run.error = undefined;
			run.data = { output: e.output ?? 0, items: toItems(e.data) };
		} else if (e.status === 'failed') {
			run.endTime = time;
			const message =
				isRecord(e.data) && typeof e.data.message === 'string' ? e.data.message : 'The step failed';
			run.error = { name: 'NodeError', message };
		} else {
			run.endTime = null;
		}
	}

	// executionIndex follows the order in which runs began.
	const all = [...runs.values()].sort((a, b) => a.firstSeq - b.firstSeq);
	const runData: Record<string, TaskData[]> = {};
	const statusByNodeId: Record<string, ExecutionStatus> = {};
	const running = new Set<string>();
	const lastOccurrence = new Map<string, number>();
	all.forEach((run, executionIndex) => {
		const node = byId.get(run.nodeId);
		if (!node) return;
		const main: INodeExecutionData[][] = [];
		if (run.data) {
			for (let i = 0; i <= run.data.output; i++)
				main.push(i === run.data.output ? run.data.items : []);
		}
		const prev = source.get(node.name);
		const task: TaskData = {
			startTime: run.startTime,
			executionIndex,
			source: prev ? [prev] : [],
			executionTime: run.endTime === null ? 0 : Math.max(0, run.endTime - run.startTime),
			executionStatus: run.status,
			...(run.data ? { data: { main } } : {}),
			...(run.error ? { error: run.error } : {}),
		};
		const list = (runData[node.name] ??= []);
		list.push(task);
		list.sort((a, b) => a.executionIndex - b.executionIndex);
		if (run.occurrence >= (lastOccurrence.get(node.id) ?? -1)) {
			lastOccurrence.set(node.id, run.occurrence);
			statusByNodeId[node.id] = run.status;
		}
		if (run.status === 'running') running.add(node.id);
	});
	return { executionId, runData, statusByNodeId, runningNodeIds: [...running].sort(), ignored };
}

/** Keeps the events of one execution and rebuilds run data on each new event. */
export class RunDataAdapter {
	private readonly events: StepStatusEvent[] = [];

	private readonly canvas: Canvas;

	private readonly executionId: string;

	constructor(canvas: Canvas, executionId: string) {
		this.canvas = canvas;
		this.executionId = executionId;
	}

	push(event: StepStatusEvent): CanvasRunData {
		this.events.push(event);
		return this.current();
	}

	current(): CanvasRunData {
		return buildRunData(this.events, this.canvas, this.executionId);
	}
}

/** The v1 workflow shape of a canvas projection, as the editor loads it. */
export function toWorkflowData(canvas: Canvas): { nodes: INode[]; connections: IConnections } {
	const nodes: INode[] = canvas.nodes.map((n) => ({
		id: n.id,
		name: n.name,
		type: n.type,
		typeVersion: n.typeVersion,
		position: n.position,
		parameters: toParameters(n.parameters),
		...(n.onError ? { onError: n.onError } : {}),
		...(n.notes ? { notes: n.notes } : {}),
	}));
	const connections: IConnections = {};
	for (const [from, types] of Object.entries(canvas.connections)) {
		const byType: IConnections[string] = {};
		for (const [type, outputs] of Object.entries(types)) {
			if (!isConnectionType(type)) continue;
			byType[type] = outputs.map((targets) =>
				targets.flatMap((t) => (isConnectionType(t.type) ? [{ ...t, type: t.type }] : [])),
			);
		}
		connections[from] = byType;
	}
	return { nodes, connections };
}

/** Compile-time check: a task without an error is an `ITaskData`. */
export function asTaskData(task: TaskData): ITaskData | null {
	if (task.error) return null;
	const { error: _error, ...rest } = task;
	return rest;
}

/** n8n's connection types (`NodeConnectionTypes` of n8n-workflow, which this file imports as types only). */
const CONNECTION_TYPES: readonly NodeConnectionType[] = [
	'main',
	'ai_agent',
	'ai_chain',
	'ai_document',
	'ai_embedding',
	'ai_languageModel',
	'ai_memory',
	'ai_outputParser',
	'ai_retriever',
	'ai_reranker',
	'ai_textSplitter',
	'ai_tool',
	'ai_vectorStore',
];

function isConnectionType(value: string): value is NodeConnectionType {
	return CONNECTION_TYPES.some((t) => t === value);
}
