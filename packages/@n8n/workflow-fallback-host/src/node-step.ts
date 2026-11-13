/**
 * Runs a v1 node for a `ctx.node` step.
 *
 * A plain node runs through the engine v2 shim (`V1StepExecutor` of
 * `@n8n/node-engine-compatibility`). The shim takes its host capabilities as
 * injected dependencies. The fallback host gives it:
 * - node types, loaded on demand (`node-types.ts`),
 * - a one-node graph and no earlier step outputs,
 * - an `additionalData` whose credentials helper reads a credential slot,
 * - no sub-workflows.
 *
 * An AI cluster (a step with `subNodes`) and every LangChain node run through
 * `ClusterRunner` (`cluster-step.ts`), because the shim gives a node only its
 * main inputs.
 *
 * Step options beyond the spec (section 1.2):
 * - `inputs`: one item list for each node input. It replaces `items`.
 * - `outputs: 'all'`: the result is one object `{ items }` for each node
 *   output. Without it, the result is the items of output 0.
 * - `subNodes`: the sub-nodes of an AI cluster (`SubNodeArgs`).
 * - `onError`: the n8n node setting, for nodes that handle it themselves.
 * Items carry binary data in the `$binary` key (`binary.ts`).
 *
 * Load this module only when a node step arrives: it pulls in n8n-core and the
 * node packages.
 */
import type { GraphEdge, GraphNode, StepExecutionRequest, StepExecutionResult } from '@n8n/engine';
import { noopResponseEmitter } from '@n8n/engine';
import { createRequire } from 'node:module';

import { V1StepExecutor } from '@n8n/node-engine-compatibility';
import type { StepData } from '@n8n/node-engine-compatibility';
import { ExternalSecretsProxy, PollContext } from 'n8n-core';
import type {
	DataTableProxyProvider,
	IConnections,
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	INode,
	INodeCredentials,
	INodeExecutionData,
	INodeType,
	INodeTypes,
	INodeProperties,
	IHttpRequestOptions,
	IRequestOptionsSimplified,
	IRunData,
	ISourceData,
	IWorkflowExecuteAdditionalData,
	NodeConnectionType,
} from 'n8n-workflow';
import { deepCopy, ICredentialsHelper, NodeConnectionTypes, Workflow } from 'n8n-workflow';

import { fileDataTableProvider } from './data-table';
import { checkBinaryLimit, maxBinaryBytes, toN8nItem, toStepItem } from './binary';
import { ensureExpressionEngine, recoverExpressionEngine } from './expression-engine';
import type { ClusterContext, SubNodeArgs, SubNodeRuns } from './cluster-step';
import { ClusterRunner } from './cluster-step';
import { subWorkflowRunner } from './sub-workflow';
import type { FrameExecution } from './urls';
import { baseUrls, stepUrls } from './urls';
import { HostCredentialTypes } from './credential-types';
import type { CredentialStore } from './credentials';
import { readItems, StepInputError, toResultItems } from './items';
import { readinessIssues, toNodeParameters } from './check-ready';
import { hostExtensions } from './extensions';
import { binaryStore, inlineStoredBinary, registerExecution } from './binary-store';
import { startDeduplication } from './deduplication';
import type { JsTaskResult } from './task-runner';
import { runJsTask } from './task-runner';
import { EVALUATE_TYPE, HostNodeTypes, LANGCHAIN_PREFIX } from './node-types';
import type { JsonObject, JsonValue } from './protocol';
import { isJsonObject } from './protocol';

export { HostNodeTypes } from './node-types';

/** The step that gives n8n instance data to expressions (`$execution`, `$vars`, `$env`). */
const CONTEXT_TYPE = 'n8n-compiled.context';

/** The step that checks a workflow before a manual run (converter option `checkReady`). */
const CHECK_TYPE = 'n8n-compiled.check';

/** The step that makes the item of a v1 Schedule Trigger (converter option `scheduleItem: 'v1'`). */
const SCHEDULE_TYPE = 'n8n-compiled.schedule';

interface MomentTz {
	tz(
		ms: number,
		zone: string,
	): { format(f: string): string; toISOString(keepOffset: boolean): string };
}

function isMomentTz(value: unknown): value is MomentTz {
	return typeof value === 'function' && typeof Reflect.get(value, 'tz') === 'function';
}

let momentTz: MomentTz | undefined;

/**
 * The item of the v1 Schedule Trigger (`ScheduleTrigger.node.ts`) for the slot
 * `parameters.scheduledAt` in `parameters.timezone`, with the same formats.
 */
export function scheduleItem(parameters: JsonObject): JsonObject {
	if (!momentTz) {
		const mod: unknown = createRequire(require.resolve('n8n-nodes-base/package.json'))(
			'moment-timezone',
		);
		if (!isMomentTz(mod)) throw new NodeStepError('moment-timezone did not load');
		momentTz = mod;
	}
	const at = typeof parameters.scheduledAt === 'number' ? parameters.scheduledAt : Date.now();
	const zone = typeof parameters.timezone === 'string' ? parameters.timezone : 'America/New_York';
	const m = momentTz.tz(at, zone);
	return {
		timestamp: m.toISOString(true),
		'Readable date': m.format('MMMM Do YYYY, h:mm:ss a'),
		'Readable time': m.format('h:mm:ss a'),
		'Day of week': m.format('dddd'),
		Year: m.format('YYYY'),
		Month: m.format('MMMM'),
		'Day of month': m.format('DD'),
		Hour: m.format('HH'),
		Minute: m.format('mm'),
		Second: m.format('ss'),
		Timezone: `${zone} (UTC${m.format('Z')})`,
	};
}

/**
 * The instance data of a `n8n-compiled.context` step, for the keys that
 * `parameters.keys` lists. The execution id is the step key (the runtime makes
 * it from the execution). `$vars` comes from `WF_FALLBACK_VARIABLES` (a JSON
 * object). `$env` is empty, as n8n blocks it in nodes by default
 * (`N8N_BLOCK_ENV_ACCESS_IN_NODE`).
 */
function instanceData(parameters: JsonObject, meta: NodeStepMeta): JsonObject {
	const keys = Array.isArray(parameters.keys) ? parameters.keys : [];
	const out: JsonObject = {};
	if (keys.includes('execution')) {
		// The runtime's URLs pass through as they are (they can carry a signature).
		const id = meta.execution?.id ?? meta.key.split(':')[0] ?? meta.key;
		const urls = baseUrls();
		out.execution = {
			id,
			mode: meta.execution?.mode ?? 'production',
			resumeUrl: meta.execution?.resumeUrl ?? `${urls.webhookWaitingBaseUrl}/${id}`,
			resumeFormUrl: meta.execution?.resumeFormUrl ?? `${urls.formWaitingBaseUrl}/${id}`,
			customData: {},
		};
	}
	if (keys.includes('vars')) {
		let vars: unknown = {};
		try {
			vars = JSON.parse(process.env.WF_FALLBACK_VARIABLES ?? '{}');
		} catch {
			throw new NodeStepError('WF_FALLBACK_VARIABLES is not a JSON object');
		}
		out.vars = isJsonObject(vars) ? vars : {};
	}
	if (keys.includes('env')) out.env = {};
	return out;
}

export interface NodeStepSubNode {
	name: string;
	type: string;
	typeVersion?: number;
	parameters: JsonObject;
	credential?: string;
	connection: NodeConnectionType;
	target: string;
	targetIndex: number;
	onError?: INode['onError'];
}

/**
 * Run data of other nodes that the expressions of the node read (`$('X')`,
 * `$node`, `$items`, `.item`, `$evaluateExpression`). The converter sends it
 * when an expression does not compile, so n8n's expression engine evaluates
 * it here with v1 values.
 */
export interface NodeStepRunData {
	/** The nodes that the run data names, with their parameters (`$('X').params`). */
	nodes: Array<{ name: string; type: string; typeVersion: number; parameters: JsonObject }>;
	/** Connections between these nodes and the step node: `[from, output, to, input]`. */
	connections: Array<[string, number, string, number]>;
	/** For each node, its runs; each run has one item list for each output. */
	runs: Record<string, JsonObject[][][]>;
}

export interface NodeStepArgs {
	name: string;
	type: string;
	typeVersion?: number;
	parameters: JsonObject;
	/** One item list for each node input. */
	inputs: JsonObject[][];
	/** True: the result has one `{ items }` object for each output. */
	allOutputs: boolean;
	credential?: string;
	subNodes: NodeStepSubNode[];
	onError?: INode['onError'];
	runData?: NodeStepRunData;
	/** Run the node's `poll` function once (a polling trigger in a manual run). */
	poll?: boolean;
	/** An AI cluster: add `{ subRuns }` (the runs of the sub-nodes) after the outputs. */
	subRuns?: boolean;
	/** Add `{ nodeError }` after the outputs when the whole node failed under "continue on fail". */
	reportError?: boolean;
	/** Settings of the workflow, such as `timezone`, for the node's `Workflow`. */
	settings?: { timezone?: string };
}

export interface NodeStepMeta {
	step: string;
	key: string;
	/** The credentials of this step (from the request frame), before the runner's store. */
	credentials?: CredentialStore;
	/** The execution of the step, from the request frame (`execution`). */
	execution?: FrameExecution;
}

/** The URLs of each step, made once: each make parses the two resume URLs. */
const urlsOfStep = new WeakMap<NodeStepMeta, ReturnType<typeof stepUrls>>();

function urlsOf(meta: NodeStepMeta): ReturnType<typeof stepUrls> {
	let urls = urlsOfStep.get(meta);
	if (!urls) {
		urls = stepUrls(meta.execution);
		urlsOfStep.set(meta, urls);
	}
	return urls;
}

export class NodeStepError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NodeStepError';
	}
}

const CONNECTION_TYPES = new Set<string>(Object.values(NodeConnectionTypes));

function isConnectionType(value: unknown): value is NodeConnectionType {
	return typeof value === 'string' && CONNECTION_TYPES.has(value);
}

function readOnError(value: JsonValue | undefined): INode['onError'] {
	if (
		value === 'continueRegularOutput' ||
		value === 'continueErrorOutput' ||
		value === 'stopWorkflow'
	) {
		return value;
	}
	if (value === undefined || value === null) return undefined;
	throw new StepInputError('"onError" must be an n8n onError setting');
}

function readSlot(value: JsonValue | undefined, label: string): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string')
		throw new StepInputError(`${label} must be a credential slot name`);
	return value;
}

function readSubNodes(value: JsonValue | undefined): NodeStepSubNode[] {
	if (value === undefined || value === null) return [];
	if (!Array.isArray(value)) throw new StepInputError('"subNodes" must be an array');
	return value.map((entry, index) => {
		const label = `"subNodes[${index}]"`;
		if (!isJsonObject(entry)) throw new StepInputError(`${label} must be an object`);
		const { name, type, typeVersion, parameters, credential, connection, target, targetIndex } =
			entry;
		if (typeof name !== 'string' || name === '') {
			throw new StepInputError(`${label}.name must be a string`);
		}
		if (typeof type !== 'string' || type === '') {
			throw new StepInputError(`${label}.type must be a string`);
		}
		if (typeVersion !== undefined && typeof typeVersion !== 'number') {
			throw new StepInputError(`${label}.typeVersion must be a number`);
		}
		if (parameters !== undefined && !isJsonObject(parameters)) {
			throw new StepInputError(`${label}.parameters must be an object`);
		}
		if (!isConnectionType(connection)) {
			throw new StepInputError(`${label}.connection must be an n8n connection type`);
		}
		if (typeof target !== 'string') throw new StepInputError(`${label}.target must be a string`);
		return {
			name,
			type,
			typeVersion,
			parameters: parameters ?? {},
			credential: readSlot(credential, `${label}.credential`),
			connection,
			target,
			targetIndex: typeof targetIndex === 'number' ? targetIndex : 0,
			onError: readOnError(entry.onError),
		};
	});
}

function readInputs(items: JsonValue | undefined, inputs: JsonValue | undefined): JsonObject[][] {
	if (inputs === undefined || inputs === null) return [readItems(items)];
	if (!Array.isArray(inputs)) throw new StepInputError('"inputs" must be an array of item lists');
	return inputs.map((list) => readItems(list));
}

function readRunData(value: JsonValue | undefined): NodeStepRunData | undefined {
	if (value === undefined || value === null) return undefined;
	if (!isJsonObject(value)) throw new StepInputError('"runData" must be an object');
	const nodes = Array.isArray(value.nodes) ? value.nodes.filter(isJsonObject) : [];
	const connections = Array.isArray(value.connections) ? value.connections : [];
	const runs = isJsonObject(value.runs) ? value.runs : {};
	return {
		nodes: nodes.flatMap((n) =>
			typeof n.name === 'string' && typeof n.type === 'string'
				? [
						{
							name: n.name,
							type: n.type,
							typeVersion: typeof n.typeVersion === 'number' ? n.typeVersion : 1,
							parameters: isJsonObject(n.parameters) ? n.parameters : {},
						},
					]
				: [],
		),
		connections: connections.flatMap(
			(c): Array<[string, number, string, number]> =>
				Array.isArray(c) &&
				typeof c[0] === 'string' &&
				typeof c[1] === 'number' &&
				typeof c[2] === 'string' &&
				typeof c[3] === 'number'
					? [[c[0], c[1], c[2], c[3]]]
					: [],
		),
		runs: Object.fromEntries(
			Object.entries(runs).map(([name, list]) => [
				name,
				(Array.isArray(list) ? list : []).map((run) =>
					(Array.isArray(run) ? run : []).map((items) => readItems(items)),
				),
			]),
		),
	};
}

export function parseNodeStepArgs(args: JsonObject): NodeStepArgs {
	const { name, type, typeVersion, parameters, items, inputs, outputs, credential, subNodes } =
		args;
	if (typeof type !== 'string' || type === '') throw new StepInputError('"type" must be a string');
	if (typeVersion !== undefined && typeof typeVersion !== 'number') {
		throw new StepInputError('"typeVersion" must be a number');
	}
	if (parameters !== undefined && !isJsonObject(parameters)) {
		throw new StepInputError('"parameters" must be an object');
	}
	if (outputs !== undefined && outputs !== null && outputs !== 'all' && outputs !== 'first') {
		throw new StepInputError('"outputs" must be "all" or "first"');
	}
	return {
		name: typeof name === 'string' && name !== '' ? name : type,
		type,
		typeVersion,
		parameters: parameters ?? {},
		inputs: readInputs(items, inputs),
		allOutputs: outputs === 'all',
		credential: readSlot(credential, '"credential"'),
		subNodes: readSubNodes(subNodes),
		onError: readOnError(args.onError),
		runData: readRunData(args.runData),
		poll: args.poll === true,
		subRuns: args.subRuns === true,
		reportError: args.reportError === true,
		...(isJsonObject(args.settings) && typeof args.settings.timezone === 'string'
			? { settings: { timezone: args.settings.timezone } }
			: {}),
	};
}

/**
 * The step data of the shim: the step node, the nodes of the run data and their
 * outputs. An item without lineage pairs with the item at the same position of
 * its parent, as the converted code pairs it.
 */
function stepData(own: GraphNode, runData: NodeStepRunData | undefined): StepData {
	if (!runData) return { graph: { nodes: [own], edges: [] }, outputsByNode: {} };
	const idOf = (name: string) => (name === own.name ? own.id : `run-data:${name}`);
	const nodes: GraphNode[] = [own];
	for (const n of runData.nodes) {
		if (n.name === own.name) continue;
		nodes.push({
			id: idOf(n.name),
			name: n.name,
			type: 'v1-node',
			config: {
				nodeType: n.type,
				typeVersion: n.typeVersion,
				parameters: toNodeParameters(n.parameters),
				continueOnFail: false,
			},
		});
	}
	const known = new Set(nodes.map((n) => n.name));
	const edges: GraphEdge[] = runData.connections
		.filter(([from, , to]) => known.has(from) && known.has(to))
		.map(([from, outputIndex, to, inputIndex]) => ({
			from: idOf(from),
			to: idOf(to),
			outputIndex,
			inputIndex,
		}));
	const outputsByNode: StepData['outputsByNode'] = {};
	for (const [name, runs] of Object.entries(runData.runs)) {
		if (!known.has(name) || name === own.name) continue;
		const lineage = appendLineage(name, runData);
		const parentCount = parentItemCount(name, runData);
		outputsByNode[idOf(name)] = Object.fromEntries(
			runs.map((outputs, run) => [
				run,
				outputs.map((items, output) =>
					items.map((item, index) => ({
						...toStepItem(item),
						pairedItem: (output === 0 ? lineage?.[index] : undefined) ?? {
							// A node with one input item pairs each of its items with it, as v1 nodes
							// do (a read of many rows for one trigger item); else by position.
							item: parentCount === 1 ? 0 : index,
						},
					})),
				),
			]),
		);
	}
	return { graph: { nodes, edges }, outputsByNode };
}

/**
 * The run data as n8n's engine keeps it, for a cluster root: the nodes, their main
 * connections, their runs (with paired items, as `stepData` gives them) and the
 * source of the root's first input.
 */
function clusterContext(root: string, runData: NodeStepRunData): ClusterContext {
	const nodes: INode[] = runData.nodes
		.filter((n) => n.name !== root)
		.map((n) => ({
			id: `run-data:${n.name}`,
			name: n.name,
			type: n.type,
			typeVersion: n.typeVersion,
			position: [0, 0],
			parameters: toNodeParameters(n.parameters),
		}));
	const connections: IConnections = {};
	for (const [from, output, to, input] of runData.connections) {
		const outputs = ((connections[from] ??= {}).main ??= []);
		while (outputs.length <= output) outputs.push([]);
		(outputs[output] ??= []).push({ node: to, type: NodeConnectionTypes.Main, index: input });
	}
	const runs: IRunData = {};
	for (const [name, list] of Object.entries(runData.runs)) {
		if (name === root) continue;
		const lineage = appendLineage(name, runData);
		const parentCount = parentItemCount(name, runData);
		runs[name] = list.map((outputs, run) => ({
			startTime: 0,
			executionTime: 0,
			executionIndex: run,
			source: [],
			executionStatus: 'success',
			data: {
				main: outputs.map((items, output) =>
					items.map((item, index) => ({
						...toN8nItem(item),
						pairedItem: (output === 0 ? lineage?.[index] : undefined) ?? {
							item: parentCount === 1 ? 0 : index,
						},
					})),
				),
			},
		}));
	}
	const source: ISourceData[] = runData.connections
		.filter(([from, , to, input]) => to === root && input === 0 && runs[from] !== undefined)
		.map(([from, output]) => ({
			previousNode: from,
			previousNodeOutput: output,
			previousNodeRun: (runs[from]?.length ?? 1) - 1,
		}));
	return { nodes, connections, runData: runs, source: source.slice(0, 1) };
}

/** The number of items that the parent of `name` (input 0) gave in its latest run, if known. */
function parentItemCount(name: string, runData: NodeStepRunData): number | undefined {
	const parents = runData.connections.filter(([, , to, input]) => to === name && input === 0);
	if (parents.length !== 1) return undefined;
	const [from, output] = parents[0];
	const runs = runData.runs[from];
	return runs?.[runs.length - 1]?.[output]?.length;
}

/**
 * The paired items of a Merge node in "append" mode: its items are the items of
 * input 0, then input 1, and so on, as the latest runs of its parents give them.
 */
function appendLineage(
	name: string,
	runData: NodeStepRunData,
): Array<{ item: number; input?: number }> | undefined {
	const node = runData.nodes.find((n) => n.name === name);
	if (!node || node.type !== 'n8n-nodes-base.merge') return undefined;
	const mode = node.parameters.mode ?? 'append';
	if (mode !== 'append') return undefined;
	const byInput = new Map<number, number>();
	for (const [from, output, to, input] of runData.connections) {
		if (to !== name) continue;
		const runs = runData.runs[from];
		const items = runs?.[runs.length - 1]?.[output] ?? [];
		byInput.set(input, (byInput.get(input) ?? 0) + items.length);
	}
	const out: Array<{ item: number; input?: number }> = [];
	for (const input of [...byInput.keys()].sort((a, b) => a - b)) {
		const count = byInput.get(input) ?? 0;
		for (let item = 0; item < count; item++) out.push(input === 0 ? { item } : { item, input });
	}
	return out;
}

// ---------------------------------------------------------------------------
// Credentials

/**
 * The credentials helper of the fallback host. A node credential id is the
 * name of a credential slot, and the store gives its data.
 * Request signing (`authenticate`) is not supported yet, so nodes that let
 * n8n-core sign HTTP requests cannot run here.
 */
/**
 * The credential types are fixed definitions, so all helpers share one instance and its cache.
 * Each step makes its own helper; a new instance for each step loaded the indexes again.
 */
let sharedCredentialTypes: HostCredentialTypes | undefined;

class SlotCredentialsHelper extends ICredentialsHelper {
	private readonly types = (sharedCredentialTypes ??= new HostCredentialTypes());

	constructor(private readonly store: CredentialStore) {
		super();
	}

	getParentTypes(name: string): string[] {
		return this.types.parentTypes(name);
	}

	isCredentialUsableByNode(): boolean {
		return true;
	}

	/**
	 * Signs a request with the `authenticate` rule of the credential type, as
	 * n8n's `CredentialsHelper.authenticate` does: a function, or generic
	 * properties whose values are expressions over `$credentials`.
	 */
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
		workflow?: Workflow,
		node?: INode,
	): Promise<IHttpRequestOptions> {
		const options = toHttpRequestOptions(requestOptions);
		const rule = this.types.get(typeName)?.authenticate;
		if (rule === undefined) return options;
		if (typeof rule === 'function') return await rule(credentials, options);
		if (rule.type !== 'generic') return options;
		if (!workflow || !node) {
			throw new NodeStepError('The credential needs the workflow and node to sign a request');
		}
		const resolve = (value: string): string => {
			if (!value.startsWith('=')) return value;
			const resolved = workflow.expression.getSimpleParameterValue(
				node,
				value,
				'internal',
				{ $credentials: credentials },
				undefined,
				'',
			);
			return resolved === undefined || resolved === null || resolved === '' ? '' : String(resolved);
		};
		for (const [part, entries] of Object.entries(rule.properties)) {
			if (!isRecordValue(entries)) continue;
			const target = requestPart(options, part);
			for (const [key, value] of Object.entries(entries)) {
				target[resolve(key)] = typeof value === 'string' ? resolve(value) : value;
			}
		}
		return options;
	}

	/**
	 * Fetches a token for a credential type with `preAuthentication` (for
	 * example a client-credentials grant), as n8n's `CredentialsHelper` does:
	 * when the expirable property is empty or the token expired. n8n stores the
	 * token; the host keeps it only for the request, as it has no store.
	 */
	async preAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		_node: INode,
		credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		const type = this.types.get(typeName);
		const expirable = type?.properties.find(
			(p) => p.type === 'hidden' && p.typeOptions?.expirable === true,
		);
		if (!type || !expirable || typeof type.preAuthentication !== 'function') return undefined;
		const current = credentials[expirable.name];
		if (current !== undefined && current !== '' && !credentialsExpired) return undefined;
		const output = await type.preAuthentication.call(helpers, credentials);
		if (output[expirable.name] === undefined) return undefined;
		return Object.assign(credentials, output);
	}

	async runPreAuthentication(
		helpers: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		const type = this.types.get(typeName);
		if (!type || typeof type.preAuthentication !== 'function') return undefined;
		// n8n-core merges the result into the credential data, so the merged data is the same.
		return Object.assign(
			{ ...credentials },
			await type.preAuthentication.call(helpers, credentials),
		);
	}

	async getCredentials(): Promise<never> {
		throw new NodeStepError('The fallback host gives only decrypted credential data');
	}

	async getDecrypted(
		_additionalData: IWorkflowExecuteAdditionalData,
		nodeCredentials: { id: string | null },
	): Promise<ICredentialDataDecryptedObject> {
		if (nodeCredentials.id === null) throw new NodeStepError('The step names no credential slot');
		return toCredentialData(await this.store.get(nodeCredentials.id));
	}

	/**
	 * n8n-core calls these after it refreshes an OAuth2 token or a
	 * pre-authentication token. n8n stores the new data; the host has no store,
	 * so the new token lasts for this step only. Throwing here failed the step
	 * after a good refresh.
	 */
	async updateCredentials(): Promise<void> {}

	async updateCredentialsOauthTokenData(): Promise<void> {}

	getCredentialsProperties(): INodeProperties[] {
		return [];
	}
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The options that `authenticate` signs and returns. Legacy request options
 * (`requestWithAuthentication`) have `uri` and no `url`. n8n-core reads
 * `url ?? uri`, so `url` gets the value of `uri`: an empty `url` would replace it.
 */
export function toHttpRequestOptions(
	options: IHttpRequestOptions | IRequestOptionsSimplified,
): IHttpRequestOptions {
	if ('url' in options && typeof options.url === 'string') return options;
	const uri: unknown = Reflect.get(options, 'uri');
	return Object.assign(options, { url: typeof uri === 'string' ? uri : '' });
}

/** The object of a request part (`headers`, `qs`, `body`, `auth`) that signing writes to. */
function requestPart(options: IHttpRequestOptions, part: string): Record<string, unknown> {
	const current: unknown = Reflect.get(options, part);
	if (isRecordValue(current)) return current;
	const created: Record<string, unknown> = {};
	Reflect.set(options, part, created);
	return created;
}

function toCredentialData(data: JsonObject): ICredentialDataDecryptedObject {
	const result: ICredentialDataDecryptedObject = {};
	for (const [key, value] of Object.entries(data)) {
		if (value !== null) result[key] = toDataValue(value);
	}
	return result;
}

/** Narrows JSON to the n8n data types. JSON `null` inside objects is kept as `null`. */
function toDataValue(value: Exclude<JsonValue, null>): ICredentialDataDecryptedObject[string] {
	if (Array.isArray(value)) {
		if (value.every((entry) => typeof entry === 'string')) return value;
		return value.filter(isJsonObject).map(toCredentialData);
	}
	if (isJsonObject(value)) return toCredentialData(value);
	return value;
}

// ---------------------------------------------------------------------------
// Runner

export interface NodeStepRunnerOptions {
	credentials: CredentialStore;
	nodeTypes?: HostNodeTypes;
	/** The largest base64 text of binary data in one step result. */
	maxBinaryBytes?: number;
	/** The longest run of the code of a task runner job, in milliseconds. */
	codeTimeoutMs?: number;
}

export { disposeExpressionEngine } from './expression-engine';

/** `additionalData['data-table']` when WF_FALLBACK_DATA_TABLES_DIR is set. */
function dataTableData(): { 'data-table'?: { dataTableProxyProvider: DataTableProxyProvider } } {
	const provider = fileDataTableProvider();
	return provider ? { 'data-table': { dataTableProxyProvider: provider } } : {};
}

export class NodeStepRunner {
	private readonly nodeTypes: HostNodeTypes;

	private readonly credentialsHelper: SlotCredentialsHelper;

	private readonly maxBinaryBytes: number;

	private readonly codeTimeoutMs: number | undefined;

	constructor(options: NodeStepRunnerOptions) {
		this.codeTimeoutMs = options.codeTimeoutMs;
		this.nodeTypes = options.nodeTypes ?? new HostNodeTypes();
		this.credentialsHelper = new SlotCredentialsHelper(options.credentials);
		this.maxBinaryBytes = options.maxBinaryBytes ?? maxBinaryBytes();
	}

	/**
	 * Loads the shim, n8n-core and the expression engine with one small Set
	 * step, so that the first real step does not pay for the module loading.
	 */
	async warmUp(): Promise<void> {
		await this.run(
			parseNodeStepArgs({
				name: 'warm-up',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				parameters: {
					assignments: { assignments: [{ id: 'w', name: 'w', value: '={{ 1 }}', type: 'number' }] },
					options: {},
				},
				items: [{}],
			}),
			{ step: 'warm-up', key: 'warm-up' },
		);
	}

	/**
	 * The run clock of the step (`CLOCK-OFFSET`, spec 9) reaches the expressions
	 * of a node through Luxon's `Settings.now` (`expression-engine.ts`). A node
	 * that reads the global `Date` reads the real clock: the steps of several
	 * executions interleave in one worker (`step-worker.ts`), so the host cannot
	 * shift a process-wide clock for one step.
	 */
	async run(args: NodeStepArgs, meta: NodeStepMeta): Promise<JsonObject[]> {
		if (args.type === CONTEXT_TYPE) return [instanceData(args.parameters, meta)];
		if (args.type === SCHEDULE_TYPE) return [scheduleItem(args.parameters)];
		if (args.type === CHECK_TYPE) {
			await hostExtensions().load();
			this.checkReady(args.parameters);
			return [];
		}
		// Community and custom nodes load once, before the first step that may use them.
		await hostExtensions().load();
		// The evaluate step has its own step name; its expressions run as the node `node` names.
		if (args.type === EVALUATE_TYPE && typeof args.parameters.node === 'string') {
			args = { ...args, name: args.parameters.node };
		}
		await ensureExpressionEngine();
		// n8n-core's binary data service in the instance's mode (binary-store.ts).
		await binaryStore();
		if (meta.execution) registerExecution(meta.execution.id, meta.execution.mode);
		// n8n's deduplication store for the nodes that remember items across executions.
		await startDeduplication();

		let outputs: INodeExecutionData[][];
		let subRuns: SubNodeRuns = {};
		let nodeError: string | undefined;
		try {
			outputs = args.poll
				? await this.runPoll(args, meta)
				: args.subNodes.length > 0 || args.type.startsWith(LANGCHAIN_PREFIX)
					? await this.runCluster(
							args,
							args.inputs.map((list) => list.map(toN8nItem)),
							meta,
							(runs) => {
								subRuns = runs;
							},
						)
					: await this.runShim(
							args,
							meta,
							args.reportError
								? (message) => {
										nodeError = message;
									}
								: undefined,
						);
		} catch (error) {
			await recoverExpressionEngine(error);
			// A cluster that fails still gives the runs of its sub-nodes (a model that failed),
			// with the error; the converted code traces them, then fails the step.
			if (args.subRuns) return [{ subRuns, error: describeError(error) }];
			throw new NodeStepError(describeError(error));
		}

		// Under `continueErrorOutput` the error items move to the error output, as n8n's engine does.
		// After a failure of the whole node, v1 passes the input on as it is.
		if (args.onError === 'continueErrorOutput' && !args.poll && nodeError === undefined) {
			outputs = withErrorOutput(outputs, args.inputs);
		}
		const lists = outputs.map((list) =>
			toResultItems(deepCopy((list ?? []).map(normalizeNodeError))),
		);
		await inlineStoredBinary(lists.flat());
		checkBinaryLimit(lists.flat(), this.maxBinaryBytes);
		if (args.subRuns) return [...lists.map((items) => ({ items })), { subRuns }];
		// A failure of the whole node under "continue on fail": v1 passes the input on and
		// records the error on the node. The last entry carries the error.
		if (args.reportError) {
			return [...lists.map((items) => ({ items })), nodeError === undefined ? {} : { nodeError }];
		}
		if (args.allOutputs) return lists.map((items) => ({ items }));
		return lists[0] ?? [];
	}

	/** The readiness check before a manual run (`check-ready.ts`). */
	private checkReady(parameters: JsonObject): void {
		const message = readinessIssues(parameters, this.nodeTypes);
		if (message !== null) throw new NodeStepError(message);
	}

	/**
	 * Polls a polling trigger once, as n8n's engine does in a manual run
	 * (`WorkflowExecute.runNode`: `nodeType.poll` with a `PollContext`).
	 */
	private async runPoll(args: NodeStepArgs, meta: NodeStepMeta): Promise<INodeExecutionData[][]> {
		const typeVersion = args.typeVersion ?? this.nodeTypes.defaultVersion(args.type);
		const node: INode = {
			id: meta.step,
			name: args.name,
			type: args.type,
			typeVersion,
			position: [0, 0],
			parameters: toNodeParameters(args.parameters),
			...(args.credential !== undefined
				? {
						credentials: this.nodeCredentials(
							args.type,
							typeVersion,
							args.credential,
							args.parameters,
						),
					}
				: {}),
		};
		const nodeType = this.nodeTypes.getByNameAndVersion(args.type, typeVersion);
		if (typeof nodeType.poll !== 'function') {
			throw new NodeStepError(`Node "${args.name}" (${args.type}) has no poll function`);
		}
		const workflow = new Workflow({
			id: workflowIdOf(meta),
			nodes: [node],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
			staticData: {},
		});
		const context = new PollContext(
			workflow,
			node,
			this.additionalData(meta.execution?.id ?? meta.key, meta),
			'manual',
			'manual',
		);
		return (await nodeType.poll.call(context)) ?? [[]];
	}

	private async runCluster(
		args: NodeStepArgs,
		inputs: INodeExecutionData[][],
		meta: NodeStepMeta,
		report?: (runs: SubNodeRuns) => void,
	): Promise<INodeExecutionData[][]> {
		const runner = new ClusterRunner({
			nodeTypes: this.nodeTypes,
			additionalData: (executionId) => this.additionalData(executionId, meta),
			nodeCredentials: (type, version, slot) => this.nodeCredentials(type, version, slot),
		});
		const subNodes: SubNodeArgs[] = args.subNodes.map((sub) => ({
			...sub,
			parameters: toNodeParameters(sub.parameters),
		}));
		return await runner.run(
			{
				name: args.name,
				type: args.type,
				typeVersion: args.typeVersion ?? this.nodeTypes.defaultVersion(args.type),
				parameters: toNodeParameters(args.parameters),
				credential: args.credential,
				onError: args.onError,
				inputs,
				subNodes,
				...(args.runData ? { context: clusterContext(args.name, args.runData) } : {}),
				workflowId: workflowIdOf(meta),
			},
			meta,
			report,
		);
	}

	private async runShim(
		args: NodeStepArgs,
		meta: NodeStepMeta,
		onNodeError?: (message: string) => void,
	): Promise<INodeExecutionData[][]> {
		const typeVersion = args.typeVersion ?? this.nodeTypes.defaultVersion(args.type);
		const graphNode: GraphNode = {
			id: meta.step,
			name: args.name,
			type: 'v1-node',
			config: {
				nodeType: args.type,
				typeVersion,
				parameters: toNodeParameters(args.parameters),
				// As in v1: the node handles `continueRegularOutput` for each item
				// (`this.continueOnFail()`), and a failure of the whole node passes its input on.
				continueOnFail:
					args.onError === 'continueRegularOutput' || args.onError === 'continueErrorOutput',
				...(args.onError !== undefined ? { onError: args.onError } : {}),
				// The workflow settings (time zone of `$now`), as the v1 workflow has them.
				...(args.settings !== undefined ? { workflowSettings: args.settings } : {}),
				...(args.credential !== undefined
					? {
							credentials: this.nodeCredentials(
								args.type,
								typeVersion,
								args.credential,
								args.parameters,
							),
						}
					: {}),
			},
		};

		const executor = new V1StepExecutor({
			nodeTypes: onNodeError
				? failureWatch(this.nodeTypes, args.type, onNodeError)
				: this.nodeTypes,
			additionalDataFactory: async ({ executionId }) => this.additionalData(executionId, meta),
			// The signature of the runtime's resume URL, so `$execution.resumeUrl` is the same URL.
			resumeToken: () => urlsOf(meta).token ?? '',
			// The step sees its own items, and the run data that the converter sent.
			loadStepData: async () => stepData(graphNode, args.runData),
			resolveSubWorkflow: async () => {
				throw new NodeStepError('The fallback host cannot run sub-workflows');
			},
		});

		const request: StepExecutionRequest = {
			node: graphNode,
			// An input item pairs with the item at the same position of the parent.
			inputs: args.inputs.map((list) =>
				list.map((item, index) => ({ pairedItem: { item: index }, ...toStepItem(item) })),
			),
			context: {
				executionId: meta.execution?.id ?? meta.key,
				stepId: meta.step,
				workflowId: workflowIdOf(meta),
				mode: meta.execution?.mode === 'test' ? 'manual' : 'production',
				iteration: 0,
				callerContext: { hostMode: 'integrated' },
				responseExpectation: { kind: 'none' },
			},
			respond: noopResponseEmitter,
		};

		const result: StepExecutionResult = await executor.execute(request);
		if (result.outputs === undefined) {
			throw new NodeStepError(
				`Node "${args.name}" asked to wait or to start a sub-execution. The fallback host cannot do this.`,
			);
		}
		// A null slot is an output that got no items.
		const outputs = result.outputs.map((slot) =>
			Array.isArray(slot) ? (slot as INodeExecutionData[]) : [],
		);
		return outputs;
	}

	/** Points every credential type of the node at the slot. The node picks the type. */
	/**
	 * Points every credential type of the node at the slot. The node picks the
	 * type. HTTP Request names its credential type in a parameter.
	 */
	private nodeCredentials(
		type: string,
		version: number,
		slot: string,
		parameters: JsonObject = {},
	): INodeCredentials {
		const description = this.nodeTypes.getByNameAndVersion(type, version).description;
		const credentials: INodeCredentials = {};
		const names = (description.credentials ?? []).map((c) => c.name);
		for (const key of ['nodeCredentialType', 'genericAuthType']) {
			const named = parameters[key];
			if (typeof named === 'string') names.push(named);
		}
		for (const name of names) credentials[name] = { id: slot, name: slot };
		return credentials;
	}

	private additionalData(executionId: string, meta: NodeStepMeta): IWorkflowExecuteAdditionalData {
		const { urls } = urlsOf(meta);
		return {
			executionId,
			credentialsHelper: meta.credentials
				? new SlotCredentialsHelper(meta.credentials)
				: this.credentialsHelper,
			// A proxy without a manager has no secrets.
			externalSecretsProxy: new ExternalSecretsProxy(),
			// Data tables from WF_FALLBACK_DATA_TABLES_DIR (data-table.ts), as n8n's data-table module.
			...dataTableData(),
			currentNodeExecutionIndex: 0,
			restApiUrl: `${urls.instanceBaseUrl}/rest`,
			instanceBaseUrl: urls.instanceBaseUrl,
			formBaseUrl: urls.formBaseUrl,
			formWaitingBaseUrl: urls.formWaitingBaseUrl,
			formTestBaseUrl: `${urls.instanceBaseUrl}/form-test`,
			webhookBaseUrl: urls.webhookBaseUrl,
			webhookWaitingBaseUrl: urls.webhookWaitingBaseUrl,
			webhookTestBaseUrl: `${urls.instanceBaseUrl}/webhook-test`,
			mcpBaseUrl: `${urls.instanceBaseUrl}/mcp`,
			mcpTestBaseUrl: `${urls.instanceBaseUrl}/mcp-test`,
			currentNodeParameters: undefined,
			variables: {},
			// Workflow tools of AI agents run their callee on n8n's v1 engine here.
			executeWorkflow: subWorkflowRunner({
				nodeTypes: this.nodeTypes,
				additionalData: (id) => this.additionalData(id, meta),
			}),
			getRunExecutionData: async () => undefined,
			getRuntimeCredential: async () => undefined,
			logAiEvent: () => {},
			// Code of `JsTaskRunnerSandbox` (Code tools, AI Transform, Sort by code) runs in the host's code runner.
			startRunnerTask: async (_data, jobType, settings, _functions, inputData, node, workflow) => {
				if (jobType !== 'javascript') {
					throw new NodeStepError(`The task runner of the fallback host has no "${jobType}" jobs`);
				}
				const timezone = workflow.settings.timezone;
				const result = await runJsTask(
					settings,
					inputData.main?.[0] ?? [],
					{ name: node.name, ...(typeof timezone === 'string' ? { timezone } : {}) },
					{ timeoutMs: this.codeTimeoutMs },
				);
				// As n8n's task requester: the caller gives the type of the runner's result.
				return await taskResult(result);
			},
		};
	}
}

/**
 * The result of a task runner job as the type that the caller asks for. n8n's
 * task requester does the same: the runner's result is JSON of an unknown type.
 */
function taskResult<R>(result: JsTaskResult): R {
	return result as R;
}

/** The workflow id of the step's execution (from the request frame), for n8n's binary data location. */
function workflowIdOf(meta: NodeStepMeta): string {
	return meta.execution?.workflowId ?? 'compiled-workflow';
}

function describeError(error: unknown): string {
	if (!(error instanceof Error)) return String(error);
	const description: unknown = Reflect.get(error, 'description');
	return typeof description === 'string' && description !== '' && description !== error.message
		? `${error.message}: ${description}`
		: error.message;
}

/**
 * Node types where `type` reports the error of a failed `execute` before it
 * throws, so the host sees the failure that the v1 shim turns into a pass-through
 * under "continue on fail".
 */
function failureWatch(
	nodeTypes: HostNodeTypes,
	type: string,
	onError: (message: string) => void,
): INodeTypes {
	const wrap = (nodeType: INodeType): INodeType => {
		const execute = nodeType.execute;
		if (execute === undefined) return nodeType;
		return Object.create(nodeType, {
			execute: {
				async value(this: unknown, ...rest: unknown[]) {
					try {
						return await Reflect.apply(execute, this, rest);
					} catch (error) {
						onError(describeError(error));
						throw error;
					}
				},
			},
		});
	};
	return {
		getByName: (name) => nodeTypes.getByName(name),
		getByNameAndVersion: (name, version) => {
			const nodeType = nodeTypes.getByNameAndVersion(name, version);
			return name === type ? wrap(nodeType) : nodeType;
		},
		getKnownTypes: () => nodeTypes.getKnownTypes(),
	};
}

/**
 * `handleNodeErrorOutput` of n8n-core's `WorkflowExecute` for `continueErrorOutput`:
 * the items that the node marked as errors (`error`, or a `json` of only `error`,
 * `message` and `details`) move to an extra last output, with the json of the input
 * item they pair with.
 */
/**
 * `normalizeNodeErrors` of n8n's `WorkflowExecute`: an item that carries an error
 * (a node under "continue on fail" pushes `{ json, error }`) becomes `{ error: message }`.
 */
function normalizeNodeError(item: INodeExecutionData): INodeExecutionData {
	const wrapped: unknown = item.json.$error;
	if (item.json.$json !== undefined && typeof wrapped === 'object' && wrapped !== null) {
		return { ...item, json: { error: String(Reflect.get(wrapped, 'message')) } };
	}
	if (item.error !== undefined) return { ...item, json: { error: item.error.message } };
	return item;
}

function withErrorOutput(
	outputs: INodeExecutionData[][],
	inputs: JsonObject[][],
): INodeExecutionData[][] {
	const errors: INodeExecutionData[] = [];
	const kept = outputs.map((items) =>
		items.filter((item) => {
			const jsonError =
				item.json.error !== undefined &&
				Object.keys(item.json).every((key) => ['error', 'message', 'details'].includes(key));
			if (item.error === undefined && !jsonError) return true;
			const paired = Array.isArray(item.pairedItem) ? item.pairedItem[0] : item.pairedItem;
			const index = typeof paired === 'object' && paired !== null ? paired.item : undefined;
			const input = index === undefined ? undefined : inputs[0]?.[index];
			errors.push(input ? { ...item, json: { ...input, ...item.json } } : item);
			return false;
		}),
	);
	return [...kept, errors];
}
