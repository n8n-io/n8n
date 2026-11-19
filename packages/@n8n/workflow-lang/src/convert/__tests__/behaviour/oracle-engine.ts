/**
 * Runs a v1 workflow JSON in n8n's real engine: `WorkflowExecute` from
 * n8n-core with node classes from the built n8n-nodes-base (loaded through the
 * fallback host package, which depends on both). `oracle.ts` uses it for the
 * behaviour cases and `scripts/convert-coverage.ts` for the coverage sample.
 *
 * Stand-ins, because the oracle has no n8n server:
 * - The Code node needs a task runner process. The oracle runs the code in
 *   `node:vm` with the engine's own workflow data proxy.
 * - Execute Workflow runs the sub-workflow in a nested `WorkflowExecute`, as
 *   `executeWorkflow` of the n8n CLI does: it starts at the Execute Workflow
 *   Trigger and returns the outputs of the last node.
 * - `n8n-nodes-testing.testData` is the test node of `packages/core/nodes-testing`.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, Script } from 'node:vm';

import { installNetworkGuard } from '../../../nodes/__tests__/no-network.ts';

// Code of v1 nodes runs in this process: no connection may leave the machine.
installNetworkGuard();

const here = dirname(fileURLToPath(import.meta.url));
const hostPackage = join(here, '../../../../../workflow-fallback-host/package.json');
const req = createRequire(hostPackage);

type Fn = (...args: unknown[]) => unknown;
type Loose = Record<string, unknown> & { [k: string]: Loose & Fn };

let loadedModules: { core: Loose; wf: Loose; nodesRoot: string } | undefined;

function modules() {
	if (loadedModules) return loadedModules;
	const core = req('n8n-core') as Loose;
	const wf = req('n8n-workflow') as Loose;
	const nodesRoot = dirname(req.resolve('n8n-nodes-base/package.json'));
	loadedModules = { core, wf, nodesRoot };
	return loadedModules;
}

/** The test node of n8n's node tests: it emits the items of its `data` parameter. */
class TestDataNode {
	description = {
		displayName: 'Test Data',
		name: 'testData',
		group: ['input'],
		version: 1,
		description: 'Provides static test data',
		defaults: { name: 'Test Data' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [{ displayName: 'Data', name: 'data', type: 'json', default: '[]' }],
	};

	async execute(this: { getNodeParameter(name: string, index: number): unknown }) {
		const raw = this.getNodeParameter('data', 0);
		const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
		const items = Array.isArray(parsed) ? parsed : [parsed];
		return [items.map((json: unknown) => ({ json }))];
	}
}

const loaded = new Map<string, unknown>();

function nodeTypes() {
	const { wf, nodesRoot } = modules();
	const known = req(join(nodesRoot, 'dist/known/nodes.json')) as Record<
		string,
		{ className: string; sourcePath: string }
	>;
	return {
		getByName(type: string) {
			const hit = loaded.get(type);
			if (hit) return hit;
			if (type === 'n8n-nodes-testing.testData') {
				const node = new TestDataNode();
				loaded.set(type, node);
				return node;
			}
			const entry = known[type.replace('n8n-nodes-base.', '')];
			if (!type.startsWith('n8n-nodes-base.') || !entry)
				throw new Error(`unknown node type ${type}`);
			const mod = req(join(nodesRoot, entry.sourcePath)) as Record<string, new () => unknown>;
			const instance = new mod[entry.className]();
			loaded.set(type, instance);
			return instance;
		},
		getByNameAndVersion(type: string, version?: number) {
			return wf.NodeHelpers.getVersionedNodeType(this.getByName(type), version);
		},
		getKnownTypes() {
			return {};
		},
	};
}

/** A result entry as a plain object (not an array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The `json` of a result, as `extractJsonData` of n8n's `js-task-runner.ts`
 * gives it: the `json` when the result has one, else `json ?? {}` for a result
 * with `binary`, else the result itself.
 */
function extractJsonData(result: unknown): unknown {
	if (!isPlainObject(result)) return result;
	if ('json' in result) return result.json;
	if ('binary' in result) return result.json ?? {};
	return result;
}

/** A stand-in for the JavaScript task runner: runs Code node code in `node:vm`. */
async function startRunnerTask(
	_additionalData: unknown,
	_jobType: string,
	settings: {
		code: string;
		nodeMode: string;
		continueOnFail?: boolean;
		chunk?: { startIndex: number; count: number };
	},
	executeFunctions: {
		getWorkflowDataProxy(i: number): Record<string, unknown>;
		helpers: unknown;
	},
	_inputData: unknown,
	_node: unknown,
	_workflow: unknown,
	_runExecutionData: unknown,
	_runIndex: number,
	_itemIndex: number,
	_activeNodeName: string,
	connectionInputData: Array<{ json: unknown }>,
) {
	const { wf } = modules();
	const run = async (index: number) => {
		const proxy = executeFunctions.getWorkflowDataProxy(index);
		const context = createContext({
			...proxy,
			// `this.helpers` of the Code node, as n8n's task runner gives it.
			helpers: executeFunctions.helpers,
			items: connectionInputData,
			item: connectionInputData[index],
			console: { log: () => {}, warn: () => {}, error: () => {} },
		});
		const body = `(async () => {\n${settings.code}\n})()`;
		const value: unknown = await new Script(body).runInContext(context, { timeout: 5000 });
		return value;
	};
	try {
		if (settings.nodeMode === 'runOnceForEachItem') {
			const start = settings.chunk?.startIndex ?? 0;
			const count = settings.chunk?.count ?? connectionInputData.length;
			const out: unknown[] = [];
			for (let i = start; i < start + count; i++) {
				const result = await run(i);
				// As `runForEachItem` of n8n's `js-task-runner.ts`: a result that is false
				// gives no output, `json` is the `json` of the result (for an item with
				// `binary` and no `json`, an empty object), and its `binary` is the item's.
				if (!result) continue;
				if (!isPlainObject(result)) {
					out.push(result);
					continue;
				}
				const item: Record<string, unknown> = {
					json: extractJsonData(result),
					pairedItem: { item: i },
				};
				if (result.binary) item.binary = result.binary;
				out.push(item);
			}
			return { ok: true, result: wf.deepCopy(out) };
		}
		return { ok: true, result: wf.deepCopy(await run(0)) };
	} catch (error) {
		// As n8n's task runner: a Code node in "all items" mode returns the message as the item.
		const message = error instanceof Error ? error.message : String(error);
		if (settings.continueOnFail) return { ok: true, result: [{ json: { error: message } }] };
		return { ok: false, error: { message } };
	}
}

/** The time zone of the workflow settings: v1 reads it for `$now`, `$today` and Luxon. */
function timezoneOf(settings: unknown): { timezone?: string } {
	if (typeof settings !== 'object' || settings === null || !('timezone' in settings)) return {};
	return typeof settings.timezone === 'string' ? { timezone: settings.timezone } : {};
}

export interface OracleWorkflow {
	id?: string;
	name?: string;
	nodes: Array<{ name: string; type: string; typeVersion?: number; parameters?: unknown }>;
	connections: unknown;
	settings?: unknown;
}

export interface OracleOptions {
	/** The node where the run starts, and its output item. */
	start: string;
	item: unknown;
	/** `webhook` for webhook triggers (responses), else `trigger`. */
	mode: 'webhook' | 'trigger';
	/** Workflow JSON of sub-workflows, by id. */
	resolveWorkflow?: (id: string) => unknown;
	/** The run stops with an error after this time. */
	timeoutMs?: number;
	/** Node types instead of the built-in loader (for example with the LangChain nodes). */
	nodeTypes?: unknown;
	/** Members added to the engine's `additionalData`, for example a `credentialsHelper`. */
	additionalData?: Record<string, unknown>;
	/** Report binary data as the `$binary` key of each item, the form of compiled code (spec 10). */
	withBinary?: boolean;
	/** With `withBinary`: also report an empty `binary` object of an item, as `$binary: {}`. */
	emptyBinary?: boolean;
	/**
	 * Report what v1 saved on each item (`pairedItems`) and the item count of each run
	 * (`runSizes`, `runs`). The behaviour cases compare only the `json` of the items, so a case
	 * that records the pairing of the items asks for these fields.
	 */
	withRunDetails?: boolean;
	/** The execution id of the main run (`$execution.id`, resume URLs). Default: a counter. */
	executionId?: string;
	/**
	 * The deduplication store of n8n (Remove Duplicates across executions): the answer of each
	 * call of a node. `args` has the form of a `deduplication` service call (spec 9.9).
	 */
	deduplication?: (call: ServiceCall) => unknown;
}

/** A call of a v1 node to a store of n8n, in the form of a `ctx.service` call. */
export interface ServiceCall {
	step: string;
	service: string;
	op: string;
	args: Record<string, unknown>;
}

let deduplication: ((call: ServiceCall) => unknown) | undefined;
let deduplicatorReady = false;

/** Gives n8n-core a deduplicator that asks the handler of the run that is active. */
async function initDeduplicator(): Promise<void> {
	if (deduplicatorReady) return;
	deduplicatorReady = true;
	const { core } = modules();
	type Context = { node?: { id: string; name: string } };
	const call = (
		op: string,
		scope: string,
		context: Context,
		options: unknown,
		items?: unknown[],
	) => {
		if (!deduplication) throw new Error('The oracle run has no deduplication store');
		return deduplication({
			step: context.node?.name ?? '',
			service: 'deduplication',
			op,
			args: {
				...(items ? { items } : {}),
				scope,
				...(context.node ? { node: { id: context.node.id } } : {}),
				options: options ?? {},
			},
		});
	};
	const service = core.DataDeduplicationService as unknown as { init(d: unknown): Promise<void> };
	await service.init({
		checkProcessedAndRecord: async (items: unknown[], scope: string, c: Context, o: unknown) =>
			call('checkProcessedAndRecord', scope, c, o, items),
		removeProcessed: async (items: unknown[], scope: string, c: Context, o: unknown) =>
			call('removeProcessed', scope, c, o, items),
		clearAllProcessedItems: async (scope: string, c: Context, o: unknown) =>
			call('clearAllProcessedItems', scope, c, o),
		getProcessedDataCount: async (scope: string, c: Context, o: unknown) =>
			call('getProcessedDataCount', scope, c, o),
	});
}

export interface OracleResult {
	error: string | null;
	/** The description of the error of the run, when it has one. */
	errorDescription?: string;
	/** Node names in the order in which they finished each run. */
	order: string[];
	/** The output lists of each node: one list for each output, the items of all runs joined. */
	nodes: Record<string, unknown[][]>;
	/** The responses that Respond to Webhook sent. */
	responses: unknown[];
	/** True when the run stopped at a node that waits for a resume (Wait, Form, send and wait). */
	waiting?: boolean;
	/** The custom data of the execution (`resultData.metadata`), when a node saved some. */
	customData?: Record<string, string>;
	/** The metadata of the runs of each node that has some (the Time Saved node). */
	nodeMetadata?: Record<string, unknown[]>;
	/**
	 * With `withRunDetails`: the `pairedItem` that v1 saved on each output item, one list for
	 * each output, the items of all runs joined, as `nodes` has them. `null` for an item
	 * without a paired item.
	 */
	pairedItems?: Record<string, unknown[][]>;
	/** With `withRunDetails`: the number of items of each output of each run of each node. */
	runSizes?: Record<string, Array<Array<number | null>>>;
	/** As `runSizes`, with 0 for an output that has no list. */
	runs?: Record<string, number[][]>;
}

interface RunData {
	status?: string;
	data: {
		waitTill?: unknown;
		resultData: {
			runData: Record<
				string,
				Array<{
					data?: {
						main: Array<Array<{
							json: unknown;
							binary?: object | null;
							pairedItem?: unknown;
						}> | null>;
					};
					metadata?: unknown;
				}>
			>;
			metadata?: Record<string, string>;
			error?: { message: string; description?: string | null };
			lastNodeExecuted?: string;
		};
	};
}

let executions = 0;

async function execute(
	workflowJson: OracleWorkflow,
	start: string,
	items: unknown[],
	mode: string,
	options: OracleOptions,
	order: string[],
	responses: unknown[],
	depth: number,
): Promise<RunData> {
	const { core, wf } = modules();
	const workflow = new (wf.Workflow as unknown as new (o: unknown) => Loose)({
		id: workflowJson.id ?? 'oracle',
		name: workflowJson.name,
		nodes: workflowJson.nodes,
		connections: workflowJson.connections,
		nodeTypes: options.nodeTypes ?? nodeTypes(),
		active: false,
		settings: { executionOrder: 'v1', ...timezoneOf(workflowJson.settings) },
	});
	executions++;
	const executionId =
		depth === 0 && options.executionId !== undefined ? options.executionId : String(executions);
	const hooks = new (core.ExecutionLifecycleHooks as unknown as new (...a: unknown[]) => Loose)(
		mode,
		executionId,
		{ id: workflowJson.id ?? 'oracle', nodes: [], connections: {} },
	);
	if (depth === 0) {
		hooks.addHandler('nodeExecuteAfter', (name: unknown) => order.push(String(name)));
		hooks.addHandler('sendResponse', (response: unknown) => responses.push(response));
	}
	let done: (v: unknown) => void = () => {};
	const finished = new Promise((r) => {
		done = r;
	});
	hooks.addHandler('workflowExecuteAfter', (run: unknown) => done(run));
	const executeWorkflow = async (
		info: { id?: string; code?: OracleWorkflow },
		_additional: unknown,
		opts: { inputData?: Array<{ json: unknown }> },
	) => {
		if (depth > 20) throw new Error('Sub-workflow calls are too deep.');
		const child = info.code ?? (info.id ? options.resolveWorkflow?.(info.id) : undefined);
		if (!child || typeof child !== 'object') throw new Error(`Unknown workflow ${String(info.id)}`);
		const json = child as OracleWorkflow;
		const startNode =
			json.nodes.find((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger') ??
			json.nodes.find((n) => n.type === 'n8n-nodes-base.manualTrigger');
		if (!startNode) throw new Error('Missing node to start execution');
		const run = await execute(
			json,
			startNode.name,
			(opts.inputData ?? [{ json: {} }]).map((i) => i.json),
			'integrated',
			options,
			order,
			responses,
			depth + 1,
		);
		const result = run.data.resultData;
		if (result.error) throw new Error(result.error.message);
		const last = result.lastNodeExecuted;
		const runs = last ? (result.runData[last] ?? []) : [];
		const trigger = json.nodes.find((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
		const allRuns =
			(trigger?.typeVersion ?? 1) >= 1.2 ||
			(trigger?.parameters as { returnOutput?: string } | undefined)?.returnOutput === 'allRuns';
		const picked = allRuns ? runs : runs.slice(-1);
		const data: Array<Array<{ json: unknown }>> = [];
		for (const r of picked) {
			(r.data?.main ?? []).forEach((list, k) => {
				data[k] = [...(data[k] ?? []), ...(list ?? []).map((i) => ({ json: i.json }))];
			});
		}
		return { executionId: `sub-${executions}`, data: data.length > 0 ? data : [null] };
	};
	const base = {
		executionId,
		hooks,
		currentNodeParameters: undefined,
		variables: {},
		restApiUrl: 'http://localhost/rest',
		webhookBaseUrl: 'http://localhost/webhook',
		webhookWaitingBaseUrl: 'http://localhost/webhook-waiting',
		formWaitingBaseUrl: 'http://localhost/form-waiting',
		instanceBaseUrl: 'http://localhost',
		startRunnerTask,
		executeWorkflow,
		getRunExecutionData: async () => undefined,
		executionTimeoutTimestamp: Date.now() + (options.timeoutMs ?? 10_000),
		...options.additionalData,
	};
	const additionalData = new Proxy(base, {
		get: (t, k) => (k in t ? Reflect.get(t, k) : undefined),
	});
	const runExecutionData = wf.createRunExecutionData({
		executionData: {
			nodeExecutionStack: [
				{
					node: workflow.getNode(start),
					data: { main: [items.map((json) => ({ json }))] },
					source: null,
				},
			],
		},
	});
	const engine = new (core.WorkflowExecute as unknown as new (...a: unknown[]) => Loose)(
		additionalData,
		mode,
		runExecutionData,
	);
	await engine.processRunExecutionData(workflow);
	return (await finished) as RunData;
}

/** Runs the workflow from `options.start` with one trigger item. */
export async function runOracle(
	workflowJson: OracleWorkflow,
	options: OracleOptions,
): Promise<OracleResult> {
	const order: string[] = [];
	const responses: unknown[] = [];
	if (options.deduplication) await initDeduplicator();
	deduplication = options.deduplication;
	const run = await execute(
		workflowJson,
		options.start,
		[options.item],
		options.mode,
		options,
		order,
		responses,
		0,
	);
	const nodes: Record<string, unknown[][]> = {};
	for (const [name, nodeRuns] of Object.entries(run.data.resultData.runData)) {
		const outputs: unknown[][] = [];
		for (const r of nodeRuns) {
			(r.data?.main ?? []).forEach((list, k) => {
				outputs[k] = [
					...(outputs[k] ?? []),
					...(list ?? []).map((i) =>
						options.withBinary &&
						typeof i.binary === 'object' &&
						i.binary !== null &&
						(options.emptyBinary === true || Object.keys(i.binary).length > 0) &&
						typeof i.json === 'object' &&
						i.json !== null
							? { ...i.json, $binary: i.binary }
							: i.json,
					),
				];
			});
		}
		nodes[name] = Array.from({ length: outputs.length }, (_, k) => outputs[k] ?? []);
	}
	const pairedItems: Record<string, unknown[][]> = {};
	const runSizes: Record<string, Array<Array<number | null>>> = {};
	const runs: Record<string, number[][]> = {};
	if (options.withRunDetails) {
		for (const [name, nodeRuns] of Object.entries(run.data.resultData.runData)) {
			const pairs: unknown[][] = [];
			const sizes: Array<Array<number | null>> = [];
			for (const r of nodeRuns) {
				const sizesOfRun: Array<number | null> = [];
				(r.data?.main ?? []).forEach((list, k) => {
					sizesOfRun[k] = list === null ? null : list.length;
					pairs[k] = [...(pairs[k] ?? []), ...(list ?? []).map((i) => i.pairedItem ?? null)];
				});
				sizes.push(sizesOfRun);
			}
			pairedItems[name] = Array.from({ length: pairs.length }, (_, k) => pairs[k] ?? []);
			runSizes[name] = sizes;
			runs[name] = sizes.map((sizesOfRun) => sizesOfRun.map((size) => size ?? 0));
		}
	}
	const nodeMetadata: Record<string, unknown[]> = {};
	for (const [name, runs] of Object.entries(run.data.resultData.runData)) {
		const found = runs.map((r) => r.metadata).filter((m) => m !== undefined);
		if (found.length > 0) nodeMetadata[name] = found;
	}
	return {
		error: run.data.resultData.error?.message ?? null,
		...(typeof run.data.resultData.error?.description === 'string'
			? { errorDescription: run.data.resultData.error.description }
			: {}),
		order,
		nodes,
		responses,
		...(run.data.resultData.metadata ? { customData: run.data.resultData.metadata } : {}),
		...(Object.keys(nodeMetadata).length > 0 ? { nodeMetadata } : {}),
		...(options.withRunDetails ? { pairedItems, runSizes, runs } : {}),
		waiting:
			run.status === 'waiting' || (run.data.waitTill !== undefined && run.data.waitTill !== null),
	};
}
