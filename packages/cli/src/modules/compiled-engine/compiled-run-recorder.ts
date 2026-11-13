import type {
	ExecutionError,
	IBinaryData,
	IBinaryKeyData,
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	IRunData,
	ISourceData,
	ITaskData,
	ITaskStartedData,
} from 'n8n-workflow';
import { NodeOperationError, WorkflowOperationError } from 'n8n-workflow';

import type {
	WfrtFinishedEvent,
	WfrtStepEvent,
	WfrtTraceEvent,
	WfrtWaitingEvent,
} from './compiled-engine.types';

/** A change of node state that the dispatcher sends to the lifecycle hooks. */
export type NodeUpdate =
	| { kind: 'before'; nodeName: string; data: ITaskStartedData }
	| { kind: 'after'; nodeName: string; data: ITaskData };

interface OpenRun {
	nodeName: string;
	startTime: number;
	executionIndex: number;
	/** Step attempts that started and did not end. */
	inFlight: number;
	outputs: INodeExecutionData[][];
	error?: string;
	/** The time of the last completed or failed attempt. */
	endTime?: number;
}

const V1_ITEM_KEYS = new Set(['json', 'binary', 'pairedItem', 'error', 'index']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDataObject(value: unknown): value is IDataObject {
	return isRecord(value);
}

/** True for a value that already has the v1 item shape `{ json, binary? }`. */
function isV1Item(value: unknown): value is INodeExecutionData {
	return (
		isRecord(value) &&
		isDataObject(value.json) &&
		Object.keys(value).every((key) => V1_ITEM_KEYS.has(key))
	);
}

/**
 * The binary data of a runtime value: the `$binary` key, in n8n's in-memory
 * form `{ data: <base64>, mimeType, fileName?, fileExtension?, bytes? }`.
 */
export function toBinary(value: unknown): IBinaryKeyData | undefined {
	if (!isRecord(value)) return undefined;
	const out: IBinaryKeyData = {};
	for (const [key, entry] of Object.entries(value)) {
		if (!isRecord(entry) || typeof entry.data !== 'string') continue;
		const binary: IBinaryData = {
			data: entry.data,
			mimeType: typeof entry.mimeType === 'string' ? entry.mimeType : 'application/octet-stream',
		};
		// A file in n8n's binary data store: n8n keeps the id, and the mode name as the data.
		if (typeof entry.id === 'string' && entry.id.includes(':')) {
			binary.id = entry.id;
			binary.data = entry.id.slice(0, entry.id.indexOf(':'));
		}
		if (typeof entry.fileName === 'string') binary.fileName = entry.fileName;
		if (typeof entry.fileExtension === 'string') binary.fileExtension = entry.fileExtension;
		const size = typeof entry.bytes === 'number' ? entry.bytes : entry.fileSize;
		if (typeof size === 'number') binary.fileSize = `${size} B`;
		else if (typeof size === 'string') binary.fileSize = size;
		out[key] = binary;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

/** Turns one value of the runtime into an n8n item. A `$binary` key becomes the item's binary data. */
export function toItem(value: unknown): INodeExecutionData {
	if (isV1Item(value)) return value;
	if (isDataObject(value)) {
		if (!('$binary' in value)) return { json: value };
		const { $binary, ...json } = value;
		const binary = toBinary($binary);
		return binary ? { json, binary } : { json };
	}
	return { json: { value: toGenericValue(value) } };
}

function toGenericValue(value: unknown): IDataObject[string] {
	if (value === undefined || value === null) return null;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}
	if (typeof value === 'object') return value;
	return String(value);
}

/** Turns a list (or one value) of the runtime into n8n items. `undefined` gives no items. */
export function toItems(value: unknown): INodeExecutionData[] {
	if (value === undefined || value === null) return [];
	const list = Array.isArray(value) ? value : [value];
	return list.map(toItem);
}

/** True for the result of a native `http` effect: `{ status, headers, body }`. */
function isHttpResult(
	value: unknown,
): value is { status: number; headers: unknown; body: unknown } {
	return (
		isRecord(value) &&
		typeof value.status === 'number' &&
		'headers' in value &&
		'body' in value &&
		Object.keys(value).length <= 4
	);
}

/**
 * The items of one completed step. A native HTTP step returns the response;
 * the node's items are its body, as with the default options of the v1 node.
 */
export function stepItems(result: unknown): INodeExecutionData[] {
	return toItems(isHttpResult(result) ? result.body : result);
}

/**
 * Turns the `items` of a trace event into node outputs. A list of lists is one
 * list for each output (for example the true and false outputs of IF). Any
 * other value is the items of output 0.
 */
export function toOutputs(items: unknown): INodeExecutionData[][] {
	if (Array.isArray(items) && items.length > 0 && items.every((x) => Array.isArray(x))) {
		return items.map((output) => toItems(output));
	}
	return [toItems(items)];
}

/** The first parent of each node on its main input, for `ITaskData.source`. */
function parentsOf(connections: IConnections): Map<string, ISourceData> {
	const parents = new Map<string, ISourceData>();
	for (const [from, byType] of Object.entries(connections)) {
		(byType.main ?? []).forEach((targets, output) => {
			for (const target of targets ?? []) {
				if (!parents.has(target.node)) {
					parents.set(target.node, { previousNode: from, previousNodeOutput: output });
				}
			}
		});
	}
	return parents;
}

/**
 * Builds n8n run data from the events of one `wfrt` execution.
 *
 * Step names are node names. A step can run several times in one execution,
 * for example once for each item. The recorder joins the occurrences of a
 * node into one run: the run stays open until an event of another node
 * arrives while no attempt of the node is in flight, or until the execution
 * ends. A trace event is a complete run of a core node.
 *
 * The trigger node has no event of its own, so the recorder makes its run
 * from the trigger value. A trace event of the trigger node replaces it.
 */
export class CompiledRunRecorder {
	private readonly runData: IRunData = {};

	private readonly open = new Map<string, OpenRun>();

	private readonly parents: Map<string, ISourceData>;

	private readonly nodesByName: Map<string, INode>;

	private executionIndex = 0;

	private pendingTrigger: { nodeName: string; items: INodeExecutionData[]; at: number } | undefined;

	private lastNode: string | undefined;

	private failedNode: { nodeName: string; message: string } | undefined;

	waitingNode: string | undefined;

	constructor(workflow: { nodes: INode[]; connections: IConnections }) {
		this.parents = parentsOf(workflow.connections);
		this.nodesByName = new Map(workflow.nodes.map((node) => [node.name, node]));
	}

	get lastNodeExecuted() {
		return this.lastNode;
	}

	/** The run data of the runs that have ended. */
	getRunData(): IRunData {
		return this.runData;
	}

	/**
	 * Continues the run data of an execution that n8n saved before, for
	 * example after a restart while the execution waited.
	 */
	seed(runData: IRunData, lastNode?: string) {
		for (const [nodeName, runs] of Object.entries(runData)) {
			this.runData[nodeName] = runs;
			this.executionIndex = Math.max(
				this.executionIndex,
				...runs.map((run) => run.executionIndex + 1),
			);
		}
		this.lastNode = lastNode;
	}

	/** Records the trigger value. The trigger run is sent with the first event of another node. */
	start(triggerNode: string | undefined, trigger: unknown, at: number) {
		if (!triggerNode) return;
		this.pendingTrigger = { nodeName: triggerNode, items: triggerItems(trigger), at };
	}

	onStep(event: WfrtStepEvent): NodeUpdate[] {
		const updates: NodeUpdate[] = [];
		if (!this.nodesByName.has(event.step)) return updates;
		this.flushTrigger(updates, event.step);
		if (event.status === 'retrying') return updates;
		this.closeOthers(event.step, event.at, updates);

		const run = this.ensureOpen(event.step, event.at, updates);
		if (event.status === 'started') {
			run.inFlight++;
			return updates;
		}

		run.inFlight = Math.max(0, run.inFlight - 1);
		run.endTime = event.at;
		if (event.status === 'completed') {
			run.outputs[0].push(...stepItems(event.result));
		} else {
			run.error = event.error ?? 'The step failed';
			this.failedNode = { nodeName: event.step, message: run.error };
		}
		return updates;
	}

	onTrace(event: WfrtTraceEvent): NodeUpdate[] {
		const updates: NodeUpdate[] = [];
		if (!this.nodesByName.has(event.step)) return updates;
		if (this.pendingTrigger?.nodeName === event.step) {
			// The trace of the trigger node replaces the run made from the trigger value.
			this.pendingTrigger.items = toOutputs(event.items)[0] ?? [];
			this.flushTrigger(updates);
			return updates;
		}
		this.flushTrigger(updates);
		this.closeOthers(event.step, event.at, updates);
		// A trace after the steps of a node gives its real output items, so it replaces the step results.
		const run = this.ensureOpen(event.step, event.at, updates);
		run.outputs = toOutputs(event.items);
		run.inFlight = 0;
		this.close(run, event.at, updates);
		return updates;
	}

	onWaiting(event: WfrtWaitingEvent): NodeUpdate[] {
		const updates: NodeUpdate[] = [];
		this.flushTrigger(updates, event.step);
		this.closeOthers(event.step, event.at, updates);
		this.waitingNode = event.step;
		this.lastNode = event.step;
		if (this.nodesByName.has(event.step)) {
			// A v1 wait has a `waiting` run of the node; n8n's resume code takes it off.
			const parent = this.parents.get(event.step);
			(this.runData[event.step] ??= []).push({
				startTime: event.at,
				executionIndex: this.executionIndex,
				source: parent ? [parent] : [],
				executionTime: 0,
				executionStatus: 'waiting',
			});
		}
		return updates;
	}

	/** The items that a node got: the latest output of its first parent on the main input. */
	inputItemsOf(nodeName: string): INodeExecutionData[] {
		const parent = this.parents.get(nodeName);
		if (!parent) return [{ json: {} }];
		const run = this.runData[parent.previousNode]?.at(-1);
		return run?.data?.main[parent.previousNodeOutput ?? 0] ?? [];
	}

	/** Called when a waiting execution resumes. */
	onResumed() {
		const node = this.waitingNode ?? this.lastNode;
		const runs = node ? this.runData[node] : undefined;
		if (node && runs?.at(-1)?.executionStatus === 'waiting') {
			runs.pop();
			if (runs.length === 0) delete this.runData[node];
		}
		this.waitingNode = undefined;
	}

	/** Ends all runs. Returns the updates and the error of the execution, if any. */
	finish(event: WfrtFinishedEvent): { updates: NodeUpdate[]; error?: ExecutionError } {
		const updates: NodeUpdate[] = [];
		this.flushTrigger(updates);
		for (const run of [...this.open.values()]) this.close(run, event.at, updates);
		this.addResultRuns(event, updates);
		this.waitingNode = undefined;
		if (event.status === 'ok') return { updates };
		return { updates, error: this.executionError(event) };
	}

	/**
	 * The result of a converted workflow has the items of each leaf node by
	 * node name. A leaf node with no event (for example Respond to Webhook)
	 * gets its run from there.
	 */
	private addResultRuns(event: WfrtFinishedEvent, updates: NodeUpdate[]) {
		if (event.status !== 'ok' || !isRecord(event.result)) return;
		for (const [nodeName, items] of Object.entries(event.result)) {
			if (!this.nodesByName.has(nodeName) || this.runData[nodeName]) continue;
			if (!Array.isArray(items)) continue;
			const run = this.ensureOpen(nodeName, event.at, updates);
			run.outputs = [toItems(items)];
			this.close(run, event.at, updates);
		}
	}

	private executionError(event: WfrtFinishedEvent): ExecutionError {
		if (!this.failedNode && event.step && this.nodesByName.has(event.step)) {
			this.failedNode = { nodeName: event.step, message: event.error ?? 'The step failed' };
		}
		if (event.status === 'cancelled') {
			return new WorkflowOperationError('The execution was stopped');
		}
		const reason =
			event.error ??
			(typeof event.result === 'string' ? event.result : undefined) ??
			this.failedNode?.message;
		const message =
			event.status === 'needs_attention'
				? `The execution needs attention${this.failedNode ? ` at "${this.failedNode.nodeName}"` : ''}${reason ? `: ${reason}` : ''}`
				: event.status === 'limit'
					? `The execution reached a limit of the runtime${reason ? `: ${reason}` : ''}`
					: (reason ?? 'The execution failed');
		const node = this.failedNode ? this.nodesByName.get(this.failedNode.nodeName) : undefined;
		return node ? new NodeOperationError(node, message) : new WorkflowOperationError(message);
	}

	private flushTrigger(updates: NodeUpdate[], except?: string) {
		const pending = this.pendingTrigger;
		if (!pending || pending.nodeName === except) return;
		this.pendingTrigger = undefined;
		const run = this.ensureOpen(pending.nodeName, pending.at, updates);
		run.outputs = [pending.items];
		this.close(run, pending.at, updates);
	}

	private closeOthers(nodeName: string, at: number, updates: NodeUpdate[]) {
		for (const run of [...this.open.values()]) {
			if (run.nodeName !== nodeName && run.inFlight === 0) this.close(run, at, updates);
		}
	}

	private ensureOpen(nodeName: string, at: number, updates: NodeUpdate[]): OpenRun {
		const existing = this.open.get(nodeName);
		if (existing) return existing;
		const parent = this.parents.get(nodeName);
		const run: OpenRun = {
			nodeName,
			startTime: at,
			executionIndex: this.executionIndex++,
			inFlight: 0,
			outputs: [[]],
		};
		this.open.set(nodeName, run);
		updates.push({
			kind: 'before',
			nodeName,
			data: { startTime: at, executionIndex: run.executionIndex, source: parent ? [parent] : [] },
		});
		return run;
	}

	private close(run: OpenRun, at: number, updates: NodeUpdate[]) {
		this.open.delete(run.nodeName);
		const parent = this.parents.get(run.nodeName);
		const node = this.nodesByName.get(run.nodeName);
		const task: ITaskData = {
			startTime: run.startTime,
			executionIndex: run.executionIndex,
			source: parent ? [parent] : [],
			executionTime: Math.max(0, (run.endTime ?? at) - run.startTime),
			executionStatus: run.error ? 'error' : 'success',
			data: { main: run.outputs },
		};
		if (run.error) {
			task.error = node
				? new NodeOperationError(node, run.error)
				: new WorkflowOperationError(run.error);
		}
		(this.runData[run.nodeName] ??= []).push(task);
		this.lastNode = run.nodeName;
		updates.push({ kind: 'after', nodeName: run.nodeName, data: task });
	}
}

function triggerBody(body: unknown): IDataObject[string] {
	if (body === null || body === undefined) return {};
	if (typeof body === 'string') return body;
	return toItem(body).json;
}

/**
 * The output items of the trigger node, made from the trigger value. A webhook
 * value `{ body, headers, query }` becomes the item of the v1 Webhook node.
 */
export function triggerItems(trigger: unknown): INodeExecutionData[] {
	if (!isRecord(trigger)) return [{ json: {} }];
	if ('body' in trigger || 'headers' in trigger || 'query' in trigger) {
		const item: INodeExecutionData = {
			json: {
				headers: isDataObject(trigger.headers) ? trigger.headers : {},
				params: isDataObject(trigger.params) ? trigger.params : {},
				query: isDataObject(trigger.query) ? trigger.query : {},
				body: triggerBody(trigger.body),
			},
		};
		const binary = toBinary(trigger.$binary);
		if (binary) item.binary = binary;
		return [item];
	}
	if (typeof trigger.scheduledAt === 'number') {
		const date = new Date(trigger.scheduledAt);
		return [{ json: { timestamp: date.toISOString(), scheduledAt: trigger.scheduledAt } }];
	}
	return [toItem(trigger)];
}
