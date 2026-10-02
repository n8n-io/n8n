/**
 * Build-only comparison loop for node contracts: builds each case on each arm
 * (an n8n instance with or without N8N_INSTANCE_AI_NODE_CONTRACTS_ENABLED) and
 * grades the saved workflow deterministically. No execution, mocks or LLM judge.
 *
 * The grader loads the node's own runtime functions from nodes-base/dist and
 * core/dist, and fills parameter defaults from the node description as the
 * Workflow constructor does. A filter is graded on the request the node would
 * send, and downstream expressions are resolved by n8n's expression engine
 * against the output the node would produce.
 *
 * Token counts come from each instance's /metrics counters, so an instance runs one build at a
 * time. Repeat `--arm` with the same name to add instances (lanes) to an arm; lanes run in
 * parallel, capped by --concurrency.
 *
 * Each build also records `diagnostics`: model steps, model vs tool time, per-tool durations,
 * build-workflow outcomes and extra-step counts, from the run's events. Per-step tokens and
 * model time come from the run debug buffer, which an instance keeps only with
 * N8N_INSTANCE_AI_RUN_DEBUG_ENABLED=true (orchestrator steps only). `--server-log <path>` adds
 * sandbox phase times from that instance's log.
 *
 * Usage (instances need N8N_METRICS=true for token counts):
 *   pnpm exec tsx evaluations/node-contracts/fast-loop.ts --case all \
 *     --arm off=http://localhost:5701 --arm off=http://localhost:5703 \
 *     --arm on=http://localhost:5702 --arm on=http://localhost:5704 --iterations 3
 *   pnpm exec tsx evaluations/node-contracts/fast-loop.ts --grade <results.json | workflow.json> [--case <slug>] \
 *     [--instance-db <database.sqlite> ...] [--server-log <n8n.log>] [--composition --arm <name>=<baseUrl>]
 *
 * `--composition` splits each run-debug step's input into blocks and counts each block with the
 * Anthropic count_tokens API (needs ANTHROPIC_API_KEY, else a chars / 3.5 estimate). It is off by
 * default because it sends API requests.
 */
import { isRecord } from '@n8n/utils/is-record';
import type {
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeProperties,
	INodeType,
	INodeTypes,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowDataProxyData,
	NodeParameterValueType,
} from 'n8n-workflow';
import {
	createRunExecutionData,
	executeFilter,
	isFilterValue,
	NodeHelpers,
	Workflow,
	WorkflowDataProxy,
} from 'n8n-workflow';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import pLimit from 'p-limit';

import { actionOfNode, migratedSlotOf, nodeTypeOf } from '@n8n/nodes-base-next';

import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import {
	printComposition,
	tokenComposition,
	tokenCounter,
	type TokenComposition,
} from './token-composition';
import { N8nClient, type WorkflowNodeResponse, type WorkflowResponse } from '../clients/n8n-client';
import { loadWorkflowTestCasesWithFiles, type WorkflowTestCaseWithFile } from '../data/workflows';
import { buildWorkflow } from '../harness/build-workflow';
import { ConversationSeedSchema } from '../harness/conversation-seed';
import { createLogger } from '../harness/logger';
import { extractOutcomeFromEvents } from '../outcome/event-parser';
import type { CapturedEvent, CapturedToolCall } from '../types';

interface Check {
	name: string;
	pass: boolean;
	/** The grader could not evaluate this (e.g. a Code node on the path); excluded from pass. */
	ungraded?: boolean;
	detail: string;
}

const buildPasses = (checks: Check[]) => checks.every((check) => check.pass || check.ungraded);

type Grader = (workflow: WorkflowResponse) => Promise<Check[]>;

const nodesBaseRequire = createRequire(
	path.resolve(__dirname, '../../../../nodes-base/package.json'),
);
const coreRequire = createRequire(path.resolve(__dirname, '../../../../core/package.json'));
const nextRequire = createRequire(path.resolve(__dirname, '../../../nodes-base-next/package.json'));

const NEXT_PREFIX = '@n8n/nodes-base-next.';
const NEXT_NOTION_GET_ALL = `${NEXT_PREFIX}notionDatabasePageGetAll`;
const NEXT_HTTP_GET = `${NEXT_PREFIX}httpRequestGet`;
const NEXT_HTTP_SEND = `${NEXT_PREFIX}httpRequestSend`;
const NEXT_SHEETS_READ = `${NEXT_PREFIX}googleSheetsSheetRead`;
const NEXT_SHEETS_APPEND = `${NEXT_PREFIX}googleSheetsSheetAppend`;
const NEXT_SHEETS_UPSERT = `${NEXT_PREFIX}googleSheetsSheetAppendOrUpdate`;
const NEXT_GMAIL_SEND = `${NEXT_PREFIX}gmailMessageSend`;
const NEXT_GMAIL_GET_ALL = `${NEXT_PREFIX}gmailMessageGetAll`;
const NEXT_GEMINI_MESSAGE = `${NEXT_PREFIX}googleGeminiTextMessage`;
const NEXT_SET = `${NEXT_PREFIX}coreSet`;
const NEXT_IF = `${NEXT_PREFIX}coreIf`;
const NEXT_FILTER = `${NEXT_PREFIX}coreFilter`;

const isHttpRequest = (node: WorkflowNodeResponse) =>
	['n8n-nodes-base.httpRequest', NEXT_HTTP_GET, NEXT_HTTP_SEND].includes(node.type);

function loadDist(requireFrom: NodeJS.Require, file: string, names: string[]) {
	const loaded: unknown = requireFrom(file);
	if (!isRecord(loaded) || names.some((name) => typeof loaded[name] !== 'function')) {
		throw new Error(`Build the package first: ${names.join(', ')} not found in ${file}`);
	}
	return loaded;
}

const invoke = (fn: unknown, thisArg: unknown, ...args: unknown[]): unknown =>
	typeof fn === 'function' ? fn.apply(thisArg, args) : undefined;

/** The Notion node's own filter mapping and output simplification, per typeVersion. */
function notionRuntime() {
	const shared = loadDist(nodesBaseRequire, './dist/nodes/Notion/shared/GenericFunctions.js', [
		'mapFilters',
		'simplifyObjects',
	]);
	const v3 = loadDist(
		nodesBaseRequire,
		'./dist/nodes/Notion/v3/actions/databasePage/DataSourceFilters.js',
		['mapDataSourceFilters'],
	);
	return {
		/** The `filter` body the node sends for manual conditions. */
		filterBody: (conditions: unknown[], matchType: unknown, version: number): unknown =>
			version >= 3
				? invoke(v3.mapDataSourceFilters, undefined, conditions, matchType, 'UTC')
				: {
						[matchType === 'anyFilter' ? 'or' : 'and']: conditions.map((condition) =>
							invoke(shared.mapFilters, undefined, [condition], 'UTC'),
						),
					},
		simplifyObjects: (pages: unknown[], version: number): unknown =>
			invoke(shared.simplifyObjects, undefined, pages, false, version),
	};
}

interface NodeDescription {
	name: string;
	version: number | number[];
	properties: INodeProperties[];
}

const isNodeDescription = (value: unknown): value is NodeDescription =>
	isRecord(value) &&
	typeof value.name === 'string' &&
	Array.isArray(value.properties) &&
	(typeof value.version === 'number' || Array.isArray(value.version));

const isNodeParameters = (value: unknown): value is INodeParameters => isRecord(value);

const isParameterValue = (value: unknown): value is NodeParameterValueType =>
	['string', 'number', 'boolean', 'object', 'undefined'].includes(typeof value);

/** The node's parameters with description defaults filled in, as the Workflow constructor does. */
function withDefaults(node: WorkflowNodeResponse): INodeParameters {
	// nodes-base-next defaults ('{}' and 0) fail the node's own input check. Grade the saved parameters.
	if (node.type.startsWith(NEXT_PREFIX)) {
		return isNodeParameters(node.parameters) ? node.parameters : {};
	}
	const version = node.typeVersion ?? 1;
	const loaded: unknown = nodesBaseRequire('./dist/types/nodes.json');
	const description = (Array.isArray(loaded) ? loaded : [])
		.filter(isNodeDescription)
		.find(
			(candidate) =>
				`n8n-nodes-base.${candidate.name}` === node.type &&
				[candidate.version].flat().includes(version),
		);
	if (!description) throw new Error(`No description for ${node.type} v${version} in nodes-base`);
	return (
		NodeHelpers.getNodeParameters(
			description.properties,
			isNodeParameters(node.parameters) ? node.parameters : {},
			true,
			false,
			{ typeVersion: version },
			null,
		) ?? {}
	);
}

const asText = (value: unknown): string =>
	typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value);

const valueAt = (value: unknown, dottedPath: string): unknown =>
	dottedPath.split('.').reduce<unknown>((at, key) => (isRecord(at) ? at[key] : undefined), value);

// ── Expression evaluation ───────────────────────────────────────────────────

const stubNodeType: INodeType = {
	description: {
		displayName: 'Stub',
		name: 'stub',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
	},
};

const stubNodeTypes: INodeTypes = {
	getByName: () => stubNodeType,
	getByNameAndVersion: () => stubNodeType,
	getKnownTypes: () => ({}),
};

function stubNode(name: string): INode {
	return { id: name, name, type: 'stub', typeVersion: 1, position: [0, 0], parameters: {} };
}

type Evaluate = (
	value: NodeParameterValueType,
	itemIndex: number,
	additionalKeys?: IWorkflowDataProxyAdditionalKeys,
) => NodeParameterValueType;

/** Items a node emitted; `paired[i]` is the index of the input item that produced item `i`. */
interface Emitted {
	items: IDataObject[];
	paired?: number[];
}

/** One node on the walked path and the items it emitted. */
interface PathStep extends Emitted {
	name: string;
}

const sourceStep = (name: string, items: IDataObject[]): PathStep[] => [{ name, items }];

/** The `$`-variables of n8n code for one item, e.g. `$json` and `$input`. */
type DataProxy = (itemIndex: number) => IWorkflowDataProxyData;

/**
 * Runs `run` with an evaluator that resolves values as n8n would on `targetName`, the child of the
 * last node of `walked`. Every node of `walked` is in the run data and the chain of connections,
 * so `$('Earlier node')` resolves.
 */
async function withChildContext<T>(
	walked: PathStep[],
	targetName: string,
	run: (evaluate: Evaluate, proxy: DataProxy) => Promise<T> | T,
	executeOnce = false,
): Promise<T> {
	const chain = [...walked.map((step) => step.name), targetName];
	const connections: IConnections = Object.fromEntries(
		chain
			.slice(0, -1)
			.map((name, index) => [
				name,
				{ main: [[{ node: chain[index + 1], type: 'main', index: 0 }]] },
			]),
	);
	const workflow = new Workflow({
		nodes: chain.map(stubNode),
		connections,
		active: false,
		nodeTypes: stubNodeTypes,
	});
	const runExecutionData: IRunExecutionData = createRunExecutionData({
		resultData: {
			runData: Object.fromEntries(
				walked.map((step, index) => [
					step.name,
					[
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: index,
							source:
								index === 0
									? []
									: [
											{
												previousNode: walked[index - 1].name,
												previousNodeOutput: 0,
												previousNodeRun: 0,
											},
										],
							data: {
								main: [
									step.items.map((json, item) => ({
										json,
										pairedItem: { item: index === 0 ? 0 : (step.paired?.[item] ?? item) },
									})),
								],
							},
						},
					],
				]),
			),
		},
	});
	const { name: sourceName, items } = walked[walked.length - 1];
	const input: INodeExecutionData[] = (executeOnce ? items.slice(0, 1) : items).map(
		(json, item) => ({ json, pairedItem: { item } }),
	);
	const executeData = {
		node: stubNode(targetName),
		data: { main: [input] },
		source: { main: [{ previousNode: sourceName, previousNodeOutput: 0, previousNodeRun: 0 }] },
	};
	const proxy: DataProxy = (itemIndex) =>
		new WorkflowDataProxy(
			workflow,
			runExecutionData,
			0,
			itemIndex,
			targetName,
			input,
			{},
			'manual',
			{},
			executeData,
		).getDataProxy();
	return await workflow.expression.withIsolate(
		async () =>
			await run(
				(value, itemIndex, additionalKeys = {}) =>
					workflow.expression.getParameterValue(
						value,
						runExecutionData,
						0,
						itemIndex,
						targetName,
						input,
						'manual',
						additionalKeys,
						executeData,
					),
				proxy,
			),
	);
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Resolves `value` for each of `items` on `targetName`; errors become `<error: …>` strings. */
async function evaluateOnChild(
	value: unknown,
	walked: PathStep[],
	targetName: string,
	executeOnce = false,
): Promise<unknown[]> {
	const { items } = walked[walked.length - 1];
	return await withChildContext(
		walked,
		targetName,
		(evaluate) =>
			(executeOnce ? items.slice(0, 1) : items).map((_, itemIndex) => {
				try {
					return typeof value === 'string' ? evaluate(value, itemIndex) : value;
				} catch (error) {
					return `<error: ${errorText(error)}>`;
				}
			}),
		executeOnce,
	);
}

function parentName(workflow: WorkflowResponse, nodeName: string): string {
	return (
		Object.keys(workflow.connections).find((source) =>
			childrenOf(workflow, source).some((child) => child.name === nodeName),
		) ?? 'Trigger'
	);
}

/** The parameters the node reads at runtime for one empty input item: defaults filled, expressions resolved. */
async function runtimeParameters(
	workflow: WorkflowResponse,
	node: WorkflowNodeResponse,
): Promise<INodeParameters> {
	const parameters = withDefaults(node);
	const resolved = await withChildContext(
		sourceStep(parentName(workflow, node.name), [{}]),
		node.name,
		(evaluate) => evaluate(parameters, 0),
	);
	return isNodeParameters(resolved) ? resolved : {};
}

function parseJsonBody(body: unknown): unknown {
	if (typeof body !== 'string') return body;
	try {
		const parsed: unknown = JSON.parse(body);
		return parsed;
	} catch {
		return `<invalid JSON: ${body.slice(0, 80)}>`;
	}
}

/** The body a nodes-base-next HTTP node would send: `body` resolved per item, then its payload. */
async function nextHttpBodies(http: WorkflowNodeResponse, walked: PathStep[]): Promise<unknown[]> {
	const body = http.parameters?.body;
	const once = http.executeOnce === true;
	const { items } = walked[walked.length - 1];
	return await withChildContext(
		walked,
		http.name,
		(evaluate) =>
			(once ? items.slice(0, 1) : items).map((_, itemIndex) => {
				try {
					const resolved: unknown = isParameterValue(body) ? evaluate(body, itemIndex) : body;
					const sent = typeof resolved === 'string' ? parseJsonBody(resolved) : resolved;
					if (!isRecord(sent)) return {};
					if (sent.kind === 'json') return parseJsonBody(sent.json);
					return sent.kind === 'form' ? sent.fields : sent.kind === 'text' ? sent.text : {};
				} catch (error) {
					return `<error: ${errorText(error)}>`;
				}
			}),
		once,
	);
}

/** The JSON body an HTTP Request node would send for each input item. */
async function httpBodies(http: WorkflowNodeResponse, walked: PathStep[]): Promise<unknown[]> {
	if (http.type.startsWith(NEXT_PREFIX)) return await nextHttpBodies(http, walked);
	const parameters = http.parameters ?? {};
	const once = http.executeOnce === true;
	const { items } = walked[walked.length - 1];
	if (parameters.specifyBody === 'json') {
		const resolved = await evaluateOnChild(parameters.jsonBody, walked, http.name, once);
		return resolved.map(parseJsonBody);
	}
	const bodyParameters = isRecord(parameters.bodyParameters)
		? parameters.bodyParameters.parameters
		: [];
	const pairs = (Array.isArray(bodyParameters) ? bodyParameters : []).filter(isRecord);
	const columns = await Promise.all(
		pairs.map(async (pair) => await evaluateOnChild(pair.value, walked, http.name, once)),
	);
	return (once ? items.slice(0, 1) : items).map((_, itemIndex) =>
		Object.fromEntries(
			pairs.map((pair, column) => [String(pair.name), columns[column][itemIndex]]),
		),
	);
}

/** Children on all outputs of `nodeName`, or on output `outputIndex` only. */
function childrenOf(
	workflow: WorkflowResponse,
	nodeName: string,
	outputIndex?: number,
): WorkflowNodeResponse[] {
	const outputs = workflow.connections[nodeName];
	const main = isRecord(outputs) && Array.isArray(outputs.main) ? outputs.main : [];
	const names = (outputIndex === undefined ? main : main.slice(outputIndex, outputIndex + 1))
		.flatMap((branch: unknown) => (Array.isArray(branch) ? branch : []))
		.filter(isRecord)
		.map((connection) => String(connection.node));
	return workflow.nodes.filter((node) => names.includes(node.name));
}

const isDataObject = (value: unknown): value is IDataObject => isRecord(value);

const sortedJson = (value: unknown): string =>
	JSON.stringify(value, (_key, v: unknown) =>
		isRecord(v) && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).sort())
			: // Rounds away float noise such as 1.1 * 3 = 3.3000000000000003.
				typeof v === 'number'
				? Math.round(v * 1e9) / 1e9
				: v,
	);

/** The input item index in a runtime `pairedItem` (a number, an object or an array of them). */
function pairedIndex(pairedItem: unknown): number | undefined {
	const first: unknown = Array.isArray(pairedItem) ? pairedItem[0] : pairedItem;
	const index = typeof first === 'number' ? first : valueAt(first, 'item');
	return typeof index === 'number' ? index : undefined;
}

/**
 * Nodes the grader runs on the path to the POST with their own execute code. They need no
 * credentials and have no side effects. The contract Code node runs its code in runJavaScriptJob.
 */
const RUNNABLE_NODE_TYPES = new Set([
	...[
		'set',
		'if',
		'filter',
		'limit',
		'splitOut',
		'aggregate',
		'summarize',
		'sort',
		'removeDuplicates',
		'itemLists',
	].map((name) => `n8n-nodes-base.${name}`),
	...[
		'coreSet',
		'coreIf',
		'coreFilter',
		'coreLimit',
		'coreSplitOut',
		'coreAggregate',
		'coreSummarize',
		'coreSort',
		'coreRemoveDuplicates',
		'codeJavaScript',
	].map((name) => `${NEXT_PREFIX}${name}`),
]);

/** Nodes whose output 0 holds the items that match: the true branch or the kept items. */
const FILTER_NODE_TYPES = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.filter',
	NEXT_IF,
	NEXT_FILTER,
]);

/**
 * What the JavaScript task runner returns for the Code `settings` that the contract Code node
 * sends. The code runs in the in-process sandbox of the legacy Code node, with the data proxy of
 * each item, as the runner runs it.
 */
async function runJavaScriptJob(
	settings: unknown,
	items: INodeExecutionData[],
	proxy: DataProxy,
): Promise<unknown> {
	const { JavaScriptSandbox } = loadDist(
		nodesBaseRequire,
		'./dist/nodes/Code/JavaScriptSandbox.js',
		['JavaScriptSandbox'],
	);
	const code = asText(valueAt(settings, 'code'));
	const run = async (itemIndex: number, extra: Record<string, unknown>): Promise<unknown> => {
		const sandbox: unknown =
			typeof JavaScriptSandbox === 'function'
				? Reflect.construct(JavaScriptSandbox, [{ ...proxy(itemIndex), ...extra }, code, {}])
				: undefined;
		if (!isRecord(sandbox)) throw new Error('JavaScriptSandbox did not construct');
		const result: unknown = await invoke(sandbox.runCode, sandbox);
		return result;
	};
	if (valueAt(settings, 'nodeMode') === 'runOnceForAllItems') {
		const result = await run(0, { items });
		return result === null ? [] : result;
	}
	const start = Number(valueAt(settings, 'chunk.startIndex') ?? 0);
	const count = Number(valueAt(settings, 'chunk.count') ?? items.length);
	const indexes = Array.from({ length: count }, (_, at) => start + at);
	const results = await Promise.all(
		indexes.map(async (index) => await run(index, { item: items[index] })),
	);
	// The runner drops empty results and keeps the `json` of a wrapped item.
	return results.flatMap((result, at) =>
		result === null || result === undefined
			? []
			: [
					{
						json: isRecord(result) && 'json' in result ? result.json : result,
						pairedItem: { item: indexes[at] },
					},
				],
	);
}

/** The dist class of a nodes-base-next node: `dist/nodes/<Pascal>.node.js` exports `<Pascal>`. */
function nextNodeClass(type: string) {
	const name = type.slice(NEXT_PREFIX.length);
	const className = `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
	return loadDist(nextRequire, `./dist/nodes/${className}.node.js`, [className])[className];
}

/** The node class of a nodes-base node, found in `known/nodes.json` as the node loader does. */
function nodesBaseClass(type: string) {
	const known: unknown = nodesBaseRequire('./dist/known/nodes.json');
	const entry = isRecord(known) ? known[type.replace(/^n8n-nodes-base\./, '')] : undefined;
	if (!isRecord(entry)) throw new Error(`${type} not found in nodes-base`);
	const className = String(entry.className);
	return loadDist(nodesBaseRequire, `./${String(entry.sourcePath)}`, [className])[className];
}

/** The node type for the saved typeVersion, loaded from the package dist. */
function loadNodeType(node: WorkflowNodeResponse): Record<string, unknown> {
	const nodeClass = node.type.startsWith(NEXT_PREFIX)
		? nextNodeClass(node.type)
		: nodesBaseClass(node.type);
	const instance: unknown = typeof nodeClass === 'function' ? Reflect.construct(nodeClass, []) : {};
	if (!isRecord(instance)) throw new Error(`${node.type} did not construct`);
	const versioned: unknown =
		typeof instance.getNodeType === 'function'
			? invoke(instance.getNodeType, instance, node.typeVersion ?? 1)
			: instance;
	if (!isRecord(versioned)) throw new Error(`${node.type} has no v${node.typeVersion ?? 1}`);
	return versioned;
}

/**
 * Outputs of `node` after `walked`, run by the node's own execute code at the saved typeVersion.
 * `extra` adds context members, e.g. `helpers` for nodes that send requests.
 */
async function executeOutputs(
	node: WorkflowNodeResponse,
	walked: PathStep[],
	extra?: Record<string, unknown>,
): Promise<Emitted[]> {
	const { items } = walked[walked.length - 1];
	const instance = loadNodeType(node);
	const parameters = withDefaults(node);
	const once = node.executeOnce === true;
	const inputData = (once ? items.slice(0, 1) : items).map((json, item) => ({
		json,
		pairedItem: { item },
	}));
	const output = await withChildContext(
		walked,
		node.name,
		async (evaluate, proxy) => {
			const context = {
				getInputData: () => inputData,
				getNodeParameter: (
					name: string,
					itemIndex: number,
					fallback?: unknown,
					options?: unknown,
				) => {
					const raw = valueAt(parameters, name) ?? fallback;
					if (valueAt(options, 'rawExpressions') === true || !isParameterValue(raw)) return raw;
					const value = evaluate(raw, itemIndex);
					// Core runs a filter parameter read with extractValue and returns its boolean result.
					return valueAt(options, 'extractValue') === true && isFilterValue(value)
						? executeFilter(value, { itemIndex })
						: value;
				},
				evaluateExpression: (expression: string, itemIndex: number) =>
					evaluate(`=${expression}`, itemIndex),
				getNode: () => ({ ...stubNode(node.name), typeVersion: node.typeVersion ?? 1, parameters }),
				getMode: () => 'manual',
				continueOnFail: () => false,
				getWorkflowSettings: () => ({}),
				addExecutionHints: () => undefined,
				// The node-sdk runtime records the contract version after each run.
				setMetadata: () => undefined,
				// The contract Code node sends its code to the task runner.
				startJob: async (language: string, settings: unknown) =>
					language === 'javascript'
						? { ok: true, result: await runJavaScriptJob(settings, inputData, proxy) }
						: { ok: false, error: { message: `The grader runs no ${language} code` } },
				...extra,
			};
			return await invoke(instance.execute, context);
		},
		once,
	);
	return (Array.isArray(output) ? output : []).map((branch: unknown) => {
		const emitted = (Array.isArray(branch) ? branch : [])
			.filter(isRecord)
			.filter((item) => isDataObject(item.json));
		return {
			items: emitted.map((item) => item.json).filter(isDataObject),
			paired: emitted.map(
				(item, index) =>
					pairedIndex(item.pairedItem) ?? (emitted.length === items.length ? index : 0),
			),
		};
	});
}

/** Items on output 0 of `node` after `walked` (for IF the true branch, for Filter the kept items). */
async function firstOutput(node: WorkflowNodeResponse, walked: PathStep[]): Promise<Emitted> {
	const [output] = await executeOutputs(node, walked);
	return output ?? { items: [] };
}

const toDataValue = (value: unknown): IDataObject[string] =>
	typeof value === 'string' ||
	typeof value === 'number' ||
	typeof value === 'boolean' ||
	value === null
		? value
		: isDataObject(value)
			? value
			: Array.isArray(value)
				? value.filter(isDataObject)
				: value === undefined
					? undefined
					: JSON.stringify(value);

/** The node to walk to, and its names in path messages. */
interface WalkTarget {
	matches: (node: WorkflowNodeResponse) => boolean;
	/** Used in "no <name> after …". */
	name: string;
	/** Used in "between <start> and <role>". */
	role: string;
}

const HTTP_TARGET: WalkTarget = {
	matches: isHttpRequest,
	name: 'HTTP Request',
	role: 'the POST',
};

/**
 * Walks from the last step of `startWalked` through RUNNABLE_NODE_TYPES nodes to the first node
 * that `target` matches, carrying items along. After an IF or Filter it follows output 0 only;
 * `filtered` is that output. `walked` holds `startWalked` and every node after it up to the
 * parent of `node`, with the items each emitted.
 */
async function followTo(workflow: WorkflowResponse, startWalked: PathStep[], target: WalkTarget) {
	const walked = [...startWalked];
	const { name: startName } = walked[walked.length - 1];
	let outputIndex: number | undefined;
	let filtered: IDataObject[] | undefined;
	const path: string[] = [];
	for (let hop = 0; hop < 5; hop++) {
		const { name: sourceName } = walked[walked.length - 1];
		const [child] = childrenOf(workflow, sourceName, outputIndex);
		if (!child)
			return {
				node: undefined,
				walked,
				filtered,
				path: `no ${target.name} after ${[startName, ...path].join(' → ')}`,
			};
		if (target.matches(child))
			return {
				node: child,
				walked,
				filtered,
				path: path.length ? `via ${path.join(' → ')}:` : '',
			};
		if (!RUNNABLE_NODE_TYPES.has(child.type)) {
			return {
				node: undefined,
				walked,
				filtered,
				path: `ungraded: ${child.type} v${child.typeVersion ?? 1} between ${startName} and ${target.role}`,
			};
		}
		const emitted = await firstOutput(child, walked);
		const isFilter = FILTER_NODE_TYPES.has(child.type);
		if (isFilter) filtered = emitted.items;
		outputIndex = isFilter ? 0 : undefined;
		path.push(child.name);
		walked.push({ name: child.name, ...emitted });
	}
	return { node: undefined, walked, filtered, path: `no ${target.name} within 5 hops` };
}

const followToHttp = async (
	workflow: WorkflowResponse,
	startName: string,
	startItems: IDataObject[],
) => await followTo(workflow, sourceStep(startName, startItems), HTTP_TARGET);

// ── Graders ─────────────────────────────────────────────────────────────────

const NOTION_USER = '7c3e1a2b-4d5f-4a6b-8c9d-0e1f2a3b4c5d';

function notionPage(id: string, title: string) {
	return {
		object: 'page',
		id,
		url: `https://www.notion.so/${id.replace(/-/g, '')}`,
		parent: { type: 'data_source_id', data_source_id: '5b9e2c1d-0a7f-4c3e-9d21-7f6a8b9c0d1e' },
		properties: {
			Name: {
				id: 'title',
				type: 'title',
				title: [{ type: 'text', plain_text: title, text: { content: title } }],
			},
			Status: { id: 's', type: 'status', status: { name: 'Done' } },
			Completed: {
				id: 'c',
				type: 'date',
				date: { start: '2026-09-10', end: null, time_zone: null },
			},
			Owners: {
				id: 'o',
				type: 'people',
				people: [
					{
						object: 'user',
						id: NOTION_USER,
						name: 'Dana Scully',
						type: 'person',
						person: { email: 'dana@acme.test' },
					},
					{
						object: 'user',
						id: 'u2',
						name: 'Fox Mulder',
						type: 'person',
						person: { email: 'fox@acme.test' },
					},
				],
			},
		},
	};
}

/** The URL of a request option object, with its `qs` added. */
function requestUrl(request: unknown): string {
	const url = new URL(asText(valueAt(request, 'url')));
	const qs = valueAt(request, 'qs');
	const params = new URLSearchParams([
		...url.searchParams,
		...Object.entries(isRecord(qs) ? qs : {}).flatMap(
			([key, value]): Array<[string, string]> =>
				value === undefined || value === null ? [] : [[key, asText(value)]],
		),
	]);
	return `${url.origin}${url.pathname}${params.size ? `?${params.toString()}` : ''}`;
}

/** `this.helpers` request functions answered by `respond`; each request is added to `requests`. */
function fakeApiHelpers(respond: (request: unknown) => unknown, requests: unknown[] = []) {
	const answer = async (options: unknown) => {
		requests.push(options);
		const body: unknown = await Promise.resolve(respond(options));
		// n8n answers a full-response request with the body, headers and status code.
		return valueAt(options, 'returnFullResponse') === true
			? { body, headers: {}, statusCode: 200 }
			: body;
	};
	return {
		httpRequest: answer,
		httpRequestWithAuthentication: async (_credentialType: string, options: unknown) =>
			await answer(options),
	};
}

/**
 * What a nodes-base-next sub-node supplies to its root node after `walked`, run by its own supply
 * code against a fake API that `respond` answers. Its parameters resolve against root item 0.
 */
async function nextSupply(
	node: WorkflowNodeResponse,
	walked: PathStep[],
	respond: (request: unknown) => unknown,
): Promise<unknown> {
	const instance = loadNodeType(node);
	const parameters = withDefaults(node);
	const supplied = await withChildContext(
		walked,
		node.name,
		async (evaluate) =>
			await invoke(
				instance.supplyData,
				{
					getNode: () => ({
						...stubNode(node.name),
						typeVersion: node.typeVersion ?? 1,
						parameters,
					}),
					getNodeParameter: (name: string, itemIndex: number, fallback?: unknown) => {
						const raw = valueAt(parameters, name) ?? fallback;
						return isParameterValue(raw) ? evaluate(raw, itemIndex) : raw;
					},
					continueOnFail: () => false,
					helpers: fakeApiHelpers(respond),
					// The node-sdk runtime records each call of the capability as a run of the sub-node.
					addInputData: () => ({ index: 0 }),
					addOutputData: () => undefined,
				},
				0,
			),
	);
	return valueAt(supplied, 'response');
}

/** The sub-node that supplies `connectionType` (e.g. `ai_languageModel`) to `nodeName`. */
const subNodeOf = (workflow: WorkflowResponse, nodeName: string, connectionType: string) =>
	workflow.nodes.find((candidate) => {
		const branches = valueAt(workflow.connections[candidate.name], connectionType);
		return (Array.isArray(branches) ? branches : [])
			.flatMap((branch: unknown) => (Array.isArray(branch) ? branch : []))
			.some((connection) => isRecord(connection) && connection.node === nodeName);
	});

/**
 * Runs a nodes-base-next node after `walked` with its own action code against a fake API.
 * `respond` answers each request (it may throw); `requests` holds every request sent.
 */
async function runNext(
	node: WorkflowNodeResponse,
	walked: PathStep[],
	respond: (request: unknown) => unknown,
) {
	const requests: unknown[] = [];
	try {
		const [output] = await executeOutputs(node, walked, {
			helpers: fakeApiHelpers(respond, requests),
		});
		return { output: output ?? { items: [] }, requests, error: undefined };
	} catch (error) {
		return { output: { items: [] }, requests, error: errorText(error) };
	}
}

/** The `filter` the nodes-base-next Notion node sends, run by its own execute code on a fake API. */
async function nextNotionFilter(
	workflow: WorkflowResponse,
	notion: WorkflowNodeResponse,
): Promise<unknown> {
	const requests: unknown[] = [];
	try {
		await executeOutputs(notion, sourceStep(parentName(workflow, notion.name), [{}]), {
			helpers: fakeApiHelpers(() => ({ results: [] }), requests),
		});
	} catch (error) {
		return `<node throws: ${errorText(error)}>`;
	}
	const query = requests.find((request) => asText(valueAt(request, 'url')).endsWith('/query'));
	return valueAt(query, 'body.filter') ?? {};
}

/** The `filter` body the Notion node of either family would send. */
async function sentNotionFilter(
	workflow: WorkflowResponse,
	notion: WorkflowNodeResponse,
): Promise<unknown> {
	if (notion.type === NEXT_NOTION_GET_ALL) return await nextNotionFilter(workflow, notion);
	const parameters = notion.parameters ?? {};
	const conditions = isRecord(parameters.filters) ? parameters.filters.conditions : undefined;
	try {
		if (parameters.filterType === 'manual') {
			return notionRuntime().filterBody(
				Array.isArray(conditions) ? conditions : [],
				parameters.matchType,
				notion.typeVersion ?? 2,
			);
		}
		if (parameters.filterType === 'json' && typeof parameters.filterJson === 'string') {
			const parsed: unknown = JSON.parse(parameters.filterJson.replace(/^=/, ''));
			return parsed;
		}
		return {};
	} catch (error) {
		return `<node throws: ${errorText(error)}>`;
	}
}

/** The items a Notion getAll node of either family emits for the raw API `pages`. */
function notionOutputItems(notion: WorkflowNodeResponse, pages: unknown[]): IDataObject[] {
	const isNext = notion.type === NEXT_NOTION_GET_ALL;
	// The next node emits the v3 simplified page.
	const items =
		notion.parameters?.simple === false && !isNext
			? pages
			: notionRuntime().simplifyObjects(pages, isNext ? 3 : (notion.typeVersion ?? 2));
	return (Array.isArray(items) ? items : []).filter(isDataObject);
}

const isNotionGetAll = (node: WorkflowNodeResponse) =>
	(node.type === 'n8n-nodes-base.notion' && node.parameters?.operation === 'getAll') ||
	node.type === NEXT_NOTION_GET_ALL;

/** What a Notion case adds to the base filter-and-read task. */
interface NotionTask {
	/** More filter conditions, each as a list of accepted forms. */
	conditions: unknown[][];
	/** More POST body fields, by page title. */
	body: (title: string) => Record<string, unknown>;
	/** The edit keeps the typed nodes-base-next nodes of the seed. */
	typed: boolean;
}

const notionGrader =
	(task: NotionTask): Grader =>
	async (workflow) => {
		const notion = workflow.nodes.find(isNotionGetAll);
		if (!notion) return [{ name: 'notion-node', pass: false, detail: 'no Notion getAll node' }];
		const isNext = notion.type === NEXT_NOTION_GET_ALL;
		const sent = await sentNotionFilter(workflow, notion);
		// The legacy v3 node sends dates as UTC timestamps; the next node sends the date as given.
		const completedDates = isNext
			? ['2026-09-01', '2026-09-01T00:00:00Z']
			: ['2026-09-01T00:00:00Z'];
		const expected = [
			[{ property: 'Status', status: { equals: 'Done' } }],
			completedDates.map((date) => ({ property: 'Completed', date: { on_or_after: date } })),
			[{ property: 'Owners', people: { contains: NOTION_USER } }],
			...task.conditions,
		];
		const sentConditions = isRecord(sent) && Array.isArray(sent.and) ? sent.and : [];
		const sentKeys = sentConditions.map(sortedJson).sort();
		const filterPass =
			sentConditions.length === expected.length &&
			expected.every((choices) =>
				choices.some((condition) => sentKeys.includes(sortedJson(condition))),
			);

		const outputItems = notionOutputItems(notion, [
			notionPage('p1', 'Ship billing v3'),
			notionPage('p2', 'Retire old API'),
		]);

		const {
			node: http,
			walked,
			path: via,
		} = await followToHttp(workflow, notion.name, outputItems);
		const bodies = http ? await httpBodies(http, walked) : [];
		const expectBody = (name: string) => (body: unknown) =>
			isRecord(body) &&
			body.name === name &&
			typeof body.owners === 'string' &&
			body.owners.replace(/\s/g, '') === 'dana@acme.test,fox@acme.test' &&
			body.completed === '2026-09-10' &&
			Object.entries(task.body(name)).every(([key, value]) => body[key] === value);
		const readsPass =
			bodies.length === 2 &&
			expectBody('Ship billing v3')(bodies[0]) &&
			expectBody('Retire old API')(bodies[1]);

		const types = [notion.type, http?.type ?? 'no HTTP Request'];
		return [
			{ name: 'filter', pass: filterPass, detail: JSON.stringify(sent) },
			http
				? { name: 'reads', pass: readsPass, detail: `${via} ${JSON.stringify(bodies)}` }
				: { name: 'reads', pass: false, ungraded: true, detail: via },
			...(task.typed
				? [
						{
							name: 'typed',
							pass: isNext && http?.type === NEXT_HTTP_SEND,
							detail: types.join(', '),
						},
					]
				: []),
		];
	};

const gradeNotionFilterAndRead = notionGrader({ conditions: [], body: () => ({}), typed: false });

const NOTION_PAGE_URLS: Record<string, string> = {
	'Ship billing v3': 'https://www.notion.so/p1',
	'Retire old API': 'https://www.notion.so/p2',
};

const gradeNotionEditAddFilter = notionGrader({
	conditions: [[{ property: 'Priority', select: { equals: 'High' } }]],
	body: (title) => ({ url: NOTION_PAGE_URLS[title] }),
	typed: true,
});

/** The POST check shared by graders: method and URL after defaults, then the sent bodies. */
async function postedBodies(workflow: WorkflowResponse, startName: string, items: IDataObject[]) {
	return await postedAfter(workflow, sourceStep(startName, items));
}

/** As postedBodies, but the walk starts after the steps of `startWalked`. */
async function postedAfter(workflow: WorkflowResponse, startWalked: PathStep[]) {
	const {
		node: http,
		walked,
		filtered,
		path: via,
	} = await followTo(workflow, startWalked, HTTP_TARGET);
	if (!http) return { via, filtered, target: undefined, bodies: [] };
	const parameters = withDefaults(http);
	const method = http.type === NEXT_HTTP_GET ? 'GET' : asText(parameters.method);
	return {
		via,
		filtered,
		target: `${method} ${asText(parameters.url).replace(/^=/, '').trim()}`,
		bodies: await httpBodies(http, walked),
	};
}

function readsCheck(
	posted: Awaited<ReturnType<typeof postedBodies>>,
	expectedTarget: string,
	expectBodies: (bodies: unknown[]) => boolean,
): Check {
	if (!posted.target) return { name: 'reads', pass: false, ungraded: true, detail: posted.via };
	return {
		name: 'reads',
		pass: posted.target === expectedTarget && expectBodies(posted.bodies),
		detail: `${posted.via} ${posted.target} ${JSON.stringify(posted.bodies)}`,
	};
}

const SHEET_ID = '1ZyXwVuTsRqPoNmLkJiHgFeDcBa9876543210';
const STOCK_ROWS = [
	['SKU', 'Price', 'Warehouse'],
	['A-100', 9.5, 'Berlin'],
	['B-200', 19.99, 'Berlin'],
	['B-200', 24.99, 'Lisbon'],
	['C-300', 5, 'Berlin'],
];

/** Rows the Google Sheets read operation returns for `values`, run by the node's own read code. */
async function sheetsReadOutput(parameters: INodeParameters, version: number, values: unknown[][]) {
	const { execute } = loadDist(
		nodesBaseRequire,
		'./dist/nodes/Google/Sheet/v2/actions/sheet/read.operation.js',
		['execute'],
	);
	const { GoogleSheet } = loadDist(
		nodesBaseRequire,
		'./dist/nodes/Google/Sheet/v2/helpers/GoogleSheet.js',
		['GoogleSheet'],
	);
	const context = {
		getNode: () => ({ ...stubNode('Google Sheets'), typeVersion: version }),
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name: string, _itemIndex: number, fallback?: unknown) =>
			valueAt(parameters, name) ?? fallback,
	};
	const sheet: unknown =
		typeof GoogleSheet === 'function' ? Reflect.construct(GoogleSheet, [SHEET_ID, context]) : {};
	if (!isRecord(sheet)) throw new Error('GoogleSheet did not construct');
	sheet.getData = async () => await Promise.resolve(values.map((row) => [...row]));
	const output = await invoke(execute, context, sheet, 'Stock');
	return (Array.isArray(output) ? output : [])
		.map((item: unknown) => (isRecord(item) ? item.json : undefined))
		.filter(isDataObject);
}

function sheetsReadTarget(
	parameters: INodeParameters,
	documentId: string,
	sheetName: string,
	operation = 'read',
) {
	const document = asText(valueAt(parameters, 'documentId.value'));
	const sheetNames = [
		valueAt(parameters, 'sheetName.value'),
		valueAt(parameters, 'sheetName.cachedResultName'),
	];
	return {
		name: 'target',
		pass:
			parameters.operation === operation &&
			document.includes(documentId) &&
			sheetNames.includes(sheetName),
		detail: JSON.stringify({ operation: parameters.operation, document, sheetNames }),
	};
}

/** A fake Sheets API with one tab `sheetName` that holds `values`. Writes answer {}. */
const sheetsApi =
	(documentId: string, sheetName: string, values: unknown[][]) => (request: unknown) => {
		const url = asText(valueAt(request, 'url'));
		if (!url.includes(`/spreadsheets/${documentId}`))
			throw new Error(`unknown spreadsheet: ${url}`);
		if (valueAt(request, 'method') !== 'GET') return {};
		return url.includes('/values/')
			? { values: values.map((row) => [...row]) }
			: { sheets: [{ properties: { sheetId: 0, title: sheetName } }] };
	};

const isSheetsRead = (node: WorkflowNodeResponse) =>
	(node.type === 'n8n-nodes-base.googleSheets' && node.parameters?.operation === 'read') ||
	node.type === NEXT_SHEETS_READ;

/** The rows a Sheets read node of either family emits for `values`, and the target check. */
async function readSheet(
	workflow: WorkflowResponse,
	sheets: WorkflowNodeResponse,
	documentId: string,
	sheetName: string,
	values: unknown[][],
) {
	if (sheets.type === NEXT_SHEETS_READ) {
		const { output, requests, error } = await runNext(
			sheets,
			sourceStep(parentName(workflow, sheets.name), [{}]),
			sheetsApi(documentId, sheetName, values),
		);
		return {
			target: {
				name: 'target',
				pass: error === undefined,
				detail: error ?? requests.map(requestUrl).join(' , '),
			},
			rows: output.items,
			settings: `parameters ${JSON.stringify(sheets.parameters)}`,
		};
	}
	const parameters = await runtimeParameters(workflow, sheets);
	return {
		target: sheetsReadTarget(parameters, documentId, sheetName),
		rows: await sheetsReadOutput(parameters, sheets.typeVersion ?? 1, values),
		settings: `filters ${JSON.stringify(valueAt(parameters, 'filtersUI.values'))} options ${JSON.stringify(parameters.options)}`,
	};
}

// A Limit node that keeps the first row passes: it sends the same single POST.
const gradeSheetsLookupFirstMatch: Grader = async (workflow) => {
	const sheets = workflow.nodes.find(
		(node) => node.type === 'n8n-nodes-base.googleSheets' || node.type === NEXT_SHEETS_READ,
	);
	if (!sheets) return [{ name: 'sheets-node', pass: false, detail: 'no Google Sheets node' }];
	const { target, rows, settings } = await readSheet(
		workflow,
		sheets,
		SHEET_ID,
		'Stock',
		STOCK_ROWS,
	);
	const posted = await postedBodies(workflow, sheets.name, rows);
	return [
		target,
		{
			name: 'lookup',
			pass:
				rows.length > 0 &&
				rows.every((row) => row.SKU === 'B-200') &&
				rows[0].Warehouse === 'Berlin',
			detail: `${rows.length} row(s) ${JSON.stringify(rows)} ${settings}`,
		},
		readsCheck(
			posted,
			'POST https://shop.example.com/api/price',
			(bodies) => bodies.length === 1 && isRecord(bodies[0]) && String(bodies[0].price) === '19.99',
		),
	];
};

const SIGNUPS_SHEET_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
// Only Email is named in the prompt; the other columns are unknown to the builder.
const SIGNUP_ROWS = [
	['Email', 'Name', 'Plan'],
	['a@b.test', 'A', 'pro'],
	['c@d.test', 'C', 'free'],
];

const gradeSheetsDynamicColumns: Grader = async (workflow) => {
	const sheets = workflow.nodes.find(
		(node) => node.type === 'n8n-nodes-base.googleSheets' || node.type === NEXT_SHEETS_READ,
	);
	if (!sheets) return [{ name: 'sheets-node', pass: false, detail: 'no Google Sheets node' }];
	const { target, rows } = await readSheet(
		workflow,
		sheets,
		SIGNUPS_SHEET_ID,
		'Signups',
		SIGNUP_ROWS,
	);
	const posted = await postedBodies(workflow, sheets.name, rows);
	return [
		target,
		readsCheck(
			posted,
			'POST https://hooks.example.com/api/signups',
			(bodies) =>
				sortedJson(bodies) ===
				sortedJson([
					{ email: 'a@b.test', row: 2 },
					{ email: 'c@d.test', row: 3 },
				]),
		),
	];
};

const ORDER_URL = 'https://shop.example.com/api/orders/o1';
const ORDER: IDataObject = { id: 'o1', total: 10, currency: 'EUR', customer: { tier: 'gold' } };

const gradeSetKeepAllPassthrough: Grader = async (workflow) => {
	const get = workflow.nodes.find(
		(node) => isHttpRequest(node) && asText(node.parameters?.url).includes(ORDER_URL),
	);
	if (!get) return [{ name: 'get-node', pass: false, detail: 'no HTTP Request to the order URL' }];
	const set = childrenOf(workflow, get.name).find((node) =>
		['n8n-nodes-base.set', NEXT_SET].includes(node.type),
	);
	if (!set) return [{ name: 'set-node', pass: false, detail: 'no Set node after the GET' }];
	const {
		items: [output],
	} = await firstOutput(set, sourceStep(get.name, [ORDER]));
	const posted = await postedBodies(workflow, get.name, [ORDER]);
	const setParameters = withDefaults(set);
	return [
		{
			name: 'keep-all',
			pass: Object.entries(ORDER).every(
				([key, value]) => sortedJson(output?.[key]) === sortedJson(value),
			),
			detail: `v${set.typeVersion ?? 1} includeOtherFields=${asText(setParameters.includeOtherFields)} include=${asText(setParameters.include)} ${JSON.stringify(output)}`,
		},
		{
			name: 'number-type',
			pass: sortedJson(output?.total_with_tax) === sortedJson(12),
			detail: `total_with_tax=${JSON.stringify(output?.total_with_tax)} (${typeof output?.total_with_tax})`,
		},
		readsCheck(
			posted,
			'POST https://ledger.example.com/api/orders',
			(bodies) =>
				bodies.length === 1 &&
				sortedJson(bodies[0]) === sortedJson({ id: 'o1', total_with_tax: 12 }),
		),
	];
};

const CUSTOMERS_URL = 'https://api.example.com/v1/customers';
const CUSTOMER_PAGES: Record<string, IDataObject> = {
	'': { data: [{ id: 1 }, { id: 2 }], next_cursor: 'c2' },
	c2: { data: [{ id: 3 }, { id: 4 }], next_cursor: 'c3' },
	c3: { data: [{ id: 5 }], next_cursor: null },
};
const MAX_FAKE_REQUESTS = 6;

/** The `continue` expression HttpRequestV3 builds from the pagination settings. */
function paginationContinue(pagination: Record<string, unknown>, neverError: boolean): string {
	if (pagination.paginationCompleteWhen === 'receiveSpecificStatusCodes') {
		const codes = asText(pagination.statusCodesWhenComplete)
			.split(',')
			.map((code) => parseInt(code.trim()));
		return `={{ !${JSON.stringify(codes)}.includes($response.statusCode) }}`;
	}
	if (pagination.paginationCompleteWhen === 'responseIsEmpty') {
		return '={{ Array.isArray($response.body) ? $response.body.length : !!$response.body }}';
	}
	const complete = asText(pagination.completeExpression);
	if (!complete.startsWith('=')) throw new Error('Invalid or empty Complete Expression');
	const condition = complete.trim().slice(3, -2);
	return neverError
		? `={{ !(${condition}) }}`
		: `={{ !(${condition}) || ($response.statusCode < 200 || $response.statusCode >= 300) }}`;
}

const dataAt = (value: unknown, key: string): IDataObject => {
	const at = valueAt(value, key);
	return isDataObject(at) ? at : {};
};

/** Copies the keys core's pagination loop passes, typed for the expression engine. */
const additionalKeys = (keys: unknown): IWorkflowDataProxyAdditionalKeys => ({
	$response: dataAt(keys, '$response'),
	$request: dataAt(keys, '$request'),
	$pageCount: Number(valueAt(keys, '$pageCount') ?? 0),
});

/** Runs core's pagination loop for the node against CUSTOMER_PAGES and returns the URLs it requests. */
async function paginatedRequests(workflow: WorkflowResponse, http: WorkflowNodeResponse) {
	const parameters = withDefaults(http);
	const pagination = valueAt(parameters, 'options.pagination.pagination');
	if (!isRecord(pagination) || pagination.paginationMode === 'off') {
		return { urls: [], pages: [], error: 'pagination is off' };
	}
	const updates = valueAt(pagination, 'parameters.parameters');
	const request: Record<string, unknown> =
		pagination.paginationMode === 'responseContainsNextURL'
			? { url: pagination.nextURL }
			: (Array.isArray(updates) ? updates : [])
					.filter(isRecord)
					.reduce<Record<string, IDataObject>>(
						(grouped, update) => ({
							...grouped,
							[String(update.type)]: {
								...grouped[String(update.type)],
								[String(update.name)]: toDataValue(update.value),
							},
						}),
						{},
					);
	const { requestWithAuthenticationPaginated } = loadDist(
		coreRequire,
		'./dist/execution-engine/node-execution-context/utils/request-helpers/pagination.js',
		['requestWithAuthenticationPaginated'],
	);
	const urls: string[] = [];
	const fakeRequest = async (options: unknown) => {
		const url = new URL(String(valueAt(options, 'uri')));
		const qs = valueAt(options, 'qs');
		for (const [key, value] of Object.entries(isRecord(qs) ? qs : {})) {
			if (value !== undefined && value !== null) url.searchParams.set(key, asText(value));
		}
		urls.push(url.toString());
		if (urls.length > MAX_FAKE_REQUESTS) throw new Error(`more than ${MAX_FAKE_REQUESTS} requests`);
		const body = CUSTOMER_PAGES[url.searchParams.get('cursor') ?? ''];
		return await Promise.resolve(
			body
				? { body, headers: {}, statusCode: 200 }
				: { body: { error: 'unknown cursor' }, headers: {}, statusCode: 400 },
		);
	};
	try {
		const paginationOptions = {
			continue: paginationContinue(
				pagination,
				valueAt(parameters, 'options.response.response.neverError') === true,
			),
			request,
			requestInterval: 0,
			...(pagination.limitPagesFetched === true ? { maxRequests: pagination.maxRequests } : {}),
		};
		const responses = await withChildContext(
			sourceStep(parentName(workflow, http.name), [{}]),
			http.name,
			async (evaluate) =>
				await invoke(
					requestWithAuthenticationPaginated,
					{ helpers: { request: fakeRequest } },
					{ uri: asText(parameters.url).replace(/^=/, '').trim(), method: parameters.method },
					0,
					paginationOptions,
					(value: unknown, itemIndex: number, _run: number, _data: unknown, keys: unknown) =>
						isParameterValue(value) ? evaluate(value, itemIndex, additionalKeys(keys)) : value,
					{ ...stubNode(http.name), typeVersion: http.typeVersion ?? 1 },
				),
		);
		const pages = (Array.isArray(responses) ? responses : [])
			.map((response: unknown) => valueAt(response, 'body'))
			.filter(isDataObject);
		return { urls, pages, error: undefined };
	} catch (error) {
		return { urls, pages: [], error: errorText(error) };
	}
}

/** Runs the nodes-base-next GET against CUSTOMER_PAGES and returns the URLs it requests. */
async function nextPaginatedRequests(workflow: WorkflowResponse, http: WorkflowNodeResponse) {
	const answered: string[] = [];
	const { output, requests, error } = await runNext(
		http,
		sourceStep(parentName(workflow, http.name), [{}]),
		(request) => {
			answered.push(requestUrl(request));
			if (answered.length > MAX_FAKE_REQUESTS) {
				throw new Error(`more than ${MAX_FAKE_REQUESTS} requests`);
			}
			const body = CUSTOMER_PAGES[new URL(requestUrl(request)).searchParams.get('cursor') ?? ''];
			if (!body) throw new Error('400 unknown cursor');
			return body;
		},
	);
	return { urls: requests.map(requestUrl), pages: output.items, error };
}

const gradeHttpCursorPagination: Grader = async (workflow) => {
	const http = workflow.nodes.find(
		(node) =>
			isHttpRequest(node) && asText(node.parameters?.url).includes('api.example.com/v1/customers'),
	);
	if (!http)
		return [{ name: 'http-node', pass: false, detail: 'no HTTP Request to the customers API' }];
	const { urls, pages, error } =
		http.type === NEXT_HTTP_GET
			? await nextPaginatedRequests(workflow, http)
			: await paginatedRequests(workflow, http);
	const expected = [CUSTOMERS_URL, `${CUSTOMERS_URL}?cursor=c2`, `${CUSTOMERS_URL}?cursor=c3`];
	const posted = await postedBodies(workflow, http.name, pages);
	return [
		{
			name: 'pagination',
			pass: !error && JSON.stringify(urls) === JSON.stringify(expected),
			detail: `${error ? `${error}; ` : ''}${urls.join(' , ')}`,
		},
		readsCheck(
			posted,
			'POST https://reports.example.com/api/customers/count',
			(bodies) => bodies.length === 1 && isRecord(bodies[0]) && String(bodies[0].total) === '5',
		),
	];
};

const GMAIL_SENT = { id: 'm-1042', threadId: 't-77', labelIds: ['SENT'] };

/** The node's parameters with defaults filled and expressions resolved for each item after `walked`. */
async function itemParameters(
	node: WorkflowNodeResponse,
	walked: PathStep[],
): Promise<Array<INodeParameters | string>> {
	const parameters = withDefaults(node);
	const { items } = walked[walked.length - 1];
	return await withChildContext(walked, node.name, (evaluate) =>
		items.map((_, itemIndex) => {
			try {
				const resolved = evaluate(parameters, itemIndex);
				return isNodeParameters(resolved) ? resolved : {};
			} catch (error) {
				return `<error: ${errorText(error)}>`;
			}
		}),
	);
}

/** One sent email, in the terms of the legacy Gmail send parameters. */
interface SentEmail {
	resource: unknown;
	operation: unknown;
	sendTo: string;
	subject: unknown;
	emailType: unknown;
	message: string;
}

/** The nodes-base-next send action adds this before its attribution footer. */
const ATTRIBUTION_SEPARATOR = '\n\n---\n';

/** The email in the raw MIME message that the nodes-base-next send action posts. */
function decodeSentEmail(raw: unknown): SentEmail {
	const mime = Buffer.from(asText(raw), 'base64url').toString('utf8');
	const [head = '', ...body] = mime.split('\r\n\r\n');
	const headers = Object.fromEntries(
		head
			.split('\r\n')
			.map((line) => [
				line.slice(0, line.indexOf(':')).toLowerCase(),
				line.slice(line.indexOf(':') + 1).trim(),
			]),
	);
	const text = Buffer.from(body.join('').replace(/\r\n/g, ''), 'base64').toString('utf8');
	const contentType = headers['content-type'] ?? '';
	return {
		resource: 'message',
		operation: 'send',
		sendTo: headers.to ?? '',
		subject: headers.subject,
		emailType: contentType.startsWith('text/plain')
			? 'text'
			: contentType.startsWith('text/html')
				? 'html'
				: contentType,
		message: (text.split(ATTRIBUTION_SEPARATOR)[0] ?? '').trim(),
	};
}

const isGmailSend = (node: WorkflowNodeResponse) =>
	(node.type === 'n8n-nodes-base.gmail' && node.parameters?.operation === 'send') ||
	node.type === NEXT_GMAIL_SEND;

/**
 * The emails a Gmail send node of either family sends for the items after `walked`, and its
 * output when the API answers each send with `sent`.
 */
async function gmailSends(gmail: WorkflowNodeResponse, walked: PathStep[], sent: IDataObject) {
	if (gmail.type === NEXT_GMAIL_SEND) {
		const { output, requests, error } = await runNext(gmail, walked, (request) =>
			requestUrl(request).endsWith('/profile') ? { emailAddress: 'me@acme.test' } : sent,
		);
		const sends = requests
			.filter((request) => requestUrl(request).endsWith('/messages/send'))
			.map((request) => decodeSentEmail(valueAt(request, 'body.raw')));
		return { sends, output, error };
	}
	const resolved = await itemParameters(gmail, walked);
	const sends = resolved.filter(isNodeParameters).map(
		(parameters): SentEmail => ({
			resource: parameters.resource,
			operation: parameters.operation,
			sendTo: asText(parameters.sendTo).trim(),
			subject: parameters.subject,
			emailType: parameters.emailType,
			message: asText(parameters.message).trim(),
		}),
	);
	const error = resolved.find((parameters) => typeof parameters === 'string');
	return {
		sends,
		output: { items: error ? [] : resolved.map(() => sent) },
		error: typeof error === 'string' ? error : undefined,
	};
}

const gradeGmailSendThenPost: Grader = async (workflow) => {
	const gmail = workflow.nodes.find(
		(node) => node.type === 'n8n-nodes-base.gmail' || node.type === NEXT_GMAIL_SEND,
	);
	if (!gmail) return [{ name: 'gmail-node', pass: false, detail: 'no Gmail node' }];
	const { sends, output, error } = await gmailSends(
		gmail,
		sourceStep(parentName(workflow, gmail.name), [{}]),
		GMAIL_SENT,
	);
	const [send] = sends;
	const expected = {
		resource: 'message',
		operation: 'send',
		sendTo: 'billing@acme.test',
		subject: 'Invoice 1042 sent',
		emailType: 'text',
		message: 'Invoice 1042 is ready.',
	};
	const posted = await postedBodies(workflow, gmail.name, output.items);
	return [
		{
			name: 'send',
			pass: sends.length === 1 && sortedJson(send) === sortedJson(expected),
			detail: error ?? JSON.stringify(sends.length === 1 ? send : sends),
		},
		readsCheck(
			posted,
			'POST https://crm.example.com/api/emails',
			(bodies) =>
				bodies.length === 1 &&
				sortedJson(bodies[0]) === sortedJson({ messageId: 'm-1042', threadId: 't-77' }),
		),
	];
};

const INVOICES: IDataObject[] = [
	{ id: 'i1', amount: '120.50' },
	{ id: 'i2', amount: '80.00' },
	{ id: 'i3', amount: '100' },
];

const gradeIfStringAmountThreshold: Grader = async (workflow) => {
	const get = workflow.nodes.find(
		(node) =>
			isHttpRequest(node) && asText(node.parameters?.url).includes('api.example.com/invoices'),
	);
	if (!get)
		return [{ name: 'get-node', pass: false, detail: 'no HTTP Request to the invoices API' }];
	let posted: Awaited<ReturnType<typeof postedBodies>>;
	try {
		posted = await postedBodies(workflow, get.name, INVOICES);
	} catch (error) {
		// A type validation error thrown by the IF or Filter node stops the real execution too.
		const detail = `node throws: ${errorText(error)}`;
		return [
			{ name: 'filter', pass: false, detail },
			{ name: 'reads', pass: false, detail },
		];
	}
	const reads = readsCheck(
		posted,
		'POST https://hooks.example.com/large-invoices',
		(bodies) => sortedJson(bodies) === sortedJson([{ id: 'i1', amount: 120.5 }]),
	);
	return [
		posted.filtered
			? {
					name: 'filter',
					pass: sortedJson(posted.filtered.map((item) => item.id)) === sortedJson(['i1']),
					detail: JSON.stringify(posted.filtered),
				}
			: {
					name: 'filter',
					pass: false,
					ungraded: true,
					detail: `no IF or Filter node: ${posted.via}`,
				},
		// A missing POST (for example on the IF false branch) fails; only an unsupported node is ungraded.
		{ ...reads, ungraded: reads.ungraded === true && posted.via.startsWith('ungraded:') },
	];
};

// Held-out cases: nobody tunes prompts against these.

const targetOf = (name: string, role: string, matches: WalkTarget['matches']): WalkTarget => ({
	matches,
	name,
	role,
});

const isSheetsWrite = (operation: 'append' | 'appendOrUpdate') => (node: WorkflowNodeResponse) =>
	(node.type === 'n8n-nodes-base.googleSheets' && node.parameters?.operation === operation) ||
	node.type === (operation === 'append' ? NEXT_SHEETS_APPEND : NEXT_SHEETS_UPSERT);

/**
 * The rows a Sheets append or upsert node of either family writes for the items after `walked`
 * into a tab that holds `values`, the column it matches on, and the target check.
 */
async function sheetsWrites(
	sheets: WorkflowNodeResponse,
	walked: PathStep[],
	documentId: string,
	sheetName: string,
	values: unknown[][],
) {
	if (sheets.type.startsWith(NEXT_PREFIX)) {
		const { output, requests, error } = await runNext(
			sheets,
			walked,
			sheetsApi(documentId, sheetName, values),
		);
		const writes = requests.filter((request) => valueAt(request, 'method') !== 'GET');
		return {
			target: {
				name: 'target',
				pass: error === undefined,
				detail: error ?? `${writes.length} write request(s)`,
			},
			rows: output.items,
			matchOn: asText(sheets.parameters?.matchOn),
		};
	}
	const resolved = await itemParameters(sheets, walked);
	const { items } = walked[walked.length - 1];
	const [first = {}] = resolved;
	const rows = resolved.map((parameters, itemIndex): IDataObject => {
		if (typeof parameters === 'string') return { error: parameters };
		if (valueAt(parameters, 'columns.mappingMode') === 'autoMapInputData') return items[itemIndex];
		const mapped = valueAt(parameters, 'columns.value');
		return isDataObject(mapped) ? mapped : {};
	});
	const matching = valueAt(first, 'columns.matchingColumns');
	return {
		target:
			typeof first === 'string'
				? { name: 'target', pass: false, detail: first }
				: sheetsReadTarget(first, documentId, sheetName, asText(sheets.parameters?.operation)),
		rows,
		matchOn: Array.isArray(matching)
			? matching.map(asText).join(',')
			: asText(valueAt(first, 'columnToMatchOn')),
	};
}

/** A number column passes with any value that is that number, as Sheets USER_ENTERED reads it. */
const cellMatches = (actual: unknown, expected: string | number) =>
	typeof expected === 'number'
		? (typeof actual === 'number' || (typeof actual === 'string' && actual.trim() !== '')) &&
			Number(actual) === expected
		: actual === expected;

function rowsCheck(
	rows: IDataObject[],
	expected: Array<Record<string, string | number>>,
	detail: string,
): Check {
	return {
		name: 'rows',
		pass:
			rows.length === expected.length &&
			expected.every((row, index) =>
				Object.entries(row).every(([column, value]) => cellMatches(rows[index]?.[column], value)),
			),
		detail: `${detail} ${JSON.stringify(rows)}`,
	};
}

/** The rows check when no write node was reached: ungraded only for an unsupported node. */
const walkCheck = (name: string, via: string): Check => ({
	name,
	pass: false,
	ungraded: via.startsWith('ungraded:'),
	detail: via,
});

const DEALS_DATABASE = '8d2f4a6b-1c3e-4f5a-9b7d-2e4f6a8c0b1d';
const DEALS_SHEET_ID = '1QwErTyUiOpAsDfGhJkLzXcVbNm0987654321';

function dealPage(
	id: string,
	title: string,
	amount: number,
	closeDate: string,
	[ownerName, ownerEmail]: [string, string],
) {
	return {
		object: 'page',
		id,
		url: `https://www.notion.so/${id}`,
		parent: { type: 'data_source_id', data_source_id: DEALS_DATABASE },
		properties: {
			Name: {
				id: 'title',
				type: 'title',
				title: [{ type: 'text', plain_text: title, text: { content: title } }],
			},
			Stage: { id: 'st', type: 'select', select: { name: 'Won' } },
			Amount: { id: 'am', type: 'number', ['number']: amount },
			'Close date': {
				id: 'cd',
				type: 'date',
				date: { start: closeDate, end: null, time_zone: null },
			},
			Owner: {
				id: 'ow',
				type: 'people',
				people: [
					{
						object: 'user',
						id: `u-${id}`,
						name: ownerName,
						type: 'person',
						person: { email: ownerEmail },
					},
				],
			},
		},
	};
}

const gradeHoldoutNotionDealsToSheet: Grader = async (workflow) => {
	const notion = workflow.nodes.find(isNotionGetAll);
	if (!notion) return [{ name: 'notion-node', pass: false, detail: 'no Notion getAll node' }];
	const sent = await sentNotionFilter(workflow, notion);
	// One condition may be sent bare or inside an `and` or `or` list.
	const conditions =
		isRecord(sent) && Array.isArray(sent.and)
			? sent.and
			: isRecord(sent) && Array.isArray(sent.or)
				? sent.or
				: [sent];
	const items = notionOutputItems(notion, [
		dealPage('d1', 'Acme renewal', 12000, '2026-08-14', ['Dana Scully', 'dana@acme.test']),
		dealPage('d2', 'Globex pilot', 4500.5, '2026-08-20T15:30:00.000+02:00', [
			'Fox Mulder',
			'fox@acme.test',
		]),
	]);
	const filter: Check = {
		name: 'filter',
		pass:
			conditions.length === 1 &&
			sortedJson(conditions[0]) === sortedJson({ property: 'Stage', select: { equals: 'Won' } }),
		detail: JSON.stringify(sent),
	};
	const {
		node: sheets,
		walked,
		path: via,
	} = await followTo(
		workflow,
		sourceStep(notion.name, items),
		targetOf('Google Sheets append', 'the append', isSheetsWrite('append')),
	);
	if (!sheets) return [filter, walkCheck('rows', via)];
	const written = await sheetsWrites(sheets, walked, DEALS_SHEET_ID, 'Closed deals', [
		['Deal', 'Amount', 'Close date', 'Owner email'],
	]);
	return [
		filter,
		written.target,
		rowsCheck(
			written.rows,
			[
				{
					Deal: 'Acme renewal',
					Amount: 12000,
					'Close date': '2026-08-14',
					'Owner email': 'dana@acme.test',
				},
				{
					Deal: 'Globex pilot',
					Amount: 4500.5,
					'Close date': '2026-08-20',
					'Owner email': 'fox@acme.test',
				},
			],
			via,
		),
	];
};

const ORDERS_SHEET_ID = '1MnBvCxZaSdFgHjKlPoIuYtReWq1234567890';
// The API leaves out empty trailing cells, so A-1 has no Shipped cell.
const ORDER_ROWS = [
	['Order ID', 'Customer email', 'Total', 'Shipped'],
	['A-1', 'ada@lovelace.test', 320],
	['A-2', 'grace@hopper.test', 410.5, 'yes'],
	['A-3', 'alan@turing.test', 99, 'no'],
	['A-4', 'kat@johnson.test', 275, 'no'],
];

const orderEmail = (orderId: string, to: string, total: number): SentEmail => ({
	resource: 'message',
	operation: 'send',
	sendTo: to,
	subject: `Your order ${orderId} is on its way soon`,
	emailType: 'text',
	message: `Hi, we are preparing order ${orderId} (total ${total} EUR).`,
});

const gradeHoldoutSheetsOrdersGmail: Grader = async (workflow) => {
	const sheets = workflow.nodes.find(isSheetsRead);
	if (!sheets) return [{ name: 'sheets-node', pass: false, detail: 'no Google Sheets read node' }];
	const read = await readSheet(workflow, sheets, ORDERS_SHEET_ID, 'Orders', ORDER_ROWS);
	try {
		const {
			node: gmail,
			walked,
			filtered,
			path: via,
		} = await followTo(
			workflow,
			sourceStep(sheets.name, read.rows),
			targetOf('Gmail send', 'the send', isGmailSend),
		);
		if (!gmail) return [read.target, walkCheck('emails', via)];
		const { sends, error } = await gmailSends(gmail, walked, {
			id: 'm-1',
			threadId: 't-1',
			labelIds: ['SENT'],
		});
		const expected = [
			orderEmail('A-1', 'ada@lovelace.test', 320),
			orderEmail('A-4', 'kat@johnson.test', 275),
		];
		return [
			read.target,
			{
				name: 'emails',
				pass: !error && sortedJson(sends) === sortedJson(expected),
				detail: `${error ? `${error}; ` : ''}${via} kept ${JSON.stringify(filtered?.map((row) => row['Order ID']))} ${JSON.stringify(sends)}`,
			},
		];
	} catch (error) {
		// A type validation error thrown by the IF or Filter node stops the real execution too.
		return [
			read.target,
			{ name: 'emails', pass: false, detail: `node throws: ${errorText(error)}` },
		];
	}
};

const TRIAGE_EMAILS = [
	{
		id: 'm1',
		from: 'Ada Lovelace <ada@lovelace.test>',
		address: 'ada@lovelace.test',
		subject: 'Invoice question',
		text: 'Hi, can you resend invoice 1042? Thanks, Ada',
		/** Text only the email content holds; the fake Gemini answers when the prompt has it. */
		key: 'resend invoice 1042',
		summary: 'Summary: Ada asks us to resend invoice 1042.',
	},
	{
		id: 'm2',
		from: 'Globex Billing <billing@globex.test>',
		address: 'billing@globex.test',
		subject: 'Payment received',
		text: 'We received your payment of 120 EUR.',
		key: 'payment of 120 EUR',
		summary: 'Summary: Globex confirms a payment of 120 EUR.',
	},
];

const GMAIL_LABELS = {
	labels: [
		{ id: 'UNREAD', name: 'UNREAD' },
		{ id: 'INBOX', name: 'INBOX' },
	],
};

const triageMetadata = (email: (typeof TRIAGE_EMAILS)[number]) => ({
	id: email.id,
	threadId: `t-${email.id}`,
	labelIds: ['UNREAD', 'INBOX'],
	snippet: email.text,
	sizeEstimate: 1200,
	historyId: '9001',
	internalDate: '1790000000000',
	payload: {
		mimeType: 'text/plain',
		headers: [
			{ name: 'From', value: email.from },
			{ name: 'To', value: 'me@acme.test' },
			{ name: 'Subject', value: email.subject },
		],
	},
});

const triageRaw = (email: (typeof TRIAGE_EMAILS)[number]) => ({
	id: email.id,
	threadId: `t-${email.id}`,
	labelIds: ['UNREAD', 'INBOX'],
	sizeEstimate: 1200,
	raw: Buffer.from(
		[
			`From: ${email.from}`,
			'To: me@acme.test',
			`Subject: ${email.subject}`,
			'Date: Mon, 28 Sep 2026 09:00:00 +0000',
			`Message-ID: <${email.id}@acme.test>`,
			'Content-Type: text/plain; charset=utf-8',
			'',
			email.text,
		].join('\r\n'),
	).toString('base64url'),
});

/** The list query the Gmail getAll node sends, and the messages it emits, for either family. */
async function triageGmailOutput(workflow: WorkflowResponse, gmail: WorkflowNodeResponse) {
	if (gmail.type === NEXT_GMAIL_GET_ALL) {
		const { output, requests, error } = await runNext(
			gmail,
			sourceStep(parentName(workflow, gmail.name), [{}]),
			(request) => {
				const { pathname } = new URL(requestUrl(request));
				if (pathname.endsWith('/labels')) return GMAIL_LABELS;
				if (pathname.endsWith('/messages')) {
					return { messages: TRIAGE_EMAILS.map(({ id }) => ({ id, threadId: `t-${id}` })) };
				}
				const email = TRIAGE_EMAILS.find(({ id }) => pathname.endsWith(`/messages/${id}`));
				if (!email) throw new Error(`unexpected request ${pathname}`);
				return triageMetadata(email);
			},
		);
		const list = requests
			.map((request) => new URL(requestUrl(request)))
			.find((url) => url.pathname.endsWith('/messages'));
		return {
			query: {
				q: list?.searchParams.get('q') ?? '',
				labelIds: list?.searchParams.getAll('labelIds') ?? [],
				maxResults: list?.searchParams.get('maxResults') ?? '',
			},
			items: output.items,
			error,
		};
	}
	const gmailFunctions = loadDist(
		nodesBaseRequire,
		'./dist/nodes/Google/Gmail/GenericFunctions.js',
		['prepareQuery', 'simplifyOutput', 'parseRawEmail'],
	);
	const parameters = await runtimeParameters(workflow, gmail);
	const context = {
		getNode: () => ({ ...stubNode(gmail.name), typeVersion: gmail.typeVersion ?? 1 }),
		getNodeParameter: (name: string) => (name === 'authentication' ? 'oAuth2' : false),
		helpers: { requestWithAuthentication: async () => await Promise.resolve(GMAIL_LABELS) },
	};
	try {
		const prepared = invoke(
			gmailFunctions.prepareQuery,
			context,
			isRecord(parameters.filters) ? parameters.filters : {},
			0,
		);
		const labelIds = valueAt(prepared, 'labelIds');
		const messages =
			parameters.simple === false
				? await Promise.all(
						TRIAGE_EMAILS.map(
							async (email) =>
								await invoke(
									gmailFunctions.parseRawEmail,
									context,
									triageRaw(email),
									'attachment_',
								),
						),
					).then((parsed) => parsed.map((item) => valueAt(item, 'json')))
				: await invoke(gmailFunctions.simplifyOutput, context, TRIAGE_EMAILS.map(triageMetadata));
		return {
			query: {
				q: asText(valueAt(prepared, 'q')),
				labelIds: (Array.isArray(labelIds) ? labelIds : [labelIds]).map(asText),
				maxResults: parameters.returnAll === true ? 'all' : asText(parameters.limit),
			},
			items: (Array.isArray(messages) ? messages : []).filter(isDataObject),
			error: undefined,
		};
	} catch (error) {
		return { query: { q: '', labelIds: [], maxResults: '' }, items: [], error: errorText(error) };
	}
}

const LEGACY_GEMINI = '@n8n/n8n-nodes-langchain.googleGemini';

const NEXT_AI_PROMPT = `${NEXT_PREFIX}aiPrompt`;
const NEXT_GEMINI_CHAT_MODEL = `${NEXT_PREFIX}googleGeminiChatModel`;

/** A node that sends a Gemini message. geminiOutput checks the chat model of an AI prompt. */
const isGeminiMessage = (node: WorkflowNodeResponse) =>
	(node.type === LEGACY_GEMINI &&
		['', 'text'].includes(asText(node.parameters?.resource)) &&
		['', 'message'].includes(asText(node.parameters?.operation))) ||
	node.type === NEXT_GEMINI_MESSAGE ||
	node.type === NEXT_AI_PROMPT;

const geminiAnswer = (prompt: string) =>
	TRIAGE_EMAILS.find((email) => prompt.includes(email.key))?.summary ??
	'Summary: the prompt holds no email content.';

const geminiCandidate = (answer: string) => ({
	content: { parts: [{ text: answer }], role: 'model' },
	finishReason: 'STOP',
	index: 0,
});

/**
 * The items a Gemini message node of either family, or an AI prompt with a Gemini chat model,
 * emits after `walked`, with a fake model that answers from the prompt. The legacy node is not in
 * nodes-base, so its output is built from its parameters as its message operation does.
 */
async function geminiOutput(
	workflow: WorkflowResponse,
	gemini: WorkflowNodeResponse,
	walked: PathStep[],
): Promise<Emitted> {
	const geminiApi = (request: unknown) => ({
		candidates: [geminiCandidate(geminiAnswer(JSON.stringify(valueAt(request, 'body'))))],
	});
	if (gemini.type === NEXT_GEMINI_MESSAGE) {
		const { output, error } = await runNext(gemini, walked, geminiApi);
		if (error) throw new Error(error);
		return output;
	}
	if (gemini.type === NEXT_AI_PROMPT) {
		const model = subNodeOf(workflow, gemini.name, 'ai_languageModel');
		if (model?.type !== NEXT_GEMINI_CHAT_MODEL) {
			throw new Error(`the AI prompt has no Gemini chat model: ${model?.type ?? 'none'}`);
		}
		const chatModel = await nextSupply(model, walked, geminiApi);
		const [output] = await executeOutputs(gemini, walked, {
			getInputConnectionData: async () => await Promise.resolve(chatModel),
		});
		return output ?? { items: [] };
	}
	const { items } = walked[walked.length - 1];
	const outputs = await withChildContext(walked, gemini.name, (evaluate) =>
		items.map((_, itemIndex) => {
			const parameters = evaluate(
				isNodeParameters(gemini.parameters) ? gemini.parameters : {},
				itemIndex,
			);
			const messages = valueAt(parameters, 'messages.values');
			const prompt = (Array.isArray(messages) ? messages : [])
				.map((message) => asText(valueAt(message, 'content')))
				.join('\n');
			const answer = geminiAnswer(prompt);
			const candidate = {
				...geminiCandidate(answer),
				...(valueAt(parameters, 'options.includeMergedResponse') === true
					? { mergedResponse: answer }
					: {}),
			};
			return valueAt(parameters, 'simplify') === false ? { candidates: [candidate] } : candidate;
		}),
	);
	return { items: outputs, paired: outputs.map((_, index) => index) };
}

const gradeHoldoutGmailGeminiTriage: Grader = async (workflow) => {
	const gmail = workflow.nodes.find(
		(node) =>
			(node.type === 'n8n-nodes-base.gmail' && node.parameters?.operation === 'getAll') ||
			node.type === NEXT_GMAIL_GET_ALL,
	);
	if (!gmail) return [{ name: 'gmail-node', pass: false, detail: 'no Gmail getAll node' }];
	const { query, items, error } = await triageGmailOutput(workflow, gmail);
	const queryCheck: Check = {
		name: 'query',
		pass:
			!error &&
			query.maxResults === '5' &&
			(/\bis:unread\b/.test(query.q) || query.labelIds.includes('UNREAD')),
		detail: error ?? JSON.stringify(query),
	};
	const toGemini = await followTo(
		workflow,
		sourceStep(gmail.name, items),
		targetOf('Gemini message', 'the Gemini message', isGeminiMessage),
	);
	if (!toGemini.node) return [queryCheck, walkCheck('reads', toGemini.path)];
	try {
		const answers = await geminiOutput(workflow, toGemini.node, toGemini.walked);
		const posted = await postedAfter(workflow, [
			...toGemini.walked,
			{ name: toGemini.node.name, ...answers },
		]);
		const reads = readsCheck(
			posted,
			'POST https://triage.example.com/api/inbox',
			(bodies) =>
				sortedJson(bodies) ===
				sortedJson(
					TRIAGE_EMAILS.map((email) => ({
						from: email.address,
						subject: email.subject,
						summary: email.summary,
					})),
				),
		);
		return [
			queryCheck,
			{ ...reads, ungraded: reads.ungraded === true && posted.via.startsWith('ungraded:') },
		];
	} catch (geminiError) {
		return [
			queryCheck,
			{ name: 'reads', pass: false, detail: `node throws: ${errorText(geminiError)}` },
		];
	}
};

const SUBSCRIPTIONS_URL = 'https://api.example.com/v1/subscriptions';
const SUBSCRIPTIONS_SHEET_ID = '1PlKoJiHuGyTfRdEsWaQ0192837465ZxCvBn';
const SUBSCRIPTIONS: IDataObject = {
	items: [
		{
			id: 'sub_1',
			customer: { email: 'ada@lovelace.test', name: 'Ada' },
			plan: { name: 'Pro', price_cents: 4900 },
			// 2026-01-01T12:00:00Z: noon keeps the date the same in every zone from UTC-11 to UTC+11.
			renews_at: 1767268800,
		},
		{
			id: 'sub_2',
			customer: { email: 'grace@hopper.test', name: 'Grace' },
			plan: { name: 'Team', price_cents: 12950 },
			renews_at: 1769947200,
		},
	],
};
const SUBSCRIPTION_ROWS = [
	['Subscription ID', 'Customer email', 'Plan', 'Monthly price', 'Renews on'],
	['sub_1', 'ada@lovelace.test', 'Free', 0, '2025-12-01'],
];

/** The URL the GET node requests and the items it emits for SUBSCRIPTIONS, for either family. */
async function subscriptionsGet(workflow: WorkflowResponse, get: WorkflowNodeResponse) {
	if (get.type === NEXT_HTTP_GET) {
		const { output, requests, error } = await runNext(
			get,
			sourceStep(parentName(workflow, get.name), [{}]),
			() => SUBSCRIPTIONS,
		);
		return { url: requests.map(requestUrl).join(' , '), items: output.items, error };
	}
	const parameters = await runtimeParameters(workflow, get);
	const query = valueAt(parameters, 'queryParameters.parameters');
	const qs =
		parameters.sendQuery === true && Array.isArray(query)
			? Object.fromEntries(
					query.filter(isRecord).map((pair) => [asText(pair.name), asText(pair.value)]),
				)
			: {};
	try {
		const url = requestUrl({ url: asText(parameters.url).replace(/^=/, '').trim(), qs });
		return {
			url: parameters.method === 'GET' ? url : `${asText(parameters.method)} ${url}`,
			items: [SUBSCRIPTIONS],
			error: undefined,
		};
	} catch (error) {
		return { url: '', items: [], error: errorText(error) };
	}
}

const gradeHoldoutHttpSubscriptionsUpsert: Grader = async (workflow) => {
	const get = workflow.nodes.find(
		(node) => isHttpRequest(node) && asText(node.parameters?.url).includes(SUBSCRIPTIONS_URL),
	);
	if (!get)
		return [{ name: 'get-node', pass: false, detail: 'no HTTP Request to the subscriptions API' }];
	const { url, items, error } = await subscriptionsGet(workflow, get);
	const request: Check = {
		name: 'request',
		pass: !error && url === `${SUBSCRIPTIONS_URL}?status=active`,
		detail: error ?? url,
	};
	const {
		node: sheets,
		walked,
		path: via,
	} = await followTo(
		workflow,
		sourceStep(get.name, items),
		targetOf('Google Sheets upsert', 'the upsert', isSheetsWrite('appendOrUpdate')),
	);
	if (!sheets) return [request, walkCheck('rows', via)];
	const written = await sheetsWrites(
		sheets,
		walked,
		SUBSCRIPTIONS_SHEET_ID,
		'Subscriptions',
		SUBSCRIPTION_ROWS,
	);
	return [
		request,
		written.target,
		{ name: 'match-on', pass: written.matchOn === 'Subscription ID', detail: written.matchOn },
		rowsCheck(
			written.rows,
			[
				{
					'Subscription ID': 'sub_1',
					'Customer email': 'ada@lovelace.test',
					Plan: 'Pro',
					'Monthly price': 49,
					'Renews on': '2026-01-01',
				},
				{
					'Subscription ID': 'sub_2',
					'Customer email': 'grace@hopper.test',
					Plan: 'Team',
					'Monthly price': 129.5,
					'Renews on': '2026-02-01',
				},
			],
			via,
		),
	];
};

const GRADERS: Record<string, Grader> = {
	'nc-notion-filter-and-read': gradeNotionFilterAndRead,
	'nc-notion-edit-add-filter': gradeNotionEditAddFilter,
	'nc-sheets-lookup-first-match': gradeSheetsLookupFirstMatch,
	'nc-http-cursor-pagination': gradeHttpCursorPagination,
	'nc-gmail-send-then-post': gradeGmailSendThenPost,
	'nc-sheets-dynamic-columns': gradeSheetsDynamicColumns,
	'nc-set-keep-all-passthrough': gradeSetKeepAllPassthrough,
	'nc-if-string-amount-threshold': gradeIfStringAmountThreshold,
	'nc-holdout-notion-deals-to-sheet': gradeHoldoutNotionDealsToSheet,
	'nc-holdout-sheets-orders-gmail': gradeHoldoutSheetsOrdersGmail,
	'nc-holdout-gmail-gemini-triage': gradeHoldoutGmailGeminiTriage,
	'nc-holdout-http-subscriptions-upsert': gradeHoldoutHttpSubscriptionsUpsert,
};

/** A migrated legacy node (e.g. Notion v4) runs a contract action, so grade it as that action's node type. */
const withContractTypes = (workflow: WorkflowResponse): WorkflowResponse => ({
	...workflow,
	nodes: workflow.nodes.map((node) => {
		const action = migratedSlotOf(node) ? actionOfNode(node) : undefined;
		return action ? { ...node, type: nodeTypeOf(action), typeVersion: action.version } : node;
	}),
});

async function gradeSafely(caseSlug: string, workflow: WorkflowResponse): Promise<Check[]> {
	const grade = GRADERS[caseSlug];
	if (!grade) return [{ name: 'grader', pass: false, detail: `no grader for ${caseSlug}` }];
	try {
		return await grade(withContractTypes(workflow));
	} catch (error) {
		return [{ name: 'grader', pass: false, detail: `grader threw: ${errorText(error)}` }];
	}
}

// ── Build diagnostics ───────────────────────────────────────────────────────

interface StepDiagnostics {
	inputTokens?: number;
	outputTokens?: number;
	cacheReadTokens?: number;
	cacheWriteTokens?: number;
	modelMs?: number;
}

interface BuildCallDiagnostics {
	success: boolean;
	reason?: string;
	tscErrorCodes: string[];
	claimLevel?: string;
	simulatedNodes?: number;
}

interface BuildDiagnostics {
	/** `run-debug`: steps carry usage and model time. `events`: steps are counted only. */
	stepSource: 'run-debug' | 'events';
	steps: StepDiagnostics[];
	modelMs: number;
	toolMs: number;
	tools: Array<{ name: string; ms: number; failed?: boolean }>;
	buildCalls: BuildCallDiagnostics[];
	firstBuildPassed?: boolean;
	extraSteps: {
		typeDefinitionAfterSearch: number;
		verifyBuiltWorkflow: number;
		workspace: number;
		toolSearch: number;
	};
	sandboxPhases?: Array<{ phase: string; atMs: number }>;
}

const numberOrUndefined = (value: unknown) => (typeof value === 'number' ? value : undefined);
const stringOrUndefined = (value: unknown) => (typeof value === 'string' ? value : undefined);

/** Uses the server's event time: the SSE capture time adds client delay. */
const withServerTime = (events: CapturedEvent[]): CapturedEvent[] =>
	events.map((event) => ({
		...event,
		timestamp: numberOrUndefined(event.data.ts) ?? event.timestamp,
	}));

const stepFromRunDebug = (output: unknown): StepDiagnostics => ({
	inputTokens: numberOrUndefined(valueAt(output, 'usage.inputTokens')),
	outputTokens: numberOrUndefined(valueAt(output, 'usage.outputTokens')),
	cacheReadTokens: numberOrUndefined(valueAt(output, 'usage.inputTokenDetails.cacheReadTokens')),
	cacheWriteTokens: numberOrUndefined(valueAt(output, 'usage.inputTokenDetails.cacheWriteTokens')),
	modelMs: numberOrUndefined(valueAt(output, 'performance.responseTimeMs')),
});

/** Empty when the instance runs without N8N_INSTANCE_AI_RUN_DEBUG_ENABLED (the routes answer 404). */
async function runDebugRecords(
	client: N8nClient,
	threadId: string,
): Promise<InstanceAiRunDebugResponse[]> {
	try {
		const { runs } = await client.listThreadDebugRuns(threadId, 30_000);
		return await Promise.all(runs.map(async (run) => await client.getRunDebug(run.runId, 30_000)));
	} catch {
		return [];
	}
}

const runDebugSteps = (records: InstanceAiRunDebugResponse[]): StepDiagnostics[] =>
	records.flatMap((record) => record.steps.map((step) => stepFromRunDebug(step.output)));

type Counter = ReturnType<typeof tokenCounter>;

/** Per-block input tokens of the run-debug steps; undefined without steps or on a count error. */
async function compositionOf(
	counter: Counter,
	records: InstanceAiRunDebugResponse[],
	label: string,
): Promise<TokenComposition | undefined> {
	const steps = records.flatMap((record) => record.steps);
	if (steps.length === 0) {
		console.log(`[${label}] composition: no run-debug steps (instance restarted or debug off)`);
		return undefined;
	}
	try {
		return await tokenComposition(counter, steps);
	} catch (error) {
		console.log(`[${label}] composition failed: ${errorText(error)}`);
		return undefined;
	}
}

/** Total length of the union of the intervals. */
const unionMs = (intervals: Array<[number, number]>) =>
	[...intervals]
		.sort((a, b) => a[0] - b[0])
		.reduce(
			(acc, [start, end]) =>
				end <= acc.end ? acc : { end, total: acc.total + end - Math.max(start, acc.end) },
			{ end: -Infinity, total: 0 },
		).total;

/** Pairs each end event with the start event of the same key. */
function intervals(
	events: CapturedEvent[],
	startTypes: string[],
	endTypes: string[],
	key: (event: CapturedEvent) => unknown,
): Array<[number, number]> {
	const starts = new Map(
		events.filter((event) => startTypes.includes(event.type)).map((e) => [key(e), e.timestamp]),
	);
	return events
		.filter((event) => endTypes.includes(event.type))
		.flatMap((event) => {
			const start = starts.get(key(event));
			return start === undefined ? [] : [[start, event.timestamp]];
		});
}

function buildCallDiagnostics(call: CapturedToolCall): BuildCallDiagnostics {
	const errors = valueAt(call.result, 'errors');
	const simulated = valueAt(call.result, 'verification.claim.simulatedNodes');
	return {
		success: !call.error && valueAt(call.result, 'success') === true,
		reason:
			stringOrUndefined(valueAt(call.result, 'remediation.reason')) ??
			stringOrUndefined(valueAt(call.result, 'verification.remediation.reason')) ??
			call.error?.slice(0, 120),
		tscErrorCodes: (Array.isArray(errors) ? errors : []).flatMap((error) =>
			typeof error === 'string'
				? [...error.matchAll(/error (TS\d+)/g)].flatMap((match) => (match[1] ? [match[1]] : []))
				: [],
		),
		claimLevel: stringOrUndefined(valueAt(call.result, 'verification.claim.level')),
		simulatedNodes: Array.isArray(simulated) ? simulated.length : undefined,
	};
}

/** Log message fragments that mark sandbox phases, by short label. */
const SANDBOX_PHASES: Record<string, string> = {
	kb: 'Materialized knowledge base',
	pack: 'Packed workspace package',
	link: 'Linked workspace packages',
	save: 'Updating versionId',
	classify: 'Classified workflow nodes for verification simulation',
};

const timeOfDayMs = (line: string) => {
	const match = line.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
	return match
		? ((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000 + Number(match[4])
		: undefined;
};

function sandboxPhases(logLines: string[], threadId: string, runStart: number, runEnd: number) {
	// Log lines carry only the local time of day. Search back from the thread's last mention so
	// that other days and other instances' threads do not match.
	const lastMention = logLines.findLastIndex((line) => line.includes(threadId));
	if (lastMention < 0) return undefined;
	const dayStart = new Date(runStart).setHours(0, 0, 0, 0);
	const [from, to] = [runStart - dayStart, runEnd - dayStart];
	const windowStart =
		logLines.slice(0, lastMention).findLastIndex((line) => (timeOfDayMs(line) ?? from) < from) + 1;
	return logLines.slice(windowStart, lastMention + 1).flatMap((line) => {
		const at = timeOfDayMs(line);
		const phase = Object.keys(SANDBOX_PHASES).find((label) =>
			line.includes(SANDBOX_PHASES[label] ?? label),
		);
		return phase && at !== undefined && at <= to ? [{ phase, atMs: at - from }] : [];
	});
}

function buildDiagnostics(
	events: CapturedEvent[],
	runDebug: StepDiagnostics[],
	threadId: string,
	logLines?: string[],
): BuildDiagnostics {
	const toolCallIdOf = (event: CapturedEvent) => valueAt(event.data, 'payload.toolCallId');
	// A tool call with invalid input has only tool-input-start and tool-error events.
	const inputStartNames = new Map(
		events
			.filter((event) => event.type === 'tool-input-start')
			.map((event) => [
				toolCallIdOf(event),
				stringOrUndefined(valueAt(event.data, 'payload.toolName')),
			]),
	);
	const toolCalls = extractOutcomeFromEvents(events)
		.toolCalls.filter(
			(call, index, all) =>
				all.findIndex((other) => other.toolCallId === call.toolCallId) === index,
		)
		.map((call) => ({
			...call,
			toolName: call.toolName || (inputStartNames.get(call.toolCallId) ?? '?'),
		}));
	const runIntervals = intervals(events, ['run-start'], ['run-finish'], (e) => e.data.runId);
	const toolMs = unionMs(
		intervals(events, ['tool-call'], ['tool-result', 'tool-error'], toolCallIdOf),
	);
	const responseIds = new Set(events.flatMap((e) => stringOrUndefined(e.data.responseId) ?? []));
	const steps = runDebug.length
		? runDebug
		: Array.from({ length: responseIds.size }, (): StepDiagnostics => ({}));
	const nodeActions = toolCalls.filter((c) => c.toolName === 'nodes').map((c) => c.args.action);
	const firstSearch = nodeActions.indexOf('search');
	const countTools = (match: (name: string) => boolean) =>
		toolCalls.filter((call) => match(call.toolName)).length;
	const buildCalls = toolCalls
		.filter((call) => call.toolName === 'build-workflow')
		.map(buildCallDiagnostics);
	const runStart = Math.min(...runIntervals.map(([start]) => start));
	const runEnd = Math.max(...runIntervals.map(([, end]) => end));
	return {
		stepSource: runDebug.length ? 'run-debug' : 'events',
		steps,
		modelMs: runDebug.length
			? runDebug.reduce((total, step) => total + (step.modelMs ?? 0), 0)
			: // Without the debug buffer, run time outside tool calls counts as model time.
				Math.max(0, unionMs(runIntervals) - toolMs),
		toolMs,
		tools: toolCalls.map((call) => ({
			name: call.toolName,
			ms: call.durationMs,
			...(call.error ? { failed: true } : {}),
		})),
		buildCalls,
		firstBuildPassed: buildCalls[0]?.success,
		extraSteps: {
			typeDefinitionAfterSearch:
				firstSearch < 0
					? 0
					: nodeActions.slice(firstSearch).filter((action) => action === 'type-definition').length,
			verifyBuiltWorkflow: countTools((name) => name === 'verify-built-workflow'),
			workspace: countTools((name) => name.startsWith('workspace_')),
			toolSearch: countTools((name) => name === 'load_tool' || name === 'search_tools'),
		},
		sandboxPhases:
			logLines && runIntervals.length
				? sandboxPhases(logLines, threadId, runStart, runEnd)
				: undefined,
	};
}

/** Events of a thread from an instance database, for results.json files without diagnostics. */
function databaseEvents(databasePaths: string[], threadId: string): CapturedEvent[] {
	if (!/^[\w-]+$/.test(threadId)) return [];
	const query = `select type, payload, createdAt from instance_ai_events where threadId = '${threadId}' order by seq`;
	return databasePaths.flatMap((databasePath) => {
		const output = execFileSync('sqlite3', ['-json', databasePath, query], { encoding: 'utf8' });
		const rows: unknown = output.trim() ? JSON.parse(output) : [];
		return (Array.isArray(rows) ? rows : []).filter(isRecord).flatMap((row) => {
			const data: unknown = typeof row.payload === 'string' ? JSON.parse(row.payload) : undefined;
			return isRecord(data) && typeof row.type === 'string'
				? [
						{
							type: row.type,
							data,
							timestamp:
								numberOrUndefined(data.ts) ??
								Date.parse(`${String(row.createdAt).replace(' ', 'T')}Z`),
						},
					]
				: [];
		});
	});
}

const isBuildDiagnostics = (value: unknown): value is BuildDiagnostics =>
	isRecord(value) &&
	Array.isArray(value.steps) &&
	Array.isArray(value.buildCalls) &&
	Array.isArray(value.tools) &&
	typeof value.modelMs === 'number' &&
	isRecord(value.extraSteps);

interface DiagnosticsRow {
	label: string;
	arm: string;
	pass: boolean;
	tokens?: { input: number; output: number; cost: number };
	diagnostics?: BuildDiagnostics;
}

const sumKnown = (values: Array<number | undefined>) =>
	values.some((value) => value !== undefined)
		? values.reduce<number>((total, value) => total + (value ?? 0), 0)
		: undefined;

const median = (values: Array<number | undefined>) => {
	const known = values.filter((value) => value !== undefined).sort((a, b) => a - b);
	const middle = Math.floor(known.length / 2);
	return known.length % 2
		? known[middle]
		: known.length
			? ((known[middle - 1] ?? 0) + (known[middle] ?? 0)) / 2
			: undefined;
};

/** Table columns after `pass`, with decimal digits. `first build ok` goes after `build calls`. */
const COLUMNS: Array<[name: string, digits: number]> = [
	['steps', 0],
	['in k', 1],
	['out k', 1],
	['cacheRead k', 1],
	['cacheWrite k', 1],
	['$', 3],
	['model s', 1],
	['tool s', 1],
	['build calls', 0],
	['tsc errors', 0],
	['extra steps', 0],
];
const FIRST_BUILD_COLUMN = 9;

/** Values in COLUMNS order; token totals come from /metrics, cache tokens from run-debug steps. */
function diagnosticsColumns({ tokens, diagnostics: d }: DiagnosticsRow): Array<number | undefined> {
	const steps = d?.steps ?? [];
	const stepSum = (key: 'cacheReadTokens' | 'cacheWriteTokens') => {
		const total = sumKnown(steps.map((step) => step[key]));
		return total === undefined ? undefined : total / 1000;
	};
	return [
		d && steps.length,
		tokens && tokens.input / 1000,
		tokens && tokens.output / 1000,
		stepSum('cacheReadTokens'),
		stepSum('cacheWriteTokens'),
		tokens?.cost,
		d && d.modelMs / 1000,
		d && d.toolMs / 1000,
		d?.buildCalls.length,
		d?.buildCalls.reduce((total, call) => total + call.tscErrorCodes.length, 0),
		d && Object.values(d.extraSteps).reduce((total, count) => total + count, 0),
	];
}

const cell = (value: number | undefined, digits = 0) =>
	value === undefined ? '-' : value.toFixed(digits);

function tableRow(label: string, pass: string, values: Array<number | undefined>, firstOk: string) {
	const cells = values.map((value, index) => cell(value, COLUMNS[index]?.[1]));
	return `| ${[label, pass, ...cells.slice(0, FIRST_BUILD_COLUMN), firstOk, ...cells.slice(FIRST_BUILD_COLUMN)].join(' | ')} |`;
}

function diagnosticsDetail({ diagnostics: d }: DiagnosticsRow) {
	if (!d) return '   no diagnostics (pass --instance-db for older results)';
	const stepText = d.steps
		.map(
			(step, index) =>
				`${index + 1}: in ${cell(step.inputTokens)} out ${cell(step.outputTokens)} ` +
				`cr ${cell(step.cacheReadTokens)} cw ${cell(step.cacheWriteTokens)} ${cell(step.modelMs)}ms`,
		)
		.join('; ');
	const buildText = d.buildCalls
		.map(
			(call) =>
				`${call.success ? 'ok' : 'fail'}${call.reason ? ` ${call.reason}` : ''}` +
				`${call.tscErrorCodes.length ? ` [${call.tscErrorCodes.join(',')}]` : ''}` +
				`${call.claimLevel ? ` claim=${call.claimLevel}` : ''}` +
				`${call.simulatedNodes !== undefined ? ` simulated=${call.simulatedNodes}` : ''}`,
		)
		.join(' | ');
	const phaseText = d.sandboxPhases
		?.map((phase) => `${phase.phase}@${(phase.atMs / 1000).toFixed(1)}s`)
		.join(' ');
	return [
		`   steps (${d.stepSource}): ${d.stepSource === 'run-debug' ? stepText : d.steps.length}`,
		`   tools: ${d.tools.map((tool) => `${tool.name}${tool.failed ? '(failed)' : ''} ${(tool.ms / 1000).toFixed(1)}s`).join(', ')}`,
		`   builds: ${buildText || '-'}`,
		`   extra: ${Object.entries(d.extraSteps)
			.map(([name, count]) => `${name}=${count}`)
			.join(' ')}`,
		...(phaseText === undefined ? [] : [`   sandbox phases: ${phaseText || '-'}`]),
	].join('\n');
}

function printDiagnostics(rows: DiagnosticsRow[]) {
	console.log('\nBuild diagnostics');
	for (const row of rows) console.log(`[${row.label}]\n${diagnosticsDetail(row)}`);
	const names = COLUMNS.map(([name]) => name);
	const header = ['build', 'pass', ...names.slice(0, FIRST_BUILD_COLUMN), 'first build ok'];
	console.log(`\n| ${[...header, ...names.slice(FIRST_BUILD_COLUMN)].join(' | ')} |`);
	console.log(`|${'---|'.repeat(names.length + 3)}`);
	for (const row of rows) {
		const firstOk = row.diagnostics?.firstBuildPassed;
		console.log(
			tableRow(
				row.label,
				row.pass ? 'PASS' : 'FAIL',
				diagnosticsColumns(row),
				firstOk === undefined ? '-' : firstOk ? 'yes' : 'no',
			),
		);
	}
	for (const arm of [...new Set(rows.map((row) => row.arm))]) {
		const armRows = rows.filter((row) => row.arm === arm);
		const columns = armRows.map(diagnosticsColumns);
		const firstOks = armRows.flatMap((row) => row.diagnostics?.firstBuildPassed ?? []);
		console.log(
			tableRow(
				`median ${arm}`,
				`${armRows.filter((row) => row.pass).length}/${armRows.length}`,
				COLUMNS.map((_, index) => median(columns.map((values) => values[index]))),
				firstOks.length ? `${firstOks.filter(Boolean).length}/${firstOks.length}` : '-',
			),
		);
	}
}

// ── Runner ──────────────────────────────────────────────────────────────────

/** Token counts by request hash, shared by runs that write to the same out dir. */
const COUNT_CACHE_FILE = 'token-counts.json';

interface Arm {
	name: string;
	baseUrl: string;
}

const flagValues = (argv: string[], flag: string) =>
	argv.flatMap((arg, index) => (arg === flag && argv[index + 1] ? [argv[index + 1]] : []));

const expandCases = (slugs: string[]) => [
	...new Set(slugs.flatMap((slug) => (slug === 'all' ? Object.keys(GRADERS) : [slug]))),
];

function parseArgs(argv: string[]) {
	const value = (flag: string) => flagValues(argv, flag)[0];
	const arms: Arm[] = flagValues(argv, '--arm').flatMap((spec) => {
		const [name, baseUrl] = spec.split('=');
		return name && baseUrl ? [{ name, baseUrl }] : [];
	});
	const cases = expandCases(flagValues(argv, '--case'));
	if (cases.length === 0 || arms.length === 0) {
		throw new Error(
			'Usage: --case <slug|all> [--case ...] --arm <name>=<baseUrl> [--arm ...] [--iterations N] [--concurrency N] [--out dir] [--composition]',
		);
	}
	const ungraded = cases.filter((slug) => !GRADERS[slug]);
	if (ungraded.length) throw new Error(`No grader for ${ungraded.join(', ')}; add one to GRADERS`);
	return {
		cases,
		arms,
		iterations: Number(value('--iterations') ?? 3),
		concurrency: Number(value('--concurrency') ?? 4),
		serverLog: value('--server-log'),
		composition: argv.includes('--composition'),
		out:
			value('--out') ??
			path.join('/tmp', 'node-contracts-fast-loop', new Date().toISOString().replace(/[:.]/g, '-')),
	};
}

async function scrapeTokens(baseUrl: string) {
	const text = await fetch(`${baseUrl}/metrics`)
		.then(async (response) => await response.text())
		.catch(() => '');
	const metric = (pattern: RegExp) => Number(text.match(pattern)?.[1] ?? 0);
	return {
		input: metric(/^n8n_instance_ai_tokens_total\{type="input"\} (\S+)/m),
		output: metric(/^n8n_instance_ai_tokens_total\{type="output"\} (\S+)/m),
		cost: metric(/^n8n_instance_ai_cost_usd_total (\S+)/m),
	};
}

async function openArm(arm: Arm) {
	const client = new N8nClient(arm.baseUrl);
	await client.login();
	return {
		arm,
		client,
		preRunWorkflowIds: new Set(await client.listWorkflowIds()),
		claimedWorkflowIds: new Set<string>(),
		createdCredentialIds: new Set<string>(),
	};
}

/**
 * The seeds of an edit case are workflows that one arm built. An arm without node contracts
 * cannot load contract node types, so `seeds/<case>.<arm>.json` gives that arm the workflow
 * it built for the same task.
 */
function armSeedWorkflows(caseSlug: string, armName: string) {
	const file = path.join(__dirname, 'seeds', `${caseSlug}.${armName}.json`);
	if (!existsSync(file)) return undefined;
	const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
	return ConversationSeedSchema.shape.workflows.parse(Array.isArray(parsed) ? parsed : [parsed]);
}

function armSeed(testCase: WorkflowTestCaseWithFile, armName: string) {
	const { seed } = testCase.testCase;
	const workflows = armSeedWorkflows(testCase.fileSlug, armName);
	return seed && workflows ? { ...seed, workflows } : seed;
}

type ArmSession = Awaited<ReturnType<typeof openArm>>;

const logger = createLogger(false);

async function runBuild(
	session: ArmSession,
	testCase: WorkflowTestCaseWithFile,
	iteration: number,
	serverLog?: string,
	counter?: Counter,
) {
	const started = Date.now();
	const before = await scrapeTokens(session.arm.baseUrl);
	const build = await buildWorkflow({
		client: session.client,
		conversation: testCase.testCase.conversation,
		// An edit case starts from a seeded workflow.
		seed: armSeed(testCase, session.arm.name),
		credentials: testCase.testCase.credentials,
		createdCredentialIds: session.createdCredentialIds,
		preRunWorkflowIds: session.preRunWorkflowIds,
		claimedWorkflowIds: session.claimedWorkflowIds,
		logger,
		skipWorkflowChecks: true,
	});
	const after = await scrapeTokens(session.arm.baseUrl);
	const seconds = Math.round((Date.now() - started) / 1000);
	const events = withServerTime(build.events ?? []);
	const toolCalls = extractOutcomeFromEvents(events).toolCalls.map((call) => call.toolName);
	const records = build.threadId ? await runDebugRecords(session.client, build.threadId) : [];
	const diagnostics = build.threadId
		? buildDiagnostics(
				events,
				runDebugSteps(records),
				build.threadId,
				serverLog ? readFileSync(serverLog, 'utf8').split('\n') : undefined,
			)
		: undefined;
	const composition = counter
		? await compositionOf(
				counter,
				records,
				`${testCase.fileSlug} ${session.arm.name} #${iteration}`,
			)
		: undefined;
	const workflow = build.workflowJsons[0];
	const graded = workflow
		? await gradeSafely(testCase.fileSlug, workflow)
		: [{ name: 'build', pass: false, detail: build.error ?? 'no workflow' }];
	// An arm-specific seed has legacy nodes, so "keeps the typed nodes" does not apply.
	const checks = armSeedWorkflows(testCase.fileSlug, session.arm.name)
		? graded.filter(({ name }) => name !== 'typed')
		: graded;
	const result = {
		case: testCase.fileSlug,
		arm: session.arm.name,
		iteration,
		seconds,
		built: build.success,
		pass: buildPasses(checks),
		checks,
		toolCalls,
		tokens: {
			input: after.input - before.input,
			output: after.output - before.output,
			cost: after.cost - before.cost,
		},
		workflowId: build.workflowId,
		threadId: build.threadId,
		diagnostics,
		composition,
		workflow,
	};
	console.log(
		`[${result.case} ${result.arm} #${iteration}] ${result.pass ? 'PASS' : 'FAIL'} ${seconds}s ${toolCalls.length} tools  ` +
			checks
				.map((check) => `${check.name}=${check.ungraded ? '?' : check.pass ? 'ok' : 'x'}`)
				.join(' '),
	);
	return result;
}

type BuildRecord = Awaited<ReturnType<typeof runBuild>>;

const mean = (values: number[]) =>
	values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

function summaryRow(label: string, builds: BuildRecord[]) {
	const n = builds.length || 1;
	const checkNames = [
		...new Set(builds.flatMap((build) => build.checks.map((check) => check.name))),
	];
	const checkSummary = checkNames
		.map(
			(name) =>
				`${name} ${builds.filter((build) => build.checks.some((c) => c.name === name && c.pass)).length}/${n}${builds.some((build) => build.checks.some((c) => c.name === name && c.ungraded)) ? ' (some ungraded)' : ''}`,
		)
		.join(', ');
	return (
		`| ${label} | ${builds.filter((build) => build.pass).length}/${n} | ${checkSummary} | ` +
		`${mean(builds.map((build) => build.seconds)).toFixed(0)} | ` +
		`${mean(builds.map((build) => build.toolCalls.length)).toFixed(1)} | ` +
		`${mean(builds.map((build) => build.toolCalls.filter((t) => t === 'nodes').length)).toFixed(1)} | ` +
		`${(mean(builds.map((build) => build.tokens.input)) / 1000).toFixed(0)} | ` +
		`${(mean(builds.map((build) => build.tokens.output)) / 1000).toFixed(1)} | ` +
		`${mean(builds.map((build) => build.tokens.cost)).toFixed(3)} |`
	);
}

function printSummary(builds: BuildRecord[], cases: string[], arms: Arm[]) {
	console.log(
		'\n| case | arm | pass | checks | build s | tools | nodes calls | in ktok/build | out ktok/build | $/build |',
	);
	console.log('|---|---|---|---|---|---|---|---|---|---|');
	const armNames = [...new Set(arms.map((arm) => arm.name))];
	const rows = [
		...cases.flatMap((caseSlug) => armNames.map((armName) => [caseSlug, armName])),
		...armNames.map((armName) => ['all', armName]),
	];
	for (const [caseSlug, armName] of rows) {
		const matching = builds.filter(
			(build) => build.arm === armName && (caseSlug === 'all' || build.case === caseSlug),
		);
		console.log(summaryRow(`${caseSlug} | ${armName}`, matching));
	}
}

/** Diagnostics saved in the build, else computed from the instance database and server log. */
function savedBuildDiagnostics(
	build: Record<string, unknown>,
	options: { databasePaths: string[]; logLines?: string[] },
): BuildDiagnostics | undefined {
	if (isBuildDiagnostics(build.diagnostics)) return build.diagnostics;
	const threadId = stringOrUndefined(build.threadId);
	const events = threadId ? databaseEvents(options.databasePaths, threadId) : [];
	return threadId && events.length
		? buildDiagnostics(events, [], threadId, options.logLines)
		: undefined;
}

const savedTokens = (tokens: unknown) =>
	isRecord(tokens)
		? {
				input: numberOrUndefined(tokens.input) ?? 0,
				output: numberOrUndefined(tokens.output) ?? 0,
				cost: numberOrUndefined(tokens.cost) ?? 0,
			}
		: undefined;

interface GradeComposition {
	counter: Counter;
	/** Logged-in clients by arm name, from `--arm`: the run debug buffer lives in the instance. */
	clients: Map<string, N8nClient>;
	out: string;
}

/**
 * `--grade <file> [--case <slug>]` regrades a saved workflow JSON, or every build in a results.json.
 * For a results.json it also prints build diagnostics; `--instance-db` and `--server-log` fill them
 * in for builds saved without diagnostics. `--composition` with `--arm <name>=<baseUrl>` adds token
 * composition from the instance's run debug buffer and writes it to composition.json.
 */
async function gradeFile(
	caseSlugs: string[],
	file: string,
	options: { databasePaths: string[]; logLines?: string[]; composition?: GradeComposition },
) {
	const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
	const targets: Array<{
		label: string;
		caseSlug: string;
		workflow: WorkflowResponse;
		build?: Record<string, unknown>;
	}> = isWorkflowResponse(parsed)
		? caseSlugs.map((caseSlug) => ({
				label: `${caseSlug} ${path.basename(file)}`,
				caseSlug,
				workflow: parsed,
			}))
		: (Array.isArray(parsed) ? parsed : [])
				.filter(isRecord)
				// Single-case results.json files nest builds per arm and carry no case slug.
				.flatMap((entry) => (Array.isArray(entry.builds) ? entry.builds : [entry]))
				.filter(isRecord)
				.flatMap((build) => {
					const caseSlug = typeof build.case === 'string' ? build.case : caseSlugs[0];
					return caseSlug &&
						(caseSlugs.length === 0 || caseSlugs.includes(caseSlug)) &&
						isWorkflowResponse(build.workflow)
						? [
								{
									label: `${caseSlug} ${String(build.arm)} #${String(build.iteration)}`,
									caseSlug,
									workflow: build.workflow,
									build,
								},
							]
						: [];
				});
	if (targets.length === 0) throw new Error(`Nothing to grade in ${file}; pass --case <slug>`);
	const rows = await targets.reduce<
		Promise<Array<DiagnosticsRow & { composition?: TokenComposition; threadId?: string }>>
	>(async (previous, target) => {
		const done = await previous;
		const graded = await gradeSafely(target.caseSlug, target.workflow);
		// Same rule as the live run: an arm with its own seed workflow is not graded on `typed`.
		const checks =
			target.build && armSeedWorkflows(target.caseSlug, String(target.build.arm))
				? graded.filter(({ name }) => name !== 'typed')
				: graded;
		console.log(`[${target.label}] ${buildPasses(checks) ? 'PASS' : 'FAIL'}`);
		for (const check of checks) {
			console.log(
				`   ${check.ungraded ? '? ' : check.pass ? 'ok' : 'x '} ${check.name}: ${check.detail.slice(0, 300)}`,
			);
		}
		if (!target.build) return done;
		const threadId = stringOrUndefined(target.build.threadId);
		const client = options.composition?.clients.get(String(target.build.arm));
		if (options.composition && !client) {
			console.log(`   composition: pass --arm ${String(target.build.arm)}=<baseUrl>`);
		}
		const composition =
			options.composition && client && threadId
				? await compositionOf(
						options.composition.counter,
						await runDebugRecords(client, threadId),
						target.label,
					)
				: undefined;
		return [
			...done,
			{
				label: target.label,
				arm: String(target.build.arm),
				pass: buildPasses(checks),
				tokens: savedTokens(target.build.tokens),
				diagnostics: savedBuildDiagnostics(target.build, options),
				threadId,
				composition,
			},
		];
	}, Promise.resolve([]));
	if (rows.length) printDiagnostics(rows);
	const composed = rows.flatMap(({ label, threadId, composition }) =>
		composition ? [{ label, threadId, composition }] : [],
	);
	for (const { label, composition } of composed) printComposition(label, composition);
	if (options.composition && composed.length) {
		const out = path.join(options.composition.out, 'composition.json');
		writeFileSync(out, JSON.stringify(composed, null, 2));
		console.log(`\nComposition: ${out}`);
	}
}

/** Clients for `--arm` instances in grade mode, only when `--composition` needs them. */
async function gradeComposition(argv: string[], file: string): Promise<GradeComposition> {
	const out = flagValues(argv, '--out')[0] ?? path.dirname(file);
	mkdirSync(out, { recursive: true });
	const clients = await Promise.all(
		flagValues(argv, '--arm').flatMap((spec) => {
			const [name, baseUrl] = spec.split('=');
			return name && baseUrl
				? [
						(async (): Promise<[string, N8nClient]> => {
							const client = new N8nClient(baseUrl);
							await client.login();
							return [name, client];
						})(),
					]
				: [];
		}),
	);
	return {
		counter: tokenCounter(path.join(out, COUNT_CACHE_FILE)),
		clients: new Map(clients),
		out,
	};
}

function isWorkflowResponse(value: unknown): value is WorkflowResponse {
	return isRecord(value) && Array.isArray(value.nodes) && isRecord(value.connections);
}

async function main() {
	const argv = process.argv.slice(2);
	const gradeTarget = flagValues(argv, '--grade')[0];
	if (gradeTarget) {
		const serverLog = flagValues(argv, '--server-log')[0];
		await gradeFile(expandCases(flagValues(argv, '--case')), gradeTarget, {
			databasePaths: flagValues(argv, '--instance-db'),
			logLines: serverLog ? readFileSync(serverLog, 'utf8').split('\n') : undefined,
			composition: argv.includes('--composition')
				? await gradeComposition(argv, gradeTarget)
				: undefined,
		});
		return;
	}
	const args = parseArgs(argv);
	const testCases = loadWorkflowTestCasesWithFiles(undefined, undefined, {
		slugs: new Set(args.cases),
	});
	const missing = args.cases.filter(
		(slug) => !testCases.some((loaded) => loaded.fileSlug === slug),
	);
	if (missing.length) throw new Error(`Case not found: ${missing.join(', ')}`);
	mkdirSync(args.out, { recursive: true });
	const counter = args.composition
		? tokenCounter(path.join(args.out, COUNT_CACHE_FILE))
		: undefined;

	const sessions = await Promise.all(args.arms.map(openArm));
	const limit = pLimit(args.concurrency);
	// One queue per arm; each lane (instance) pulls one job at a time from its arm's queue.
	const queues = new Map(
		[...new Set(args.arms.map((arm) => arm.name))].map((armName) => [
			armName,
			Array.from({ length: args.iterations }, (_, iteration) =>
				testCases.map((testCase) => ({ testCase, iteration })),
			).flat(),
		]),
	);
	const drain = async (session: ArmSession): Promise<BuildRecord[]> => {
		const job = queues.get(session.arm.name)?.shift();
		if (!job) return [];
		const build = await limit(
			async () => await runBuild(session, job.testCase, job.iteration, args.serverLog, counter),
		);
		return [build, ...(await drain(session))];
	};
	const builds = (await Promise.all(sessions.map(drain))).flat();
	writeFileSync(path.join(args.out, 'results.json'), JSON.stringify(builds, null, 2));
	printSummary(builds, args.cases, args.arms);
	printDiagnostics(
		builds.map((build) => ({
			label: `${build.case} ${build.arm} #${build.iteration}`,
			...build,
		})),
	);
	for (const build of builds) {
		if (build.composition) {
			printComposition(`${build.case} ${build.arm} #${build.iteration}`, build.composition);
		}
	}
	console.log(`\nResults: ${path.join(args.out, 'results.json')}`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
