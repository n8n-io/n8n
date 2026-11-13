/**
 * Runs an AI cluster node (an agent or chain root with its sub-nodes) the way
 * n8n's v1 engine (`WorkflowExecute` in n8n-core) runs it.
 *
 * The host builds a v1 `Workflow` of the root and its sub-nodes, with their
 * `ai_*` connections, and runs the root through n8n-core's `ExecuteContext`.
 * The root gets its sub-nodes through `getInputConnectionData`, which calls
 * `supplyData` of each sub-node, as in n8n.
 *
 * Tools: a root (Agent version 3) can ask the engine to run tool nodes, with an
 * `EngineRequest`. The host runs each requested tool node with the input that
 * n8n gives it (the root item, the tool arguments, and `toolCallId`), then
 * runs the root again with the results (`EngineResponse`). A failed tool gives
 * `{ error }` to the root unless the tool node has `onError: stopWorkflow`, as
 * in n8n.
 *
 * Expressions in the parameters stay as n8n expressions and n8n evaluates them
 * here, so `$fromAI(...)` in a tool node works. The converter evaluates the
 * expressions that read other nodes before the call.
 */
import { ExecuteContext, isEngineRequest } from 'n8n-core';
import type {
	CloseFunction,
	EngineRequest,
	EngineResponse,
	IConnections,
	IExecuteData,
	INode,
	INodeCredentials,
	INodeExecutionData,
	INodeParameters,
	IRunData,
	IRunExecutionData,
	ISourceData,
	ITaskData,
	IWorkflowExecuteAdditionalData,
	NodeConnectionType,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	createRunExecutionData,
	isNodeClassInstance,
	NodeOperationError,
	Workflow,
} from 'n8n-workflow';

import type { HostNodeTypes } from './node-types';

/** A sub-node of a cluster step: it supplies data to `target` over `connection`. */
export interface SubNodeArgs {
	name: string;
	type: string;
	typeVersion?: number;
	parameters: INodeParameters;
	credential?: string;
	/** The connection type, for example `ai_languageModel`. */
	connection: NodeConnectionType;
	/** The node that gets the data: the root or another sub-node. */
	target: string;
	/** The input index on the target. The fallback model of an agent is index 1. */
	targetIndex: number;
	onError?: INode['onError'];
}

/**
 * The nodes before the root and their runs, so that n8n's expressions in the
 * cluster can read them (`$('Node').all()`, `.item`).
 */
export interface ClusterContext {
	nodes: INode[];
	/** The main connections between these nodes and the root. */
	connections: IConnections;
	runData: IRunData;
	/** The source of the root's first input (`previousNode`, for `.item`). */
	source: ISourceData[];
}

export interface ClusterArgs {
	name: string;
	type: string;
	typeVersion: number;
	parameters: INodeParameters;
	credential?: string;
	onError?: INode['onError'];
	inputs: INodeExecutionData[][];
	subNodes: SubNodeArgs[];
	context?: ClusterContext;
	/** The workflow id of the execution (the location of its binary data). */
	workflowId?: string;
}

export interface ClusterDeps {
	nodeTypes: HostNodeTypes;
	additionalData: (executionId: string) => IWorkflowExecuteAdditionalData;
	nodeCredentials: (type: string, version: number, slot: string) => INodeCredentials;
}

export class ClusterStepError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ClusterStepError';
	}
}

/** The most rounds of tool calls that one root run can ask for. */
const MAX_REQUEST_ROUNDS = 50;

const MODE: WorkflowExecuteMode = 'integrated';

function emptyRunData(): IRunExecutionData {
	return createRunExecutionData({
		startData: {},
		resultData: { runData: {} },
		executionData: {
			contextData: {},
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {},
			waitingExecutionSource: null,
		},
	});
}

function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

interface Run {
	workflow: Workflow;
	runExecutionData: IRunExecutionData;
	additionalData: IWorkflowExecuteAdditionalData;
	/** The source of the root's first input. */
	rootSource: ISourceData[];
}

export class ClusterRunner {
	constructor(private readonly deps: ClusterDeps) {}

	/**
	 * Runs the cluster. `report` gets the runs of the sub-nodes that n8n-core recorded
	 * (`resultData.runData`: models, memories, tools), also when the root fails.
	 */
	async run(
		args: ClusterArgs,
		meta: { step: string; key: string },
		report?: (runs: SubNodeRuns) => void,
	): Promise<INodeExecutionData[][]> {
		const root = this.toNode(meta.step, args);
		const subs = args.subNodes.map((sub) => this.toNode(`${meta.step}/${sub.name}`, sub));
		const subNames = new Set(subs.map((node) => node.name));
		const own = new Set([root.name, ...subs.map((n) => n.name)]);
		const before = (args.context?.nodes ?? []).filter((n) => !own.has(n.name));
		const workflow = new Workflow({
			id: args.workflowId ?? 'compiled-workflow',
			name: args.name,
			nodes: [...before, root, ...subs],
			connections: { ...(args.context?.connections ?? {}), ...toConnections(args.subNodes) },
			active: false,
			nodeTypes: this.deps.nodeTypes,
			settings: { executionOrder: 'v1' },
		});
		const runExecutionData = emptyRunData();
		for (const n of before) {
			const runs = args.context?.runData[n.name];
			if (runs) runExecutionData.resultData.runData[n.name] = runs;
		}
		const run: Run = {
			workflow,
			runExecutionData,
			additionalData: this.deps.additionalData(meta.key),
			rootSource: args.context?.source ?? [],
		};
		// With run data, an input item pairs with the item at the same position of its parent, as
		// the converted code pairs it, so that `$('Node').item` resolves.
		const inputs = args.context
			? args.inputs.map((list) =>
					list.map((item, index) => ({ ...item, pairedItem: item.pairedItem ?? { item: index } })),
				)
			: args.inputs;
		try {
			return await workflow.expression.withIsolate(
				async () => await this.runNode(run, root, inputs),
			);
		} finally {
			// Runs of the nodes before the root are not runs of the cluster.
			report?.(subNodeRuns(run.runExecutionData, subNames));
		}
	}

	private toNode(
		id: string,
		args: {
			name: string;
			type: string;
			typeVersion?: number;
			parameters: INodeParameters;
			credential?: string;
			onError?: INode['onError'];
		},
	): INode {
		const typeVersion = args.typeVersion ?? this.deps.nodeTypes.defaultVersion(args.type);
		const node: INode = {
			id,
			name: args.name,
			type: args.type,
			typeVersion,
			position: [0, 0],
			parameters: args.parameters,
		};
		if (args.onError !== undefined) node.onError = args.onError;
		if (args.credential !== undefined) {
			node.credentials = this.deps.nodeCredentials(args.type, typeVersion, args.credential);
		}
		return node;
	}

	/** Runs one node and answers its engine requests until it gives items. */
	private async runNode(
		run: Run,
		node: INode,
		inputs: INodeExecutionData[][],
	): Promise<INodeExecutionData[][]> {
		const nodeType = this.deps.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (nodeType.execute === undefined) {
			throw new ClusterStepError(`The node type ${node.type} cannot run as a step`);
		}
		const runIndex = run.runExecutionData.resultData.runData[node.name]?.length ?? 0;
		let response: EngineResponse | undefined;
		for (let round = 0; round <= MAX_REQUEST_ROUNDS; round++) {
			const closeFunctions: CloseFunction[] = [];
			const main = inputs.length > 0 ? inputs : [[]];
			const first = main[0] ?? [];
			const connectionInputData = first.length > 0 ? first : [{ json: {} }];
			const inputData = { main: [connectionInputData, ...main.slice(1)] };
			const source = run.rootSource.length > 0 && node.rewireOutputLogTo === undefined;
			const executeData: IExecuteData = {
				node,
				data: inputData,
				source: source ? { main: run.rootSource } : null,
			};
			const context = new ExecuteContext(
				run.workflow,
				node,
				run.additionalData,
				MODE,
				run.runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				executeData,
				closeFunctions,
				undefined,
				response,
			);
			let result: Awaited<ReturnType<NonNullable<typeof nodeType.execute>>>;
			try {
				result = isNodeClassInstance(nodeType)
					? await nodeType.execute(context)
					: await nodeType.execute.call(context, response);
			} finally {
				await Promise.allSettled(closeFunctions.map(async (close) => await close()));
			}
			if (!isEngineRequest(result)) {
				if (result === null || result === undefined) return [];
				if (Array.isArray(result)) return result;
				throw new ClusterStepError(`Node "${node.name}" gave a result that is not items`);
			}
			response = await this.answer(run, first, result);
		}
		throw new ClusterStepError(
			`Node "${node.name}" asked for tool calls more than ${MAX_REQUEST_ROUNDS} times`,
		);
	}

	/** Runs the tool nodes of a request, in the order of the request, as n8n's engine does. */
	private async answer(
		run: Run,
		rootItems: INodeExecutionData[],
		request: EngineRequest,
	): Promise<EngineResponse> {
		const response: EngineResponse = { actionResponses: [], metadata: request.metadata };
		for (const action of request.actions) {
			const node = run.workflow.getNode(action.nodeName);
			if (node === null) {
				throw new ClusterStepError(`The cluster has no node "${action.nodeName}"`);
			}
			const metadata: unknown = action.metadata;
			if (hasKey(metadata, 'hitl')) {
				throw new ClusterStepError(
					`Node "${node.name}" asks for a human approval. The fallback host cannot wait for one.`,
				);
			}
			node.rewireOutputLogTo = action.type;
			const itemIndex = numberKey(metadata, 'itemIndex') ?? 0;
			const json = {
				...(rootItems[itemIndex]?.json ?? {}),
				...action.input,
				toolCallId: action.id,
			};
			const started = Date.now();
			let data: ITaskData;
			try {
				const output = await this.runNode(run, node, [[{ json }]]);
				data = taskData(started, 'success', { [action.type]: output });
			} catch (error) {
				// AI tools continue on error, so the root gets the message, unless the node says to stop.
				if (node.onError === 'stopWorkflow') throw error;
				data = taskData(
					started,
					'error',
					{ [action.type]: [[{ json: { error: messageOf(error) } }]] },
					// v1 keeps the error of the failed run on the task data, so the tool's message is
					new NodeOperationError(node, error instanceof Error ? error : messageOf(error)),
				);
			}
			(run.runExecutionData.resultData.runData[node.name] ??= []).push(data);
			response.actionResponses.push({ action, data });
		}
		return response;
	}
}

/** For each sub-node that ran, one entry for each run, with its error message or null. */
export type SubNodeRuns = Record<string, Array<{ error: string | null }>>;

/**
 * The runs of the cluster's sub-nodes, as n8n's v1 engine records them.
 *
 * v1 gives a sub-node a run only when the code of that node runs and writes its
 * data, or when its `supplyData` throws:
 * - a model, a memory, an output parser or a tool writes the run from its own
 *   callback at call time (`N8nLlmTracing.handleLLMStart`, `N8nStructuredOutputParser.parse`,
 *   the tool invocation of `getInputConnectionData`), not when `supplyData` builds the object;
 * - `getInputConnectionData` writes the run of a sub-node whose `supplyData` throws.
 * A root that fails before it calls the model therefore leaves no run for the model in
 * v1, and n8n-core writes the run data here under the same conditions. So this reads
 * the run data the host recorded and reports only the sub-nodes of this cluster that
 * got a run: an entry for another node, or an empty list, is not a run.
 */
function subNodeRuns(data: IRunExecutionData, subNames: Set<string>): SubNodeRuns {
	const out: SubNodeRuns = {};
	for (const name of subNames) {
		const runs = data.resultData.runData[name];
		if (runs === undefined || runs.length === 0) continue;
		out[name] = runs.map((r) => ({
			error: r.error
				? (r.error.message ?? 'error')
				: r.executionStatus === 'error'
					? 'error'
					: null,
		}));
	}
	return out;
}

function taskData(
	started: number,
	executionStatus: 'success' | 'error',
	data: Record<string, INodeExecutionData[][]>,
	error?: ITaskData['error'],
): ITaskData {
	const task: ITaskData = {
		startTime: started,
		executionTime: Date.now() - started,
		executionIndex: 0,
		source: [],
		executionStatus,
		data,
	};
	if (error !== undefined) task.error = error;
	return task;
}

function hasKey(value: unknown, key: string): boolean {
	return (
		typeof value === 'object' && value !== null && key in value && Boolean(Reflect.get(value, key))
	);
}

function numberKey(value: unknown, key: string): number | undefined {
	if (typeof value !== 'object' || value === null) return undefined;
	const found: unknown = Reflect.get(value, key);
	return typeof found === 'number' ? found : undefined;
}

/** The `ai_*` connections of the sub-nodes, indexed by source node as v1 stores them. */
export function toConnections(subNodes: SubNodeArgs[]): IConnections {
	const connections: IConnections = {};
	for (const sub of subNodes) {
		const byType = (connections[sub.name] ??= {});
		const outputs = (byType[sub.connection] ??= []);
		const first = (outputs[0] ??= []);
		first.push({ node: sub.target, type: sub.connection, index: sub.targetIndex });
	}
	return connections;
}
