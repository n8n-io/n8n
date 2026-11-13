/**
 * Writes the source of one converted module: the main workflow and the
 * sub-workflows that it calls (each one an async function inside `run`).
 *
 * A workflow body has one of two shapes:
 *
 * - **Flat.** One `const` list of items for each node output, in the static
 *   v1 run order. A node reads the lists of its parents. This shape is exact
 *   when the graph has no cycle and the v1 run stack cannot reorder effects
 *   (see `needsEngine`).
 * - **Engine.** Each node becomes a local async function. A loop runs the v1
 *   run stack (`WorkflowExecute` with `executionOrder: 'v1'`) with the
 *   helpers `v1Start`, `v1Next` and `v1Done`: depth first, children ordered
 *   by canvas position, nodes with several inputs wait for each input, a
 *   node runs once for each parent that sends items, and loops run until no
 *   items are left. Lists of the latest run of each node are `let` variables.
 */
import type { LegacyIssue } from '../legacy/index.ts';
import type { Code } from './code.ts';
import { literal, print, raw, str, Writer } from './code.ts';
import type { NodeContext, SubWorkflowCall } from './context.ts';
import { NodeFailure } from './context.ts';
import type { ExpressionScope, PairedItem, TranslateOptions } from './expression.ts';
import { INDEX, ITEM, translateValue } from './expression.ts';
import { Graph } from './graph.ts';
import { HELPER_NAMES, helperSources } from './helpers.ts';
import { LUXON_ENTRY_HELPERS } from './code-native/luxon-expression.ts';
import { libraryPollSupports, lowerHttpRequest, lowerLibrary } from './library.ts';
import { hideParameters, resolvePlainExpressions } from './node-parameters.ts';
import { camelIdentifier, credentialKey, credentialSlots, NameTable } from './naming.ts';
import {
	BASE,
	HOST_CAPABLE,
	ITEM_WISE,
	isStepLowerer,
	lowererOf,
	ONE_TO_ONE,
	PURE,
} from './registry.ts';
import {
	clusterMembers,
	isClusterRoot,
	LANGCHAIN_PREFIX,
	lowerAiNode,
	lowerCluster,
	lowerHostNode,
	toolCalleeNodes,
	wholeNodeOutputs,
} from './host-node.ts';
import { referencedNodes, lowerWithRunData } from './run-data.ts';
import { lowerFallback } from './steps.ts';
import { lowerSendAndWait } from './waits.ts';
import { calleeTriggerItems, findSubworkflowStart, resolveCallee } from './subworkflow.ts';
import { DEFAULT_TIMEZONE, isTriggerType, planTrigger, pollSchedules } from './triggers.ts';
import type { ConvertDiagnostic, N8nNode, N8nWorkflow } from './types.ts';
import { isRecord, text } from './types.ts';

export interface ConvertOptions {
	/** Name for the header comment when the workflow has none. */
	name?: string;
	/** Time budget of the conversion in milliseconds (default 60 000), checked between rounds. */
	budgetMs?: number;
	/**
	 * Gives the workflow JSON of a sub-workflow by its id, for Execute Workflow
	 * nodes with the source "database". Return undefined when the id is unknown;
	 * the node then runs in the fallback host, which asks n8n.
	 */
	resolveWorkflow?: (id: string) => unknown;
	/**
	 * `ctx.trace` calls: `core` after each node that becomes code, `all` after
	 * each node, `none` never. The default is `core`.
	 */
	trace?: 'none' | 'core' | 'all';
	/** `always` writes every workflow in the engine shape (for tests). */
	engine?: 'auto' | 'always';
	/**
	 * The item of a Schedule Trigger: `native` is `{ scheduledAt }`; `v1` is the
	 * item of the v1 node (`timestamp`, `Readable date`, …), which a fallback
	 * host step (`n8n-compiled.schedule`) makes.
	 */
	scheduleItem?: 'native' | 'v1';
	/**
	 * Run a polling trigger (Gmail, Google Sheets, … triggers) once in the
	 * fallback host, as a manual run of n8n does, in place of a stand-in webhook.
	 */
	pollTrigger?: boolean;
	/**
	 * Convert polling triggers for production (spec 9.8): schedules from the
	 * poll times and a poll step. Off until the host poll in trigger mode is
	 * done; without it the converter puts a stand-in webhook in place.
	 */
	productionPoll?: boolean;
	/**
	 * Check the trigger and the nodes after it as n8n does before a manual run
	 * (`checkReadyForExecution`): a host step at the start fails with n8n's
	 * "nodes have issues" error. `pinnedNodes` are the nodes with pinned data.
	 */
	checkReady?: boolean;
	pinnedNodes?: string[];
	/** The trigger to start from, by node name (a manual run from one trigger). Default: webhook, schedule, first. */
	trigger?: string;
	/**
	 * JavaScript Code, Function and Function Item nodes: `native` (the default)
	 * runs the code as subset code when it fits (`code-native/`), else in the
	 * fallback host; `host` always runs it in the fallback host.
	 */
	codeNodes?: 'native' | 'host';
	/** Names of Code nodes that always run in the fallback host. */
	hostCodeNodes?: string[];
	/**
	 * The default time zone of the n8n instance (`GENERIC_TIMEZONE`). A workflow
	 * without `settings.timezone` uses it, as v1 does. The default is
	 * America/New_York.
	 */
	timezone?: string;
	/**
	 * The n8n instance: its base URL (`getInstanceBaseUrl()`, as n8n gives it) and
	 * its instance id. Library nodes that link to the workflow need them (the
	 * Slack attribution). Without it, those nodes run in the fallback host.
	 */
	instance?: InstanceInfo;
	/**
	 * The runtime runs `ctx.service` effects (spec 9.9) and its admin client answers
	 * them. The default is true: the Data Table node runs as a library node. With
	 * false, it runs in the fallback host.
	 */
	services?: boolean;
}

export interface InstanceInfo {
	baseUrl: string;
	id: string;
}

export interface Round {
	source: string;
	diagnostics: ConvertDiagnostic[];
	fallbackNodes: string[];
	/** Translated expressions by their range in the source. */
	ranges: Array<{ start: number; end: number; node: string; path: string }>;
	/** The lines (1-based, end exclusive) of the code of each node. */
	blocks: Array<{ node: string; from: number; to: number }>;
	credentials: Record<string, { id: string | null; name: string; type: string }>;
}

export function diagnosticKey(node: string, path: string): string {
	return `${node}\u0000${path}`;
}

const START = 'Start';

/** One workflow of the module: the main workflow or a sub-workflow. */
class Body {
	readonly graph: Graph;

	readonly outputs = new Map<string, Map<number, string>>();

	readonly emitted = new Set<string>();

	/** Engine shape: the `let` variables of the latest run of each node output. */
	readonly engineVars = new Map<string, Map<number, string>>();

	/** Variables that keep the node context (`getContext('node')`) of a node. */
	readonly states = new Map<string, string>();

	/** The variable of the `n8n-compiled.context` step result, when expressions need it. */
	instanceVar: string | null = null;

	readonly instanceKeys = new Set<string>();

	trigger: N8nNode | undefined;

	scope = new Set<string>();

	order: string[] = [];

	engine = false;

	/** The order in which items arrive on each edge (see `Graph.arrivalOrder`). */
	arrivals: Map<string, number> | undefined;

	/** The function name of a sub-workflow; empty for the main workflow. */
	fn = '';

	readonly wf: N8nWorkflow;

	/** Prefix of node names: empty for the main workflow, `<label> / ` for a sub-workflow. */
	readonly prefix: string;

	readonly label: string;

	constructor(wf: N8nWorkflow, prefix: string, label: string) {
		this.wf = wf;
		this.prefix = prefix;
		this.label = label;
		this.graph = new Graph(wf);
	}

	get isCallee(): boolean {
		return this.fn !== '';
	}

	/** The name of a node as the workflow JSON writes it. */
	short(name: string): string {
		return name.startsWith(this.prefix) ? name.slice(this.prefix.length) : name;
	}
}

/** A copy of a workflow whose node names start with `prefix`. */
function prefixed(wf: N8nWorkflow, prefix: string): N8nWorkflow {
	if (prefix === '') return wf;
	const connections: N8nWorkflow['connections'] = {};
	for (const [from, types] of Object.entries(wf.connections)) {
		const copy: Record<
			string,
			Array<Array<{ node: string; type: string; index: number }> | null>
		> = {};
		for (const [type, outputs] of Object.entries(types ?? {})) {
			copy[type] = (outputs ?? []).map((list) =>
				list === null ? null : list.map((t) => ({ ...t, node: `${prefix}${t.node}` })),
			);
		}
		connections[`${prefix}${from}`] = copy;
	}
	return {
		...wf,
		nodes: wf.nodes.map((n) => ({ ...n, name: `${prefix}${n.name}` })),
		connections,
	};
}

/** Reads a workflow from parsed JSON. Returns a reason when the shape is wrong. */
export function readWorkflow(input: unknown): N8nWorkflow | string {
	if (!isRecord(input)) return 'The workflow is not a JSON object.';
	if (!Array.isArray(input.nodes)) return 'The workflow has no `nodes` array.';
	const nodes: N8nNode[] = [];
	for (const n of input.nodes) {
		if (!isRecord(n) || typeof n.name !== 'string' || typeof n.type !== 'string') {
			return 'A node has no name or no type.';
		}
		nodes.push({
			...n,
			name: n.name,
			type: n.type,
			parameters: isRecord(n.parameters) ? n.parameters : {},
			typeVersion: typeof n.typeVersion === 'number' ? n.typeVersion : 1,
			position:
				Array.isArray(n.position) && n.position.length >= 2
					? [Number(n.position[0]) || 0, Number(n.position[1]) || 0]
					: [0, 0],
			credentials: isRecord(n.credentials)
				? Object.fromEntries(
						Object.entries(n.credentials).map(([k, v]) => [
							k,
							isRecord(v)
								? {
										id: typeof v.id === 'string' ? v.id : null,
										name: typeof v.name === 'string' ? v.name : '',
									}
								: { name: '' },
						]),
					)
				: undefined,
			disabled: n.disabled === true,
			alwaysOutputData: n.alwaysOutputData === true,
			executeOnce: n.executeOnce === true,
			retryOnFail: n.retryOnFail === true,
			maxTries: typeof n.maxTries === 'number' ? n.maxTries : undefined,
			waitBetweenTries: typeof n.waitBetweenTries === 'number' ? n.waitBetweenTries : undefined,
			onError:
				n.onError === 'continueRegularOutput' ||
				n.onError === 'continueErrorOutput' ||
				n.onError === 'stopWorkflow'
					? n.onError
					: undefined,
			continueOnFail: n.continueOnFail === true,
			notes: typeof n.notes === 'string' ? n.notes : undefined,
			webhookId: typeof n.webhookId === 'string' ? n.webhookId : undefined,
		});
	}
	const connections = isRecord(input.connections) ? input.connections : {};
	return {
		id: typeof input.id === 'string' || typeof input.id === 'number' ? String(input.id) : undefined,
		name: typeof input.name === 'string' ? input.name : undefined,
		nodes,
		connections: Object.fromEntries(
			Object.entries(connections).map(([k, v]) => [
				k,
				isRecord(v)
					? Object.fromEntries(
							Object.entries(v).map(([t, o]) => [t, Array.isArray(o) ? o : undefined]),
						)
					: undefined,
			]),
		),
		settings: isRecord(input.settings) ? input.settings : undefined,
		pinData: isRecord(input.pinData) ? input.pinData : undefined,
	};
}

/** Text of all parameters of a node, to look for variable names. */
function parameterText(node: N8nNode): string {
	return JSON.stringify(node.parameters ?? {});
}

/** True when a parameter of `node` names `target` in `$('…')`, `$node[…]` or `$items(…)`. */
function references(node: N8nNode, target: string): boolean {
	const t = parameterText(node);
	const name = JSON.stringify(target).slice(1, -1);
	return [`'${name}'`, `\\"${name}\\"`, `\`${name}\``, `.${name}.`].some((q) => t.includes(q));
}

/** Failure codes of expressions, which the run-data escape hatch handles. */
// `credential`: a credential type that the runtime cannot apply (library.ts `requireInjectable`).
const ESCAPABLE = /^(expression|compile|condition|credential)/;

/** Node types whose effect the fallback host cannot give (responses, waits, sub-workflows, loops). */
const NOT_IN_HOST = new Set(
	['respondToWebhook', 'wait', 'form', 'executeWorkflow', 'splitInBatches'].map(
		(t) => `${BASE}${t}`,
	),
);

/** The step name of the readiness check (`ConvertOptions.checkReady`). */
const CHECK_STEP = 'n8n readiness check';

/** The variable with the name of the node that runs now (`trace: 'all'`). */
const CURRENT_NODE = '$currentNode';

export class ModuleGenerator {
	private readonly names = new NameTable();

	private readonly w = new Writer();

	private readonly diagnostics: ConvertDiagnostic[] = [];

	/** Conditions under which a node gives no output (`NodeContext.noOutputWhen`). */
	private readonly noOutput = new Map<string, string>();

	/** Conditions under which v1 does not run a node (`NodeContext.notRunWhen`): no trace. */
	private readonly notRun = new Map<string, string>();

	private readonly helpers = new Set<string>();

	/** IANA time zones that native Code nodes format dates in (META \`zones\`). */
	private readonly zones = new Set<string>();

	/** The whole input list of each node with "execute once" (its input is the first item). */
	private readonly onceInputs = new Map<string, string>();

	private readonly fallback: string[] = [];

	private readonly slots = new Map<string, string>();

	private readonly usedSlots = new Map<string, string>();

	/** The trigger is a production poll: the run ends at once when it finds nothing. */
	private pollGuard = false;

	private readonly marks: Array<{ node: string; path: string }> = [];

	private readonly blocks: Array<{ node: string; from: number; to: number }> = [];

	private readonly bodies: Body[] = [];

	/** Sub-workflow function by callee key. */
	private readonly callees = new Map<string, Body>();

	private usesNoItems = false;

	/** Nodes whose output is the result of `ctx.node` calls of the node library. */
	private readonly directSteps = new Set<string>();

	private readonly wf: N8nWorkflow;

	private readonly knownIssues: Map<string, LegacyIssue[]>;

	private readonly brokenNodes: Map<string, { code: string; message: string }>;

	private readonly options: ConvertOptions;

	constructor(
		wf: N8nWorkflow,
		knownIssues: Map<string, LegacyIssue[]>,
		brokenNodes: Map<string, { code: string; message: string }>,
		options: ConvertOptions,
	) {
		this.wf = wf;
		this.knownIssues = knownIssues;
		this.brokenNodes = brokenNodes;
		this.options = options;
		for (const h of HELPER_NAMES) this.names.reserve(h);
	}

	private diag(d: ConvertDiagnostic) {
		this.diagnostics.push(d);
	}

	private get traceMode(): 'none' | 'core' | 'all' {
		return this.options.trace ?? 'core';
	}

	// ---- Lists and references -------------------------------------------------

	/** The list of a node output that other nodes read; `noItems` when the output has no list. */
	private outputVar(b: Body, node: string, index: number): string {
		const found = b.engine ? b.engineVars.get(node)?.get(index) : b.outputs.get(node)?.get(index);
		if (found) return found;
		this.usesNoItems = true;
		return 'noItems';
	}

	private known(b: Body, node: string): boolean {
		return b.engine ? b.engineVars.has(node) : b.emitted.has(node);
	}

	private inputCode(b: Body, node: string, index: number): string {
		// The items of several parents join in the order in which v1 runs the node for each parent.
		b.arrivals ??= b.trigger ? b.graph.arrivalOrder(b.trigger.name) : new Map<string, number>();
		const arrivals = b.arrivals;
		const rank = (e: { from: string; output: number; to: string; input: number }) =>
			arrivals.get(`${e.from}|${e.output}|${e.to}|${e.input}`) ?? Number.MAX_SAFE_INTEGER;
		const sources = b.graph
			.incoming(node)
			.filter((e) => e.input === index && b.emitted.has(e.from))
			.sort((x, y) => rank(x) - rank(y))
			.filter((e) => b.outputs.get(e.from)?.has(e.output))
			.map((e) => this.outputVar(b, e.from, e.output));
		if (sources.length === 0) {
			this.usesNoItems = true;
			return 'noItems';
		}
		if (sources.length === 1) return sources[0];
		return `[${sources.map((s) => `...${s}`).join(', ')}]`;
	}

	private singleItem(b: Body, name: string): boolean {
		const n = b.graph.nodes.get(name);
		if (!n) return false;
		return (
			n === b.trigger ||
			n.executeOnce === true ||
			n.type === `${BASE}aggregate` ||
			(n.type === `${BASE}limit` && (n.parameters?.maxItems ?? 1) === 1)
		);
	}

	private pairedItem(b: Body, current: string, target: string): PairedItem | null {
		if (!this.known(b, target)) return null;
		const list = this.outputVar(b, target, this.branchOf(b, current, target));
		if (this.singleItem(b, target)) return { code: `${list}[0]`, usesIndex: false };
		let cur = current;
		for (let guard = 0; guard < b.graph.nodes.size; guard++) {
			const inc = b.graph
				.incoming(cur)
				.filter((e) => e.input === 0 && b.scope.has(e.from) && this.known(b, e.from));
			if (inc.length !== 1) break;
			const e = inc[0];
			if (e.from === target) {
				return cur === current
					? { code: ITEM, usesIndex: false }
					: { code: `${this.outputVar(b, target, e.output)}[${INDEX}]`, usesIndex: true };
			}
			const parent = b.graph.nodes.get(e.from);
			if (!parent || parent.executeOnce || !(ONE_TO_ONE.has(parent.type) || parent.disabled)) break;
			cur = e.from;
		}
		return { code: `${list}[${INDEX}]`, usesIndex: true, approximate: true };
	}

	/**
	 * The output of `target` that `$('target')` reads from node `current`, as v1 finds it
	 * (`Workflow.getNodeConnectionIndexes`): the output of the first connection out of
	 * `target` that a breadth-first walk back from `current` meets. For a Loop Over Items
	 * node, inside the loop, that is the batch output.
	 */
	private branchOf(b: Body, current: string, target: string): number {
		const seen = new Set<string>();
		const queue = [current];
		for (let k = 0; k < queue.length; k++) {
			const name = queue[k];
			if (seen.has(name)) continue;
			seen.add(name);
			const incoming = [...b.graph.incoming(name)].sort((x, y) => x.input - y.input);
			for (const e of incoming) {
				if (e.from === target) return e.output;
				if (!seen.has(e.from)) queue.push(e.from);
			}
		}
		return 0;
	}

	/** The variable that holds the node context of `node`, declared at the top of its body. */
	private stateVar(b: Body, node: string): string {
		const found = b.states.get(node);
		if (found) return found;
		const name = this.names.unique(`${camelIdentifier(b.short(node))}Context`);
		b.states.set(node, name);
		return name;
	}

	/**
	 * Code of n8n instance data. `$execution` (id, mode, resume URLs) and `$vars`
	 * are glue calls of the runtime (spec 9.5). `$execution.customData` and `$env`
	 * come from one fallback-host step, which the runtime does not give.
	 */
	private instance(b: Body, key: string): string {
		if (key === 'execution') return 'ctx.execution()';
		if (key === 'vars') return 'ctx.vars()';
		const hostKey = key === 'customData' ? 'execution' : key;
		b.instanceVar ??= this.names.unique('n8nContext');
		b.instanceKeys.add(hostKey);
		return key === 'customData'
			? `${b.instanceVar}.execution.customData`
			: `${b.instanceVar}.${hostKey}`;
	}

	private scope(b: Body, node: N8nNode, input: string): ExpressionScope {
		const prev = b.graph.incoming(node.name).filter((e) => e.input === 0 && b.scope.has(e.from));
		const full = (name: string) => `${b.prefix}${name}`;
		return {
			pairedItem: (name) => this.pairedItem(b, node.name, full(name)),
			nodeList: (name) =>
				this.known(b, full(name))
					? this.outputVar(b, full(name), this.branchOf(b, node.name, full(name)))
					: null,
			nodeParameters: (name) => b.graph.nodes.get(full(name))?.parameters ?? null,
			nodeContext: (name) => (b.graph.nodes.has(full(name)) ? this.stateVar(b, full(name)) : null),
			inputList: input,
			itemsList: this.onceInputs.get(node.name),
			ownParameters: node.parameters ?? {},
			workflowName: b.wf.name ?? (b.isCallee ? b.label : (this.options.name ?? '')),
			workflowId: b.wf.id ?? '',
			prevNode: b.engine ? null : prev.length === 1 ? b.short(prev[0].from) : null,
			prevSource: b.engine ? 'source' : undefined,
			runIndex: b.engine ? 'runIndex' : '0',
			instance: (key) => this.instance(b, key),
			mark: (code, path) => {
				this.marks.push({ node: node.name, path });
				return `\u0001${this.marks.length - 1}\u0002${code}\u0003`;
			},
			knownIssues: (path) => this.knownIssues.get(diagnosticKey(node.name, path)),
			timezone: this.zoneOf(b.wf),
			useZone: (zone) => {
				this.zones.add(zone);
			},
		};
	}

	/** The time zone of a workflow, as v1 gives it to Luxon. */
	private zoneOf(wf: N8nWorkflow): string {
		const tz = wf.settings?.timezone;
		if (typeof tz === 'string' && tz !== '' && tz !== 'DEFAULT') return tz;
		return this.options.timezone ?? DEFAULT_TIMEZONE;
	}

	private credentialUses(node: N8nNode): Array<{ type: string; name: string }> {
		return Object.entries(node.credentials ?? {}).map(([type, ref]) => ({
			type,
			name: ref.name ?? '',
		}));
	}

	private context(
		b: Body,
		node: N8nNode,
		input: string,
		inputs: string[],
		hostValue?: (value: string) => string,
	): NodeContext {
		const w = this.w;
		const base = camelIdentifier(b.short(node.name));
		const outs = new Map<number, string>();
		b.outputs.set(node.name, outs);
		const scope = this.scope(b, node, input);
		if (hostValue) scope.hostValue = hostValue;
		const translate = (value: unknown, path: string, options?: TranslateOptions) =>
			translateValue(value, scope, path, options);
		// A library node reads its parameters as v1 holds them: without the ones that its
		// node type hides (`displayOptions`) at its version.
		const lowerer = lowererOf(node);
		const shown =
			lowerer === lowerLibrary || lowerer === lowerHttpRequest
				? hideParameters(node.type, node.typeVersion ?? 1, node.parameters ?? {})
				: (node.parameters ?? {});
		const plain = resolvePlainExpressions(shown);
		const parameters = isRecord(plain) ? plain : shown;
		return {
			node,
			parameters,
			version: node.typeVersion ?? 1,
			w,
			input,
			inputs,
			output: (index, suffix) => {
				const found = outs.get(index);
				if (found) return found;
				const name = this.names.unique(`${base}${suffix ?? (index === 0 ? '' : `Output${index}`)}`);
				outs.set(index, name);
				return name;
			},
			translate,
			compiled: (value, path, options) => {
				const t = translate(value, path, options);
				const f = t.failures[0];
				if (f) {
					throw new NodeFailure(
						'expression',
						`The expression \`${f.expression.slice(0, 120)}\` does not translate: ${f.issues.map((i) => i.feature).join(', ')}.`,
						f.path,
						f.issues[0]?.feature,
					);
				}
				if (t.usage.approximate) {
					this.diag({
						severity: 'warning',
						code: 'paired-item',
						node: node.name,
						message: 'An expression pairs items of another node by position.',
					});
				}
				return t;
			},
			print: (code: Code, prefix = '') =>
				print(code, w.indent, w.indent.length * 4 + prefix.length),
			helper: (name) => {
				this.helpers.add(name);
			},
			warn: (code, message, parameter) =>
				this.diag({ severity: 'warning', code, message, node: node.name, parameter }),
			info: (code, message, parameter) =>
				this.diag({ severity: 'info', code, message, node: node.name, parameter }),
			credentialOf: (other) => {
				const entry = Object.entries(other.credentials ?? {})[0];
				if (!entry) return undefined;
				const slot = this.slots.get(credentialKey(entry[0], entry[1].name ?? ''));
				if (slot) this.usedSlots.set(slot, entry[0]);
				return slot;
			},
			workflow: b.wf,
			resolveWorkflow: this.options.resolveWorkflow,
			credential: (type, of = node) => {
				const entries = Object.entries(of.credentials ?? {});
				// A node with several credentials uses the one its parameters name (HTTP Request:
				// `nodeCredentialType` or `genericAuthType`), as n8n does.
				const p = of.parameters ?? {};
				const named =
					p.authentication === 'predefinedCredentialType'
						? p.nodeCredentialType
						: p.authentication === 'genericCredentialType'
							? p.genericAuthType
							: undefined;
				const want = type ?? (typeof named === 'string' ? named : undefined);
				const entry = (want && entries.find(([t]) => t === want)) || entries[0];
				if (!entry) return undefined;
				const slot = this.slots.get(credentialKey(entry[0], entry[1].name ?? ''));
				if (slot) this.usedSlots.set(slot, entry[0]);
				return slot;
			},
			retry: () => {
				if (!node.retryOnFail) return null;
				// As v1's getRetryParams: 0 and a missing value take the default.
				const tries = Math.min(Math.max(node.maxTries || 3, 2), 5);
				const delay = Math.min(Math.max(node.waitBetweenTries || 1000, 0), 5000);
				return {
					kind: 'object',
					entries: [
						['max', raw(String(tries - 1))],
						['delayMs', raw(String(delay))],
					],
				};
			},
			scope,
			markFallback: () => {
				this.fallback.push(node.name);
			},
			noOutputWhen: (condition) => {
				// "Always output data" gives one empty item instead (ensureAlwaysOutputData of v1).
				if (node.alwaysOutputData) return;
				this.noOutput.set(node.name, condition);
			},
			notRunWhen: (condition) => {
				this.notRun.set(node.name, condition);
			},
			instance: this.options.instance,
			services: this.options.services,
			codeNodes:
				this.options.codeNodes === 'host' || this.options.hostCodeNodes?.includes(node.name)
					? 'host'
					: 'native',
			useZone: (zone) => {
				this.zones.add(zone);
			},
			connected: (index) => b.graph.outgoing(node.name).some((e) => e.output === index),
			ranBefore: (name) =>
				this.known(b, `${b.prefix}${name}`)
					? this.outputVar(
							b,
							`${b.prefix}${name}`,
							this.branchOf(b, node.name, `${b.prefix}${name}`),
						)
					: null,
			engine: b.engine,
			traceAll: this.traceMode === 'all',
			runIndex: b.engine ? 'runIndex' : '0',
			state: () => this.stateVar(b, node.name),
			local: (suffix) => this.names.unique(`${base}${suffix}`),
			subWorkflow: () => this.subWorkflowCall(node),
		};
	}

	/**
	 * The `runData` of a node whose expressions run in the fallback host: the
	 * nodes that the parameters name and the nodes before it, or every node
	 * that has a list when a name is computed. Each node gives its latest run.
	 */
	private runDataCode(b: Body, node: N8nNode): Code {
		const named = referencedNodes(node.parameters);
		const include = new Set<string>();
		const queue = b.graph.incoming(node.name).map((e) => e.from);
		while (queue.length > 0) {
			const n = queue.shift() ?? '';
			if (include.has(n) || n === node.name) continue;
			include.add(n);
			for (const e of b.graph.incoming(n)) queue.push(e.from);
		}
		const candidates =
			named === null ? [...b.graph.nodes.keys()] : named.map((n) => `${b.prefix}${n}`);
		for (const n of candidates) if (b.graph.nodes.has(n)) include.add(n);
		const listed = [...include].filter((n) => n !== node.name && this.known(b, n));
		// A node that the expressions name and that has not run here: n8n knows it, with no
		// runs (`$('X').isExecuted` is false, and v1's `$if` may never read it).
		const unrun = candidates.filter(
			(n) => b.graph.nodes.has(n) && n !== node.name && !listed.includes(n),
		);
		const display = (n: string) => (n === node.name ? n : b.short(n));
		const nodes: Code[] = [...listed, ...unrun].map((n) => {
			const def = b.graph.nodes.get(n);
			return {
				kind: 'object',
				entries: [
					['name', raw(str(b.short(n)))],
					['type', raw(str(def?.type ?? ''))],
					['typeVersion', literal(def?.typeVersion ?? 1)],
					['parameters', literal(def?.parameters ?? {})],
				],
			};
		});
		const members = new Set([...listed, node.name]);
		// An edge from this node back to an earlier node (a loop) is left out: this node has no
		// run yet, so the host would pair the earlier node's items with it and find no data.
		const connections: Code[] = b.graph.edges
			.filter((e) => members.has(e.from) && members.has(e.to) && e.from !== node.name)
			.map((e) => raw(`[${str(display(e.from))}, ${e.output}, ${str(display(e.to))}, ${e.input}]`));
		const runs: Array<[string, Code]> = listed.map((n) => {
			const outputs = new Set([0, ...b.graph.outgoing(n).map((e) => e.output)]);
			const max = Math.max(...outputs);
			const lists = Array.from({ length: max + 1 }, (_, k) =>
				raw(outputs.has(k) ? this.outputVar(b, n, k) : '[]'),
			);
			return [b.short(n), { kind: 'array', items: [{ kind: 'array', items: lists }] }];
		});
		return {
			kind: 'object',
			entries: [
				['nodes', { kind: 'array', items: nodes }],
				['connections', { kind: 'array', items: connections }],
				['runs', { kind: 'object', entries: runs }],
			],
		};
	}

	// ---- Sub-workflows -------------------------------------------------------

	private subWorkflowCall(node: N8nNode): SubWorkflowCall {
		const r = resolveCallee(node, this.options.resolveWorkflow);
		if (r.kind === 'host') return r;
		const callee = this.callees.get(r.key);
		if (!callee) return { kind: 'host', reason: 'The sub-workflow was not prepared.' };
		return { kind: 'function', fn: callee.fn, workflowName: callee.label };
	}

	/** Finds the sub-workflows that a body calls and prepares a body for each. */
	private collectCallees(b: Body) {
		for (const name of b.scope) {
			const node = b.graph.nodes.get(name);
			if (!node || node.disabled || node.type !== `${BASE}executeWorkflow`) continue;
			const r = resolveCallee(node, this.options.resolveWorkflow);
			if (r.kind !== 'function' || this.callees.has(r.key)) continue;
			const wf = readWorkflow(r.workflow);
			if (typeof wf === 'string') continue;
			const label = wf.name ?? r.label;
			const callee = new Body(prefixed(wf, `${label} / `), `${label} / `, label);
			const base = camelIdentifier(label, 'subWorkflow');
			callee.fn = this.names.unique(/workflow$/i.test(base) ? base : `${base}Workflow`);
			this.callees.set(r.key, callee);
			const start = findSubworkflowStart(callee.wf.nodes);
			callee.trigger = start;
			if (start) {
				callee.scope = callee.graph.reachable(start.name);
				this.collectCallees(callee);
			}
		}
	}

	// ---- Engine choice --------------------------------------------------------

	/**
	 * True when the flat shape could differ from v1: the graph has a cycle, a
	 * node gets items from several parents on one input and is not an item-wise
	 * core node with item-wise children, or a node with several inputs can wait
	 * for an input while effects of other nodes run.
	 */
	private needsEngine(b: Body): boolean {
		if (this.options.engine === 'always') return true;
		if (b.trigger === undefined) return false;
		if (b.graph.cycleNode(b.scope) !== null) return true;
		const order = b.graph.runOrder(b.trigger.name);
		const nodes = [...b.scope].map((n) => b.graph.nodes.get(n)).filter((n) => n !== undefined);
		const descendants = (name: string) => {
			const out = b.graph.reachable(name);
			out.delete(name);
			return out;
		};
		const effectful = (name: string) => {
			const n = b.graph.nodes.get(name);
			return n !== undefined && !n.disabled && !PURE.has(n.type);
		};
		for (const name of b.scope) {
			const incoming = b.graph.incoming(name).filter((e) => b.scope.has(e.from));
			const byInput = new Map<number, number>();
			for (const e of incoming) byInput.set(e.input, (byInput.get(e.input) ?? 0) + 1);
			if ([...byInput.values()].some((count) => count > 1)) {
				// v1 runs the node once for each parent. Only item-wise code gives the same lists.
				const subtree = [name, ...descendants(name)];
				for (const s of subtree) {
					const n = b.graph.nodes.get(s);
					if (!n) continue;
					if (!ITEM_WISE.has(n.type) && !n.disabled) return true;
					if (n.executeOnce || n.alwaysOutputData) return true;
					if (/\$prevNode|\$runIndex/.test(parameterText(n))) return true;
					if (b.graph.incoming(s).some((e) => e.input > 0)) return true;
				}
				const inSubtree = new Set(subtree);
				if (
					nodes.some(
						(n) => !inSubtree.has(n.name) && subtree.some((s) => references(n, b.short(s))),
					)
				)
					return true;
			}
			if ([...byInput.keys()].some((k) => k > 0)) {
				// A node with several inputs runs at the end when an input gets no items.
				const after = order.slice(order.indexOf(name) + 1);
				const own = descendants(name);
				if (after.some((a) => !own.has(a) && effectful(a))) return true;
			}
		}
		return false;
	}

	// ---- Nodes ------------------------------------------------------------------

	private emitNode(b: Body, node: N8nNode, inputs: string[]) {
		// The node that runs now, for the error trace of the run (see `assemble`).
		if (this.traceMode === 'all') this.w.line(`${CURRENT_NODE} = ${str(b.short(node.name))};`);
		const from = this.w.length;
		this.emitNodeCode(b, node, inputs);
		this.blocks.push({ node: node.name, from, to: this.w.length });
	}

	/** Lowers one node. `inputs` are the codes of its input lists, by input index. */
	private emitNodeCode(b: Body, node: N8nNode, inputs: string[]) {
		const w = this.w;
		const depth = w.depth;
		const base = camelIdentifier(b.short(node.name));
		let input = inputs[0];
		if (b.engine && inputs.length > 1) {
			// v1 reads the item expressions of a node with several inputs from the first input with items.
			const name = this.names.unique(`${base}Input`);
			this.helpers.add('firstItems');
			w.line(`const ${name}: Json[] = firstItems([${inputs.join(', ')}]);`);
			input = name;
		}
		if (node.executeOnce && !node.disabled) {
			const name = this.names.unique(`${base}FirstItem`);
			w.line(`const ${name}: Json[] = ${input}.slice(0, 1);`);
			this.onceInputs.set(node.name, input);
			input = name;
			// v1 (`handleExecuteOnce`) keeps the first item of every input, for example of a Merge.
			if (inputs.length > 1) {
				inputs = inputs.map((list, k) => {
					const once = this.names.unique(`${base}FirstItem${k}`);
					w.line(`const ${once}: Json[] = ${list}.slice(0, 1);`);
					return once;
				});
			}
		}
		// A lowering that fails goes back to here: the lists above stay, as `input` names them.
		const start = w.length;
		b.emitted.add(node.name);
		if (node.disabled) {
			const c = this.context(b, node, input, inputs);
			w.comment('Disabled in n8n: it passes its input through.');
			w.line(`const ${c.output(0)}: Json[] = ${inputs[0]};`);
			return;
		}
		let lowerer = lowererOf(node);
		// A node of another package with sub-nodes (the Evaluation node with a model) runs
		// as a cluster in the host, as LangChain roots do.
		if (!node.type.startsWith(LANGCHAIN_PREFIX) && isClusterRoot(b.wf, node.name)) {
			lowerer = lowerAiNode;
		}
		const fail = (code: string, message: string, parameter?: string, feature?: string) => {
			w.truncate(start, depth);
			w.comment(`Not converted: ${message}`);
			// Empty lists keep the rest of the source valid, so later nodes still convert and report.
			const outs = new Map<number, string>();
			for (const e of b.graph.outgoing(node.name)) {
				if (outs.has(e.output)) continue;
				const name = this.names.unique(`${base}${e.output === 0 ? '' : `Output${e.output}`}`);
				outs.set(e.output, name);
				w.line(`const ${name}: Json[] = [];`);
			}
			b.outputs.set(node.name, outs);
			this.diag({ severity: 'error', code, message, node: node.name, parameter, feature });
		};
		if (typeof lowerer === 'string') {
			fail('unsupported-node', lowerer);
			return;
		}
		// A core node that does not convert runs whole in the fallback host (host-node.ts).
		const whole = (reason: string, parameter?: string): boolean => {
			const count = wholeNodeOutputs(node);
			if (count === undefined) return false;
			w.truncate(start, depth);
			for (const name of b.outputs.get(node.name)?.values() ?? []) this.names.release(name);
			const c3 = this.context(b, node, input, inputs);
			try {
				lowerHostNode(c3, count);
			} catch (e3) {
				if (!(e3 instanceof NodeFailure)) throw e3;
				return false;
			}
			c3.warn('fallback-degrade', `${reason} The node runs in the fallback host.`, parameter);
			this.afterNode(b, node, inputs);
			return true;
		};
		// The last resort for expressions: the node runs whole in the fallback host with the run data
		// that n8n's expression engine needs there (run-data.ts).
		const escape = (code: string, reason: string, parameter?: string): boolean => {
			if (
				!ESCAPABLE.test(code) ||
				NOT_IN_HOST.has(node.type) ||
				lowererOf(node) === lowerSendAndWait
			)
				return false;
			w.truncate(start, depth);
			for (const name of b.outputs.get(node.name)?.values() ?? []) this.names.release(name);
			const c4 = this.context(b, node, input, inputs);
			// A cluster root keeps its sub-nodes; the host gives them to the root as in v1.
			if (node.type.startsWith(LANGCHAIN_PREFIX) && isClusterRoot(c4.workflow, node.name)) {
				lowerCluster(c4, clusterMembers(c4.workflow, node.name), this.runDataCode(b, node));
			} else {
				lowerWithRunData(c4, wholeNodeOutputs(node) ?? 1, this.runDataCode(b, node));
			}
			c4.warn(
				'host-expression',
				`${reason} n8n evaluates the expressions of the node in the fallback host, with the run data that they read.`,
				parameter,
			);
			this.afterNode(b, node, inputs);
			return true;
		};
		// For a node that must stay compiled (a response, a wait, a sub-workflow call): n8n's
		// expression engine in the fallback host gives the values of the expressions that do not
		// translate, for each input item, before the node runs.
		const evaluate = (reason: string, parameter?: string): boolean => {
			const values: string[] = [];
			const valuesVar = this.names.unique(`${base}Values`);
			const hostValue = (value: string) => {
				let k = values.indexOf(value);
				if (k < 0) k = values.push(value) - 1;
				return `${valuesVar}[${INDEX}].p${k}`;
			};
			const lower = lowerer;
			if (typeof lower === 'string') return false;
			const attempt = (from: number): boolean => {
				w.truncate(from, depth);
				for (const name of b.outputs.get(node.name)?.values() ?? []) this.names.release(name);
				try {
					lower(this.context(b, node, input, inputs, hostValue));
					return true;
				} catch (e5) {
					if (!(e5 instanceof NodeFailure)) throw e5;
					return false;
				}
			};
			// The first pass finds the values; the second emits the node after the host call.
			if (!attempt(start) || values.length === 0) return false;
			w.truncate(start, depth);
			for (const name of b.outputs.get(node.name)?.values() ?? []) this.names.release(name);
			const call: Code = {
				kind: 'object',
				entries: [
					['name', raw(str(`${node.name} (values)`))],
					['type', raw(str('n8n-compiled.evaluate'))],
					['typeVersion', raw('1')],
					[
						'parameters',
						{
							kind: 'object',
							entries: [
								['node', raw(str(node.name))],
								[
									'values',
									{
										kind: 'object',
										entries: values.map((v, k): [string, Code] => [`p${k}`, literal(v)]),
									},
								],
							],
						},
					],
					['items', raw(input)],
					['host', raw(str('fallback'))],
					['runData', this.runDataCode(b, node)],
				],
			};
			const head = `const ${valuesVar}: Json[] = ${input}.length === 0 ? [] : await ctx.node(`;
			w.block(`${head}${print(call, w.indent, w.indent.length * 4 + head.length)});`);
			if (!attempt(w.length)) return false;
			this.diag({
				severity: 'warning',
				code: 'host-expression',
				message: `${reason} n8n evaluates the expressions that do not translate in the fallback host.`,
				node: node.name,
				parameter,
			});
			this.afterNode(b, node, inputs);
			return true;
		};
		const broken = this.brokenNodes.get(node.name);
		if (broken !== undefined) {
			if (!whole(broken.message) && !escape(broken.code, broken.message))
				fail(broken.code, broken.message);
			return;
		}
		const errorOutput = node.onError === 'continueErrorOutput' ? 1 : -1;
		if (isStepLowerer(lowerer)) {
			const extra = b.graph
				.outgoing(node.name)
				.find((e) => e.output > 0 && e.output !== errorOutput);
			// The host runs the node with all its inputs and outputs. An output that the node
			// does not have (a stale connection) stays empty, as in v1.
			// Under `continueErrorOutput` too: the host gives the error output as v1 makes it.
			const toErrorOutput = node.onError === 'continueErrorOutput' && lowerer === lowerFallback;
			if (extra || toErrorOutput || (inputs.length > 1 && lowerer === lowerFallback)) {
				lowerer = (hc) => lowerHostNode(hc, wholeNodeOutputs(node) ?? 1);
			}
		}
		if (lowerer === lowerLibrary || lowerer === lowerHttpRequest) this.directSteps.add(node.name);
		const c = this.context(b, node, input, inputs);
		try {
			lowerer(c);
		} catch (e) {
			if (!(e instanceof NodeFailure)) throw e;
			const degradable =
				HOST_CAPABLE.has(node.type) && (e.code === 'expression' || e.code.startsWith('condition'));
			const several =
				inputs.length > 1 ||
				b.graph.outgoing(node.name).some((x) => x.output > 0) ||
				(wholeNodeOutputs(node) ?? 1) > 1;
			if ((several || !degradable) && whole(e.message, e.parameter)) return;
			if (degradable) {
				w.truncate(start, depth);
				for (const name of b.outputs.get(node.name)?.values() ?? []) this.names.release(name);
				const c2 = this.context(b, node, input, inputs);
				try {
					lowerFallback(c2);
					c2.warn(
						'fallback-degrade',
						`${e.message} The node runs in the fallback host.`,
						e.parameter,
					);
					this.afterNode(b, node, inputs);
					return;
				} catch (e2) {
					if (!(e2 instanceof NodeFailure)) throw e2;
				}
			}
			if (escape(e.code, e.message, e.parameter)) return;
			if (e.code === 'expression' && evaluate(e.message, e.parameter)) return;
			fail(e.code, e.message, e.parameter, e.feature);
			return;
		}
		this.afterNode(b, node, inputs);
	}

	private afterNode(b: Body, node: N8nNode, inputs: string[]) {
		const first = b.outputs.get(node.name)?.get(0);
		this.splitErrorItems(b, node, inputs);
		if (node.alwaysOutputData && first) {
			// v1 adds one empty item when output 0 has no item, whatever the other outputs hold.
			const ran =
				inputs.length === 1
					? `${inputs[0]}.length > 0`
					: `(${inputs.map((x) => `${x}.length > 0`).join(' || ')})`;
			this.w.line(`if (${ran} && ${first}.length === 0) ${first}.push({});`);
		}
	}

	/**
	 * `handleNodeErrorOutput` of v1 under `continueErrorOutput`: an item that a node gives
	 * with only `error`, `message` and `details`, and a truthy `error`, moves from the
	 * other outputs to the error output (the last one), merged into its input item. The
	 * host does this itself for the nodes that it runs.
	 */
	private splitErrorItems(b: Body, node: N8nNode, inputs: string[]) {
		if (node.onError !== 'continueErrorOutput' || this.fallback.includes(node.name)) return;
		const outs = b.outputs.get(node.name);
		if (!outs || outs.size < 2) return;
		const last = Math.max(...outs.keys());
		const errors = outs.get(last);
		if (errors === undefined) return;
		this.helpers.add('moveErrorItems');
		// Code nodes give items without paired items, so v1 cannot merge them into an input item.
		const code = /\.(code|function|functionItem|aiTransform)$/.test(node.type);
		const input = code ? '[]' : (inputs[0] ?? '[]');
		for (const [k, list] of [...outs.entries()].sort((x, y) => x[0] - y[0])) {
			if (k === last) continue;
			this.w.line(`moveErrorItems(${list}, ${errors}, ${input});`);
		}
	}

	/** True when the node becomes plain code (no step), so its lists need a trace call. */
	private isCore(node: N8nNode): boolean {
		if (this.traceMode === 'all') return true;
		if (this.traceMode === 'none') return false;
		// Steps of `ctx.node` and `ctx.code` show their results in step events.
		return !this.fallback.includes(node.name) && !this.directSteps.has(node.name);
	}

	private traceLine(node: N8nNode, lists: string[]) {
		if (!this.isCore(node)) return;
		// One output: the item list. Several outputs: one list for each output.
		let items = lists.length === 1 ? lists[0] : `[${lists.join(', ')}]`;
		// null: the node gave no output at all.
		const none = this.noOutput.get(node.name);
		if (none !== undefined) items = `${none} ? null : ${items}`;
		const skip = this.notRun.get(node.name);
		this.w.line(
			`${skip === undefined ? '' : `if (!(${skip})) `}ctx.trace(${str(node.name)}, ${items});`,
		);
	}

	/** The output lists of a node in index order, `[]` for outputs without a list. */
	private outputLists(b: Body, node: string): string[] {
		const outs = b.outputs.get(node) ?? new Map<number, string>();
		const connected = b.graph.outgoing(node).map((e) => e.output);
		// v1 keeps the error output of `continueErrorOutput` after the main outputs, even when empty.
		const def = b.graph.nodes.get(node);
		// A disabled node gives its input on one output, whatever outputs are connected.
		if (def?.disabled) return [outs.get(0) ?? '[]'];
		const errorOutput = def?.onError === 'continueErrorOutput' ? (wholeNodeOutputs(def) ?? 1) : 0;
		let max = Math.max(0, errorOutput, ...outs.keys(), ...connected);
		// A connection from an output that the node does not have (a stale connection)
		// gives no output in v1 run data.
		const known = def && !def.disabled ? wholeNodeOutputs(def) : undefined;
		if (
			known !== undefined &&
			def?.type === 'n8n-nodes-base.switch' &&
			def.parameters?.mode !== 'expression' &&
			max > known - 1
		) {
			max = Math.max(known - 1, errorOutput, ...outs.keys());
		}
		return Array.from({ length: max + 1 }, (_, k) => outs.get(k) ?? '[]');
	}

	// ---- Bodies ---------------------------------------------------------------

	private emitAiPlaceholder(b: Body, node: N8nNode, type: string) {
		const w = this.w;
		w.line();
		w.comment(`${b.short(node.name)} (${node.type}): not converted`);
		this.diag({
			severity: 'error',
			code: 'ai-sub-nodes',
			node: node.name,
			message: `The node uses sub-nodes (${type}). AI cluster nodes are not supported.`,
		});
	}

	private subNodeTargets(b: Body): Map<string, string> {
		const out = new Map<string, string>();
		for (const o of b.graph.otherConnections) {
			// Roots run as cluster steps in the fallback host (host-node.ts); only a sub-node
			// that feeds another sub-node is not a root here.
			if (b.graph.nodes.has(o.to)) continue;
			out.set(o.to, o.type);
		}
		return out;
	}

	private emitInstance(b: Body) {
		if (b.instanceVar === null) return;
		const w = this.w;
		w.comment('n8n data that the runtime does not give: `$execution.customData` and `$env`.');
		w.comment('The fallback host gives it.');
		const call: Code = {
			kind: 'object',
			entries: [
				['name', raw(str(`${b.prefix}n8n data`))],
				['type', raw(str('n8n-compiled.context'))],
				[
					'parameters',
					{
						kind: 'object',
						entries: [
							[
								'keys',
								{ kind: 'array', items: [...b.instanceKeys].sort().map((k) => raw(str(k))) },
							],
						],
					},
				],
				['items', raw('[]')],
			],
		};
		const prefix = `const ${b.instanceVar}: Json = { execution: {}, vars: {}, env: {}, ...((await ctx.node(`;
		w.block(
			`${prefix}${print(call, w.indent, w.indent.length * 4 + prefix.length)}))[0] ?? {}) };`,
		);
		w.line();
	}

	private emitStates(b: Body) {
		for (const [node, name] of b.states) {
			this.w.line(`const ${name}: Json = {}; // node context of "${b.short(node)}"`);
		}
	}

	/**
	 * Writes a body at the current indentation. The state and instance lines go
	 * first, but the lowering of the nodes declares them, so the body is written
	 * into its own writer region and the header lines are inserted after.
	 */
	private emitBody(b: Body, triggerItems: string) {
		const w = this.w;
		const headerAt = w.length;
		const depth = w.depth;
		if (b.engine) this.emitEngineBody(b, triggerItems);
		else this.emitFlatBody(b, triggerItems);
		// Insert the context lines that the nodes asked for at the start of the body.
		if (b.states.size === 0 && b.instanceVar === null) return;
		const tail = w.splice(headerAt);
		const endDepth = w.depth;
		w.depth = depth;
		this.emitInstance(b);
		this.emitStates(b);
		const shift = w.length - headerAt;
		w.append(tail);
		w.depth = endDepth;
		for (const block of this.blocks) {
			if (block.from >= headerAt) {
				block.from += shift;
				block.to += shift;
			}
		}
	}

	private emitFlatBody(b: Body, triggerItems: string) {
		const w = this.w;
		const trigger = b.trigger;
		if (!trigger) return;
		const triggerVar = this.names.unique(camelIdentifier(b.short(trigger.name), 'trigger'));
		b.outputs.set(trigger.name, new Map([[0, triggerVar]]));
		w.comment(`${b.short(trigger.name)} (${trigger.type.replace(BASE, '')})`);
		w.line(`const ${triggerVar}: Json[] = ${triggerItems};`);
		// A poll that found nothing ends the run, which then leaves no execution (spec 9.8).
		if (this.pollGuard) w.line(`if (!ctx.polled(${triggerVar})) return;`);
		// A trigger with `continueErrorOutput` has an empty error output in v1 run data. A
		// pinned trigger gives its pinned items as its only output (one list), also when it has
		// more outputs (a webhook with several methods).
		const pinned = (this.options.pinnedNodes ?? []).includes(trigger.name);
		this.traceLine(trigger, pinned ? [triggerVar] : this.outputLists(b, trigger.name));
		b.emitted.add(trigger.name);
		const last = b.isCallee ? this.names.unique('lastOutputs') : '';
		if (last) w.line(`let ${last}: Json[][] = [${triggerVar}];`);
		const sub = this.subNodeTargets(b);
		for (const name of b.order) {
			if (name === trigger.name) continue;
			const node = b.graph.nodes.get(name);
			if (!node) continue;
			const type = sub.get(name);
			if (type) {
				b.emitted.add(name);
				this.emitAiPlaceholder(b, node, type);
				continue;
			}
			const inputCount = Math.max(1, ...b.graph.incoming(name).map((e) => e.input + 1));
			const codes = Array.from({ length: inputCount }, (_, k) => this.inputCode(b, name, k));
			w.line();
			w.comment(`${b.short(node.name)} (${node.type.replace(BASE, '')})`);
			if (node.notes) w.comment(node.notes.trim());
			// A multi-source input becomes one list first, so the node reads a name.
			const base = camelIdentifier(b.short(node.name));
			const named = codes.map((code, k) => {
				if (!code.startsWith('[...')) return code;
				const v = this.names.unique(`${base}${inputCount > 1 ? `Input${k + 1}` : 'Input'}`);
				w.line(`const ${v}: Json[] = ${code};`);
				return v;
			});
			this.emitNode(b, node, named);
			const lists = this.outputLists(b, name);
			this.traceLine(node, lists);
			if (last) {
				w.line(
					`if (${named.map((x) => `${x}.length > 0`).join(' || ')}) ${last} = [${lists.join(', ')}];`,
				);
			}
		}
		if (last) {
			w.line();
			w.line(`return ${last};`);
		}
	}

	private engineGraph(b: Body): Code {
		const children: Array<[string, Code]> = [];
		const inputs: Array<[string, Code]> = [];
		const ancestors: Array<[string, Code]> = [];
		const required: Array<[string, Code]> = [];
		for (const name of b.order) {
			const node = b.graph.nodes.get(name);
			// v1 sorts the children of all outputs by canvas position: bottom first, then right first,
			// and puts each one at the front of the stack, so the top-left child runs first.
			const list = b.graph
				.outgoing(name)
				.filter((e) => b.scope.has(e.to))
				.map((e, k) => ({ e, k, pos: b.graph.position(e.to) }))
				.sort((x, y) => y.pos[1] - x.pos[1] || y.pos[0] - x.pos[0] || x.k - y.k)
				.map(({ e }): Code => raw(`[${e.output}, ${str(e.to)}, ${e.input}]`));
			if (list.length > 0) children.push([name, { kind: 'array', items: list }]);
			const inc = b.graph.incoming(name).filter((e) => b.scope.has(e.from));
			const count = Math.max(0, ...b.graph.incoming(name).map((e) => e.input + 1));
			if (count > 1) {
				inputs.push([name, raw(String(count))]);
				const up = new Set<string>();
				const queue = inc.map((e) => e.from);
				while (queue.length > 0) {
					const n = queue.shift() ?? '';
					if (up.has(n) || n === name) continue;
					up.add(n);
					for (const e of b.graph.incoming(n)) if (b.scope.has(e.from)) queue.push(e.from);
				}
				ancestors.push([name, { kind: 'array', items: [...up].map((n) => raw(str(n))) }]);
				const req = requiredInputs(node);
				if (req !== undefined) required.push([name, raw(req === 'all' ? "'all'" : String(req))]);
			}
		}
		return {
			kind: 'object',
			entries: [
				['children', { kind: 'object', entries: children }],
				['inputs', { kind: 'object', entries: inputs }],
				['ancestors', { kind: 'object', entries: ancestors }],
				['required', { kind: 'object', entries: required }],
			],
		};
	}

	private emitEngineBody(b: Body, triggerItems: string) {
		const w = this.w;
		const trigger = b.trigger;
		if (!trigger) return;
		const sub = this.subNodeTargets(b);
		// The `let` lists of the latest run of each node.
		w.comment('The items of the latest run of each node.');
		for (const name of b.order) {
			const base = camelIdentifier(b.short(name), name === trigger.name ? 'trigger' : 'node');
			const vars = new Map<number, string>();
			const outputs = new Set([0, ...b.graph.outgoing(name).map((e) => e.output)]);
			for (const k of [...outputs].sort((x, y) => x - y)) {
				vars.set(k, this.names.unique(k === 0 ? base : `${base}Output${k}`));
			}
			b.engineVars.set(name, vars);
			for (const v of vars.values()) w.line(`let ${v}: Json[] = [];`);
		}
		// One function for each node.
		const fns = new Map<string, string>();
		const outputCounts = new Map<string, number>();
		for (const name of b.order) {
			if (name === trigger.name) continue;
			const node = b.graph.nodes.get(name);
			if (!node) continue;
			const base = camelIdentifier(b.short(name));
			const fn = this.names.unique(`run${base.charAt(0).toUpperCase()}${base.slice(1)}`);
			fns.set(name, fn);
			w.line();
			w.comment(`${b.short(node.name)} (${node.type.replace(BASE, '')})`);
			if (node.notes) w.comment(node.notes.trim());
			// An arrow function, not a function declaration: the compiler creates a hoisted
			// declaration before the cells of the variables it captures (see docs/gym-diff.md).
			w.open(
				`const ${fn} = async (inputs: Json[][], runIndex: number, source: Json): Promise<Json[][] | null> => {`,
			);
			const type = sub.get(name);
			if (type) {
				b.emitted.add(name);
				this.emitAiPlaceholder(b, node, type);
				w.line('return [[]];');
				w.close('};');
				continue;
			}
			const inputCount = Math.max(1, ...b.graph.incoming(name).map((e) => e.input + 1));
			const named = Array.from({ length: inputCount }, (_, k) => {
				const v = this.names.unique(`${base}${inputCount > 1 ? `Input${k + 1}` : 'Input'}`);
				w.line(`const ${v}: Json[] = inputs[${k}] ?? [];`);
				return v;
			});
			// The function's own lists may take the names of the `let` lists: they hide them.
			const own = [...(b.engineVars.get(name)?.values() ?? [])];
			for (const v of own) this.names.release(v);
			this.emitNode(b, node, named);
			for (const v of own) this.names.reserve(v);
			const lists = this.outputLists(b, name);
			outputCounts.set(name, lists.length);
			// No output at all (`noOutputWhen`): an empty list of outputs.
			const none = this.noOutput.get(name);
			w.line(`return ${none === undefined ? '' : `${none} ? [] : `}[${lists.join(', ')}];`);
			w.close('};');
		}
		// The run stack.
		w.line();
		w.comment('The v1 run stack: depth first, top-left child first, as n8n runs the nodes.');
		const graph = this.names.unique('graph');
		w.block(
			`const ${graph}: Json = ${print(this.engineGraph(b), w.indent, w.indent.length * 4 + 20)};`,
		);
		const engine = this.names.unique('engine');
		if (this.pollGuard) {
			w.line(`const polledItems: Json[] = ${triggerItems};`);
			w.line('if (!ctx.polled(polledItems)) return;');
		}
		w.line(
			`const ${engine}: Json = v1Start(${graph}, ${str(trigger.name)}, ${this.pollGuard ? 'polledItems' : triggerItems});`,
		);
		this.helpers.add('v1Start');
		this.helpers.add('v1Next');
		this.helpers.add('v1Done');
		w.open(`for (let job = v1Next(${engine}); job !== null; job = v1Next(${engine})) {`);
		w.line('let out: Json[][] | null = null;');
		w.open('switch (job.node) {');
		for (const name of b.order) {
			const node = b.graph.nodes.get(name);
			if (!node) continue;
			const vars = b.engineVars.get(name) ?? new Map<number, string>();
			w.open(`case ${str(name)}:`);
			const traced = this.isCore(node) && this.traceMode !== 'none';
			if (name === trigger.name) {
				w.line(`${vars.get(0) ?? 'noItems'} = job.inputs[0] ?? [];`);
				w.line('out = job.inputs;');
				// A trigger with `continueErrorOutput` (not pinned) has an empty error output in v1.
				const errorList =
					node.onError === 'continueErrorOutput' &&
					!(this.options.pinnedNodes ?? []).includes(name);
				const items = errorList ? '[job.inputs[0] ?? [], []]' : 'job.inputs[0] ?? []';
				if (traced) w.line(`ctx.trace(${str(name)}, ${items});`);
			} else {
				w.line(`out = await ${fns.get(name)}(job.inputs, job.runIndex, job.source?.[0] ?? null);`);
				w.open('if (out !== null) {');
				for (const [k, v] of vars) w.line(`${v} = out[${k}] ?? [];`);
				if (traced) {
					const single = (outputCounts.get(name) ?? 1) === 1;
					const items = single ? 'out[0] ?? []' : 'out';
					w.line(
						`ctx.trace(${str(name)}, ${this.noOutput.has(name) ? `out.length === 0 ? null : ${items}` : items});`,
					);
				}
				w.close();
			}
			w.line('break;');
			w.depth--;
		}
		w.open('default:');
		w.line('break;');
		w.depth--;
		w.close();
		w.line(`v1Done(${engine}, job, out);`);
		w.close();
		if (b.isCallee) {
			this.helpers.add('v1Result');
			w.line(`return v1Result(${engine}, ${String(returnsAllRuns(trigger))});`);
		}
	}

	// ---- Module ---------------------------------------------------------------

	/** Picks the trigger of the main workflow. Without one, a stand-in start node feeds every root. */
	private mainTrigger(b: Body): N8nNode | string {
		const wf = b.wf;
		const triggers = wf.nodes.filter(
			(n) => isTriggerType(n.type) && b.graph.incoming(n.name).length === 0,
		);
		// With every trigger disabled, the run starts as in a workflow without a trigger: from
		// the nodes without a parent (a disabled trigger passes its input on).
		if (triggers.every((n) => n.disabled)) return 'none';
		const rank = (n: N8nNode) =>
			n.disabled
				? 3
				: n.type === `${BASE}webhook`
					? 0
					: n.type === `${BASE}scheduleTrigger`
						? 1
						: 2;
		// A manual run in n8n starts at the trigger that the user picks (`triggerToStartFrom`).
		const picked = b.isCallee ? undefined : triggers.find((n) => n.name === this.options.trigger);
		const trigger = picked ?? [...triggers].sort((a, b2) => rank(a) - rank(b2))[0];
		if (trigger.disabled) return 'Every trigger node is disabled.';
		for (const t of triggers) {
			if (t !== trigger) {
				this.diag({
					severity: 'warning',
					code: 'extra-trigger',
					node: t.name,
					message: `The workflow has more than one trigger. The converter keeps "${trigger.name}"; the nodes that only "${t.name}" reaches are left out.`,
				});
			}
		}
		return trigger;
	}

	/** A copy of the workflow with a manual start node that feeds each node without a parent. */
	private withStartNode(wf: N8nWorkflow): N8nWorkflow {
		const graph = new Graph(wf);
		let name = START;
		for (let n = 2; graph.nodes.has(name); n++) name = `${START} ${n}`;
		const roots = wf.nodes.filter(
			(n) =>
				graph.incoming(n.name).length === 0 &&
				n.type !== `${BASE}stickyNote` &&
				!graph.otherConnections.some((o) => o.from === n.name),
		);
		this.diag({
			severity: 'warning',
			code: 'no-trigger',
			message: `The workflow has no trigger node. The converter adds "${name}", which gives the trigger item to each node without a parent.`,
		});
		return {
			...wf,
			nodes: [
				...wf.nodes,
				{
					name,
					type: `${BASE}manualTrigger`,
					typeVersion: 1,
					position: [-1e6, -1e6],
					parameters: {},
				},
			],
			connections: {
				...wf.connections,
				[name]: { main: [roots.map((r) => ({ node: r.name, type: 'main', index: 0 }))] },
			},
		};
	}

	generate(): Round | string {
		let wf = this.wf;
		const probe = new Body(wf, '', '');
		let trigger = this.mainTrigger(probe);
		if (trigger === 'none') {
			wf = this.withStartNode(wf);
			trigger = this.mainTrigger(new Body(wf, '', ''));
		}
		if (typeof trigger === 'string') return trigger;
		const main = new Body(wf, '', '');
		main.trigger = main.graph.nodes.get(trigger.name);
		if (!main.trigger) return 'The trigger node is missing.';
		main.scope = main.graph.reachable(trigger.name);
		this.bodies.push(main);

		if (wf.pinData && Object.keys(wf.pinData).length > 0) {
			this.diag({
				severity: 'warning',
				code: 'pinned-data',
				message: 'The workflow has pinned data. The converter ignores it.',
			});
		}
		const order = wf.settings?.executionOrder;
		if (order !== 'v1') {
			this.diag({
				severity: 'info',
				code: 'execution-order',
				message: `The workflow uses execution order "${text(order, 'v0')}". The converter follows v1.`,
			});
		}
		for (const n of wf.nodes) {
			// AI sub-nodes run inside the step of their root node.
			const subNode = main.graph.otherConnections.some((o) => o.from === n.name);
			if (
				!main.scope.has(n.name) &&
				!subNode &&
				n.type !== `${BASE}stickyNote` &&
				!isTriggerType(n.type)
			) {
				this.diag({
					severity: 'info',
					code: 'unreachable',
					node: n.name,
					message: 'The trigger does not reach this node; v1 does not run it.',
				});
			}
		}

		this.collectCallees(main);
		const all = [main, ...this.callees.values()];
		for (const b of all) {
			if (!b.trigger) continue;
			b.order = b.graph.runOrder(b.trigger.name);
			b.engine = this.needsEngine(b);
			if (b.engine) {
				this.diag({
					severity: 'info',
					code: 'engine',
					message: `${b.isCallee ? `The sub-workflow "${b.label}"` : 'The workflow'} runs on the v1 run stack: it has a loop, or a node runs for each of its parents.`,
				});
			}
		}

		// Credential slots of every node in scope; the source lists only the slots it uses.
		// Every node counts, so AI sub-nodes (not on main connections) get slots too.
		// The callees of workflow tools (host-node.ts) run in the host with the slots of their nodes.
		const uses = all.flatMap((b) =>
			[...b.wf.nodes, ...toolCalleeNodes(b.wf, this.options.resolveWorkflow)].flatMap((node) =>
				this.credentialUses(node),
			),
		);
		for (const [k, v] of credentialSlots(uses)) this.slots.set(k, v);

		const zone =
			typeof wf.settings?.timezone === 'string' ? wf.settings.timezone : this.options.timezone;
		const polled = main.trigger;
		// A production run of a polling trigger polls on its schedule (spec 9.8).
		const pollPlan =
			this.options.productionPoll === true &&
			!this.options.pollTrigger &&
			polled &&
			isPollingTriggerType(polled.type)
				? this.productionPoll(polled, zone)
				: null;
		const plan =
			pollPlan ??
			planTrigger(
				main.trigger,
				wf.name ?? this.options.name ?? 'workflow',
				zone,
				(d) => this.diag({ ...d, node: main.trigger?.name }),
				this.options.scheduleItem,
			);
		for (const h of plan.helpers ?? []) this.helpers.add(h);
		for (const z of plan.zones ?? []) this.zones.add(z);
		if (this.options.pollTrigger && !plan.native && polled && isPollingTriggerType(polled.type)) {
			// A manual run of n8n polls a polling trigger once and gives what it finds; the
			// fallback host runs the node's `poll` (`poll: true`).
			const entry = Object.entries(polled.credentials ?? {})[0];
			const slot = entry ? this.slots.get(credentialKey(entry[0], entry[1].name ?? '')) : undefined;
			if (entry && slot) this.usedSlots.set(slot, entry[0]);
			const fields = [
				`name: ${str(polled.name)}`,
				`type: ${str(polled.type)}`,
				`typeVersion: ${JSON.stringify(polled.typeVersion ?? 1)}`,
				`parameters: ${JSON.stringify(polled.parameters ?? {})}`,
				...(slot ? [`credential: ${str(slot)}`] : []),
				// The library polls are for trigger runs; v1's manual mode runs in the host.
				"host: 'fallback'",
				'poll: true',
				// The poll keeps its cursor in the workflow static data (spec 9.7).
				'staticData: true',
			];
			// A poll that finds nothing: the manual run of n8n 2.x goes on with one empty item.
			plan.items = `((polled: Json[]): Json[] => (polled.length === 0 ? [{}] : polled))(await ctx.node({ ${fields.join(', ')} }))`;
		}
		const w = this.w;
		w.depth = 2;

		for (const callee of this.callees.values()) {
			w.comment(`Sub-workflow "${callee.label}". It returns the outputs of its last node.`);
			w.open(`async function ${callee.fn}(items: Json[]): Promise<Json[][]> {`);
			if (!callee.trigger) {
				w.line(
					"throw new Error('Missing node to start execution: the sub-workflow has no Execute Workflow Trigger node.');",
				);
			} else {
				const items = calleeTriggerItems(callee.trigger, 'items');
				if (items.helper) this.helpers.add(items.helper);
				this.emitBody(callee, items.code);
			}
			w.close();
			w.line();
		}

		this.emitBody(main, plan.items);

		// The run returns the items of each node that has no child.
		const leaves = main.order.filter(
			(n) => !main.graph.outgoing(n).some((e) => main.scope.has(e.to)),
		);
		const result: Code = {
			kind: 'object',
			entries: leaves.map((n) => [n, raw(this.outputVar(main, n, 0))]),
		};
		w.line();
		w.block(`return ${print(result, w.indent, w.indent.length * 4 + 7)};`);

		return this.assemble(plan, wf);
	}

	/** The n8n credential behind each slot that the source uses. */
	private credentialRefs(): Record<string, { id: string | null; name: string; type: string }> {
		const out: Record<string, { id: string | null; name: string; type: string }> = {};
		for (const [slot, type] of this.usedSlots) {
			for (const b of this.bodies.length > 0 ? this.allBodies() : []) {
				for (const n of b.wf.nodes) {
					const ref = n.credentials?.[type];
					if (ref && this.slots.get(credentialKey(type, ref.name ?? '')) === slot) {
						out[slot] ??= { id: ref.id ?? null, name: ref.name ?? '', type };
					}
				}
			}
		}
		return out;
	}

	private allBodies(): Body[] {
		return [...this.bodies, ...this.callees.values()];
	}

	/**
	 * The plan of a polling trigger in production (spec 9.8): schedules from
	 * its poll times, then one poll step: the library poll when the library
	 * takes the parameters, else the node's `poll` in the fallback host in
	 * trigger mode. Both keep the cursor in the static data, and a poll that
	 * finds nothing leaves no execution (`ctx.polled`). Null when the poll
	 * times do not convert.
	 */
	private productionPoll(
		node: N8nNode,
		zone: string | undefined,
	): ReturnType<typeof planTrigger> | null {
		const triggers = pollSchedules(node, zone);
		if (triggers === null) return null;
		const entry = Object.entries(node.credentials ?? {})[0];
		const slot = entry ? this.slots.get(credentialKey(entry[0], entry[1].name ?? '')) : undefined;
		if (entry && slot) this.usedSlots.set(slot, entry[0]);
		const version = node.typeVersion ?? 1;
		const parameters = node.parameters ?? {};
		const libraryParameters = { ...parameters, pollNode: node.name, pollVersion: version };
		const library = libraryPollSupports(node.type, libraryParameters);
		const fields = [
			`name: ${str(node.name)}`,
			`type: ${str(node.type)}`,
			`typeVersion: ${JSON.stringify(version)}`,
			`parameters: ${JSON.stringify(library ? libraryParameters : parameters)}`,
			...(slot ? [`credential: ${str(slot)}`] : []),
			...(library
				? []
				: ["host: 'fallback'", 'poll: true', "pollMode: 'trigger'", 'staticData: true']),
		];
		this.pollGuard = true;
		return {
			imports: ['schedule'],
			triggers,
			items: `await ctx.node({ ${fields.join(', ')} })`,
			native: true,
		};
	}

	private assemble(plan: ReturnType<typeof planTrigger>, wf: N8nWorkflow): Round {
		const w = this.w;
		const header: string[] = [];
		const title = wf.name ?? this.options.name;
		header.push('/**');
		if (title) header.push(` * ${title}`, ' *');
		header.push(
			' * Converted from an n8n workflow by `wfc convert`. Each step has the name of its',
			' * n8n node. Run the workflow with `wfc ref` or compile it with `wfc compile`.',
			' */',
		);
		const imports = [...new Set([...plan.imports, 'workflow'])].sort();
		header.push(`import { ${imports.join(', ')} } from '@n8n/workflow-lang';`, '');
		header.push(
			'/** Items of n8n nodes have no static shape. */',
			'// biome-ignore lint/suspicious/noExplicitAny: n8n items are untyped JSON.',
			'type Json = any;',
			'',
		);
		header.push('export default workflow({');
		header.push(
			plan.triggers.length === 1
				? `\ttriggers: [${plan.triggers[0]}],`
				: `\ttriggers: [\n${plan.triggers.map((t) => `\t\t${t},`).join('\n')}\n\t],`,
		);
		if (this.usedSlots.size > 0) {
			const creds: Code = {
				kind: 'object',
				entries: [...this.usedSlots.entries()]
					.sort((a, b) => a[0].localeCompare(b[0]))
					.map(([slot, type]): [string, Code] => [
						slot,
						{ kind: 'object', entries: [['type', raw(str(type))]] },
					]),
			};
			header.push(`\tcredentials: ${print(creds, '\t', 17)},`);
		}
		if (this.zones.size > 0) {
			header.push(
				`\tzones: [${[...this.zones]
					.sort()
					.map((z) => str(z))
					.join(', ')}],`,
			);
		}
		header.push('\tasync run(ctx, trigger) {');
		if (this.options.checkReady) {
			// As n8n before a manual run (`WorkflowExecute.checkReadyForExecution`): the host checks
			// the parameters of the trigger and the nodes after it, and fails with their issues.
			const check: Code = {
				kind: 'object',
				entries: [
					['name', raw(str(CHECK_STEP))],
					['type', raw(str('n8n-compiled.check'))],
					[
						'parameters',
						literal({
							nodes: wf.nodes,
							connections: wf.connections,
							startNode: this.options.trigger ?? null,
							pinDataNodeNames: this.options.pinnedNodes ?? [],
						}),
					],
					['items', raw('[{}]')],
					['host', raw(str('fallback'))],
				],
			};
			header.push(`\t\tawait ctx.node(${print(check, '\t\t', 32)});`, '');
		}
		if (this.usesNoItems) header.push('\t\tconst noItems: Json[] = [];', '');
		const footer = ['\t},', '});', ''];
		const traced = this.traceMode === 'all';
		if (traced) {
			// v1 run data has the node that failed, with its error: trace it, then fail the run.
			header.push(`\t\tlet ${CURRENT_NODE} = '';`, '\t\ttry {');
			footer.unshift(
				'\t\t} catch (error) {',
				`\t\t\tif (${CURRENT_NODE} !== '') ctx.trace(${CURRENT_NODE}, { $error: { message: error.message, description: error.description ?? '' } });`,
				'\t\t\tthrow error;',
				'\t\t}',
			);
		}
		const body = w.toString();
		if (body.includes('orNull(')) this.helpers.add('orNull');
		for (const h of LUXON_ENTRY_HELPERS) if (body.includes(`${h}(`)) this.helpers.add(h);
		const helpers = helperSources(this.helpers);
		if (helpers.length > 0) footer.push(helpers.join('\n\n'), '');
		const marked = `${header.join('\n')}\n${w.toString()}\n${footer.join('\n')}`;
		const offset = header.join('\n').split('\n').length + 1;
		const blocks = this.blocks.map((b) => ({
			node: b.node,
			from: b.from + offset,
			to: b.to + offset,
		}));

		// Take out the markers and keep the ranges of translated expressions. A marker character
		// without its pair (from code that the generator did not escape) stays as text.
		const ranges: Round['ranges'] = [];
		let source = '';
		const open: Array<{ id: number; start: number }> = [];
		for (let k = 0; k < marked.length; k++) {
			const ch = marked.charAt(k);
			const end = ch === '\u0001' ? marked.indexOf('\u0002', k) : -1;
			if (end > k) {
				open.push({ id: Number(marked.slice(k + 1, end)), start: source.length });
				k = end;
			} else if (ch === '\u0003' && open.length > 0) {
				const o = open.pop();
				const m = o ? this.marks[o.id] : undefined;
				if (o && m) ranges.push({ start: o.start, end: source.length, node: m.node, path: m.path });
			} else {
				source += ch;
			}
		}
		return {
			source,
			diagnostics: this.diagnostics,
			fallbackNodes: this.fallback,
			ranges,
			blocks,
			credentials: this.credentialRefs(),
		};
	}
}

/** `requiredInputs` of the v1 node description: `all` when every input must have items. */
function requiredInputs(node: N8nNode | undefined): 'all' | number | undefined {
	if (!node) return undefined;
	if (node.type === `${BASE}merge` && (node.typeVersion ?? 1) >= 2) {
		return node.parameters?.mode === 'chooseBranch' ? 'all' : 1;
	}
	if (node.type === `${BASE}compareDatasets`) return 1;
	return undefined;
}

/** Execute Workflow Trigger 1.2 and later return the items of all runs of the last node. */
function returnsAllRuns(trigger: N8nNode): boolean {
	if (trigger.type !== `${BASE}executeWorkflowTrigger`) return false;
	return (trigger.typeVersion ?? 1) >= 1.2 || trigger.parameters?.returnOutput === 'allRuns';
}

/** Triggers that n8n starts without an inbound event, by calling their `poll` function. */
function isPollingTriggerType(type: string): boolean {
	return (
		/Trigger$/.test(type) &&
		![
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.scheduleTrigger',
			'n8n-nodes-base.errorTrigger',
			'n8n-nodes-base.executeWorkflowTrigger',
			'n8n-nodes-base.formTrigger',
			'n8n-nodes-base.workflowTrigger',
			'n8n-nodes-base.n8nTrigger',
			'n8n-nodes-base.evaluationTrigger',
			'@n8n/n8n-nodes-langchain.chatTrigger',
			'@n8n/n8n-nodes-langchain.mcpTrigger',
		].includes(type)
	);
}
