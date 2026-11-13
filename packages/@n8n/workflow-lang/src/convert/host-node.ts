/**
 * Nodes that run whole in the fallback host, with all their inputs and outputs:
 * - core nodes whose v1 behaviour the converter does not compile (If, Switch
 *   and Filter with regex or date conditions, Merge modes, Compare Datasets),
 * - AI cluster nodes: a root node (agent, chain, vector store) with its
 *   sub-nodes (`ai_*` connections), and every other LangChain node.
 *
 * Parameters. n8n evaluates the expressions in the host, as in v1, when the
 * host has the data that they read (`hostSafety` is not `none`): `$json`,
 * `$fromAI(...)`, built-in functions. The generated code evaluates only the
 * expressions that read other nodes or the execution, before the call. When
 * such an expression reads the item, the node runs once for each item.
 *
 * The step has the options `inputs` (one list for each input),
 * `outputs: 'all'` (one `{ items }` result for each output) and `subNodes`.
 */
import type { Code } from './code.ts';
import { literal, raw, str } from './code.ts';
import type { NodeContext } from './context.ts';
import type { TranslatedValue } from './expression.ts';
import { INDEX, ITEM } from './expression.ts';
import {
	checkOneResult,
	checkRawFailures,
	emitCall,
	hostParameters,
	settingsField,
} from './steps.ts';
import { resolveCallee } from './subworkflow.ts';
import type { N8nNode, N8nWorkflow } from './types.ts';
import { isRecord } from './types.ts';

export const LANGCHAIN_PREFIX = '@n8n/n8n-nodes-langchain.';

export { hostParameters } from './steps.ts';

// ---- Workflow tools ------------------------------------------------------------

/** Sub-nodes that call a workflow (`executeWorkflow` of n8n's additional data). */
const WORKFLOW_TOOLS = new Set([
	`${LANGCHAIN_PREFIX}toolWorkflow`,
	`${LANGCHAIN_PREFIX}retrieverWorkflow`,
]);

/** `={{ $workflow.id }}`: the tool calls the workflow that holds it. */
const SELF_ID = /^=\s*\{\{\s*\$workflow\.id\s*\}\}\s*$/;

/**
 * The workflow that a workflow tool calls, or undefined when the converter
 * does not know it (the host then fails when the tool runs).
 */
export function toolCallee(
	wf: N8nWorkflow,
	tool: N8nNode,
	resolve: ((id: string) => unknown) | undefined,
): N8nWorkflow | undefined {
	if (!WORKFLOW_TOOLS.has(tool.type)) return undefined;
	const p = tool.parameters ?? {};
	if ((p.source ?? 'database') === 'parameter') return undefined;
	const ref = isRecord(p.workflowId) ? p.workflowId.value : p.workflowId;
	if (typeof ref === 'string' && SELF_ID.test(ref)) return wf;
	const callee = resolveCallee(tool, resolve);
	if (callee.kind !== 'function') return undefined;
	return isWorkflowJson(callee.workflow) ? callee.workflow : undefined;
}

function isWorkflowJson(value: unknown): value is N8nWorkflow {
	return isRecord(value) && Array.isArray(value.nodes) && isRecord(value.connections);
}

/** The nodes of the callees of the workflow tools of a workflow, for their credential slots. */
export function toolCalleeNodes(
	wf: N8nWorkflow,
	resolve: ((id: string) => unknown) | undefined,
): N8nNode[] {
	const out: N8nNode[] = [];
	for (const node of wf.nodes) {
		const callee = toolCallee(wf, node, resolve);
		if (callee && callee !== wf) out.push(...callee.nodes);
	}
	return out;
}

/**
 * Embeds the callee of a workflow tool in its parameters (`source:
 * 'parameter'`), so the host runs it with n8n's v1 engine. The credentials of
 * the callee nodes name credential slots; the slots are returned too.
 */
function embedCallee(
	c: NodeContext,
	tool: N8nNode,
): { parameters: Record<string, unknown>; slots: string[] } | undefined {
	const callee = toolCallee(c.workflow, tool, c.resolveWorkflow);
	if (!callee) return undefined;
	const slots: string[] = [];
	const nodes = callee.nodes.map((n) => {
		if (!n.credentials) return n;
		const credentials: Record<string, { id: string; name: string }> = {};
		for (const type of Object.keys(n.credentials)) {
			const slot = c.credential(type, n);
			if (slot === undefined) continue;
			credentials[type] = { id: slot, name: slot };
			if (!slots.includes(slot)) slots.push(slot);
		}
		return { ...n, credentials };
	});
	const { workflowId: _id, ...rest } = tool.parameters ?? {};
	const json = { ...callee, nodes };
	return {
		parameters: { ...rest, source: 'parameter', workflowJson: JSON.stringify(json) },
		slots,
	};
}

/** A sub-node of a cluster, with the node that gets its data. */
export interface ClusterMember {
	node: N8nNode;
	connection: string;
	target: string;
	targetIndex: number;
}

/**
 * The sub-nodes of `root`: the nodes that reach it through `ai_*` connections,
 * also through other sub-nodes (a vector store under a retriever). Disabled
 * sub-nodes are left out, as v1 leaves them out.
 */
export function clusterMembers(wf: N8nWorkflow, root: string): ClusterMember[] {
	const byName = new Map(wf.nodes.map((n) => [n.name, n]));
	const members: ClusterMember[] = [];
	const seen = new Set<string>([root]);
	const queue = [root];
	while (queue.length > 0) {
		const target = queue.shift() ?? '';
		for (const [from, types] of Object.entries(wf.connections ?? {})) {
			for (const [type, outputs] of Object.entries(types ?? {})) {
				if (type === 'main') continue;
				for (const list of outputs ?? []) {
					for (const conn of list ?? []) {
						if (conn?.node !== target) continue;
						const node = byName.get(from);
						if (!node || node.disabled) continue;
						members.push({
							node,
							connection: typeof conn.type === 'string' ? conn.type : type,
							target,
							targetIndex: Number(conn.index) || 0,
						});
						if (!seen.has(from)) {
							seen.add(from);
							queue.push(from);
						}
					}
				}
			}
		}
	}
	return members;
}

/** True when the node has sub-nodes (`ai_*` connections; v1 ignores other keys). */
export function isClusterRoot(wf: N8nWorkflow, name: string): boolean {
	return Object.values(wf.connections ?? {}).some((types) =>
		Object.entries(types ?? {}).some(
			([type, outputs]) =>
				type.startsWith('ai_') &&
				(outputs ?? []).some((l) => (l ?? []).some((x) => x?.node === name)),
		),
	);
}

export interface HostCall {
	fields: Array<[string, Code]>;
	perItem: boolean;
	usesIndex: boolean;
	/**
	 * An AI cluster: the host also gives the runs of the sub-nodes (`subRuns`), which
	 * the source traces as v1 records them (a tool that the model called, a model, a memory).
	 */
	subRuns?: boolean;
}

/**
 * Emits a host call that keeps all inputs and outputs of the node.
 * `mainCount` is the number of main outputs of the node, when the converter
 * knows it. Under `continueErrorOutput` the error output comes after them.
 */
export function emitHostCall(c: NodeContext, call: HostCall, mainCount: number): void {
	const { w } = c;
	const onError =
		c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
	const inputs = c.inputs.length > 0 ? c.inputs : [c.input];
	const connected = connectedOutputs(c);
	const errorIndex = onError === 'continueErrorOutput' ? Math.max(mainCount, connected - 1) : -1;
	const dataCount = errorIndex >= 0 ? errorIndex : Math.max(mainCount, connected);
	const outs = Array.from({ length: errorIndex >= 0 ? errorIndex + 1 : dataCount }, (_, k) =>
		c.output(k, k === errorIndex ? 'Errors' : k === 0 ? undefined : `Output${k}`),
	);
	for (const o of outs) w.line(`const ${o}: Json[] = [];`);
	// A failure of the whole node under "continue on fail": v1 passes the input on and records
	// the error on the node. The host gives that error after the outputs (`reportError`).
	const reportError =
		c.traceAll === true &&
		(onError === 'continueRegularOutput' || onError === 'continueErrorOutput') &&
		call.subRuns !== true;
	// Under `continueErrorOutput` the host gives the error output too, as the last output.
	const allOutputs = dataCount > 1 || call.subRuns === true || errorIndex >= 0 || reportError;

	const fields: Array<[string, Code]> = [['name', raw(str(c.node.name))], ...call.fields];
	if (allOutputs) fields.push(['outputs', raw(str('all'))]);
	if (call.subRuns) fields.push(['subRuns', raw('true')]);
	if (reportError) fields.push(['reportError', raw('true')]);
	// The node handles `continueRegularOutput` itself, for each item, as in v1
	// (`this.continueOnFail()`); the catch below is for failures of the host.
	if (
		(onError === 'continueRegularOutput' || onError === 'continueErrorOutput') &&
		!fields.some(([k]) => k === 'onError')
	) {
		fields.push(['onError', raw(str(onError))]);
	}
	const itemsFor = (first: string): Array<[string, Code]> =>
		inputs.length > 1
			? [['inputs', raw(`[${[first, ...inputs.slice(1)].join(', ')}]`)]]
			: [['items', raw(first)]];

	const guard = inputs.map((i) => `${i}.length > 0`).join(' || ');
	if (call.perItem) {
		if (call.usesIndex) {
			w.open(`for (let ${INDEX} = 0; ${INDEX} < ${c.input}.length; ${INDEX}++) {`);
			w.line(`const ${ITEM} = ${c.input}[${INDEX}];`);
		} else {
			w.open(`for (const ${ITEM} of ${c.input}) {`);
		}
	} else {
		w.open(`if (${guard}) {`);
	}
	const opts: Code = {
		kind: 'object',
		entries: [
			...fields,
			...itemsFor(call.perItem ? `[${ITEM}]` : inputs.length > 1 ? inputs[0] : c.input),
		],
	};
	const failed = call.perItem ? `[${ITEM}]` : c.input;
	if (onError !== 'stopWorkflow') w.open('try {');
	emitCall(
		c,
		'result',
		'let result: Json[]',
		'ctx.node',
		opts,
		allOutputs ? 'result[0]?.items?.[0]' : 'result[0]',
	);
	if (allOutputs) {
		for (let k = 0; k < dataCount; k++) {
			w.line(`for (const r of result[${k}]?.items ?? []) ${outs[k]}.push(r);`);
		}
		if (errorIndex >= 0) {
			// The error output is the last output; `{ subRuns }` or `{ nodeError }` comes after it.
			// After a failure of the whole node the host gives only the input on output 0.
			if (call.subRuns || reportError) {
				w.line(
					`if (result.length > 2) for (const r of result[result.length - 2]?.items ?? []) ${outs[errorIndex]}.push(r);`,
				);
			} else {
				w.line(
					`for (const r of result[result.length - 1]?.items ?? []) ${outs[errorIndex]}.push(r);`,
				);
			}
		}
		if (reportError) {
			w.line('const last: Json = result[result.length - 1] ?? {};');
			w.line(
				`if (typeof last.nodeError === 'string') ctx.trace(${str(c.node.name)}, { $error: { message: last.nodeError, description: '' } });`,
			);
		}
		if (call.subRuns) {
			// The last entry has the runs of the sub-nodes: `{ subRuns: { name: [{ error }] } }`.
			w.line('const last: Json = result[result.length - 1] ?? {};');
			w.line('const subRuns: Json = last.subRuns ?? {};');
			w.line('for (const sub of Object.keys(subRuns)) ctx.trace(sub, { $subRuns: subRuns[sub] });');
			// The host gives the error of a cluster that failed after the runs of its sub-nodes.
			w.line("if (typeof last.error === 'string') throw new Error(last.error);");
		}
	} else {
		w.line(`for (const r of result) ${outs[0]}.push(r);`);
	}
	if (onError !== 'stopWorkflow') {
		w.close('} catch (error) {');
		w.depth++;
		if (errorIndex >= 0) {
			// A failure of the whole node: v1 passes the input on output 0 and records the error
			// on the run (`handleNodeExecutionError`), also under "continue (using error output)".
			w.line(`for (const e of ${failed}) ${outs[0]}.push(e);`);
		} else {
			w.line(`for (const e of ${failed}) ${outs[0]}.push({ error: error.message });`);
		}
		w.close();
	}
	w.close();
}

/** One more than the highest main output with a connection. */
function connectedOutputs(c: NodeContext): number {
	let count = 0;
	for (let k = 0; k < 64; k++) if (c.connected(k)) count = k + 1;
	return count;
}

function baseFields(c: NodeContext, parameters: TranslatedValue): Array<[string, Code]> {
	const fields: Array<[string, Code]> = [
		['type', raw(str(c.node.type))],
		['typeVersion', literal(c.version)],
		['parameters', parameters.code],
	];
	const credential = c.credential();
	if (credential !== undefined) fields.push(['credential', raw(str(credential))]);
	const retry = c.retry();
	if (retry) fields.push(['retry', retry]);
	fields.push(...settingsField(c));
	return fields;
}

/**
 * Runs a node whole in the fallback host, with all its inputs and outputs.
 * `mainCount` is the number of main outputs of the node, when it is known.
 */
export function lowerHostNode(
	c: NodeContext,
	mainCount = 1,
	extra: Array<[string, Code]> = [],
): void {
	const parameters = hostParameters(c, c.parameters, '');
	const perItem = parameters.usage.item || parameters.usage.index;
	checkOneResult(c, perItem);
	checkRawFailures(c, parameters.failures, perItem);
	if (parameters.usage.approximate) {
		c.warn('paired-item', 'An expression pairs items of another node by position.');
	}
	c.markFallback();
	emitHostCall(
		c,
		{
			fields: [...baseFields(c, parameters), ...extra],
			perItem,
			usesIndex: parameters.usage.index,
		},
		mainCount,
	);
}

/**
 * Runs an AI cluster in the fallback host: the root node with the parameters
 * and credential slots of its sub-nodes. The host gives each sub-node to the
 * root through `supplyData`, as n8n's engine does.
 */
export function lowerCluster(c: NodeContext, members: ClusterMember[], runData?: Code): void {
	// With run data, n8n evaluates every expression in the host (run-data.ts).
	const params = (value: unknown, path: string) =>
		runData
			? {
					code: literal(value),
					usage: { item: false, index: false, approximate: false, nodes: new Set<string>() },
					failures: [],
				}
			: hostParameters(c, value, path);
	const root = params(c.parameters, '');
	const usage = { ...root.usage };
	const failures = [...root.failures];
	const subNodes: Code[] = members.map((m) => {
		const embedded = embedCallee(c, m.node);
		if (embedded) {
			c.info(
				'workflow-tool',
				`The workflow tool "${m.node.name}" runs its callee on n8n's v1 engine in the fallback host.`,
			);
		}
		const p = params(embedded?.parameters ?? m.node.parameters ?? {}, `${m.node.name}.parameters`);
		usage.item ||= p.usage.item;
		usage.index ||= p.usage.index;
		usage.approximate ||= p.usage.approximate;
		failures.push(...p.failures);
		const entries: Array<[string, Code]> = [
			['name', raw(str(m.node.name))],
			['type', raw(str(m.node.type))],
			['typeVersion', literal(m.node.typeVersion ?? 1)],
			['parameters', p.code],
		];
		const slot = c.credentialOf(m.node);
		if (slot !== undefined) entries.push(['credential', raw(str(slot))]);
		entries.push(['connection', raw(str(m.connection))], ['target', raw(str(m.target))]);
		if (m.targetIndex !== 0) entries.push(['targetIndex', literal(m.targetIndex)]);
		if (embedded && embedded.slots.length > 0) {
			entries.push(['slots', { kind: 'array', items: embedded.slots.map((x) => raw(str(x))) }]);
		}
		return { kind: 'object', entries };
	});
	const perItem = usage.item || usage.index;
	checkRawFailures(c, failures, perItem);
	if (usage.approximate)
		c.warn('paired-item', 'An expression pairs items of another node by position.');
	c.markFallback();
	const fields = baseFields(c, root);
	if (subNodes.length > 0) fields.push(['subNodes', { kind: 'array', items: subNodes }]);
	if (runData) fields.push(['runData', runData]);
	emitHostCall(
		c,
		{
			fields,
			perItem,
			usesIndex: usage.index,
			subRuns: subNodes.length > 0 && c.traceAll === true,
		},
		wholeNodeOutputs(c.node) ?? 1,
	);
}

/** Any LangChain node: a cluster root with its sub-nodes, or a node without sub-nodes. */
export function lowerAiNode(c: NodeContext): void {
	lowerCluster(c, clusterMembers(c.workflow, c.node.name));
}

const BASE = 'n8n-nodes-base.';

/**
 * The number of main outputs of a core node that can run whole in the host
 * when its lowering fails, or undefined for other nodes.
 */
export function wholeNodeOutputs(node: N8nNode): number | undefined {
	const p = node.parameters ?? {};
	switch (node.type) {
		case `${BASE}if`:
			return 2;
		case `${BASE}switch`: {
			const version = node.typeVersion ?? 1;
			if (p.mode === 'expression') {
				const count = version >= 3 ? p.numberOutputs : p.outputsAmount;
				return typeof count === 'number' ? count : 4;
			}
			if (version < 3) {
				const rules = isRecord(p.rules) && Array.isArray(p.rules.rules) ? p.rules.rules : [];
				return version >= 2 ? Math.max(rules.length, 1) : 4;
			}
			const rules = isRecord(p.rules) && Array.isArray(p.rules.values) ? p.rules.values : [];
			const options = isRecord(p.options) ? p.options : {};
			return rules.length + (options.fallbackOutput === 'extra' ? 1 : 0);
		}
		case `${BASE}filter`:
			// v1 gives the items that the conditions drop on a second list.
			return 2;
		case `${BASE}removeDuplicates`:
			// From version 2, v1 gives the items seen in earlier executions on a second list.
			return (node.typeVersion ?? 1) >= 2 && p.operation === 'removeItemsSeenInPreviousExecutions'
				? 2
				: 1;
		case `${BASE}merge`:
		case `${BASE}set`:
		case `${BASE}limit`:
		case `${BASE}sort`:
		case `${BASE}splitOut`:
		case `${BASE}aggregate`:
		case `${BASE}noOp`:
		case `${BASE}compareDatasets`:
			return node.type === `${BASE}compareDatasets` ? 4 : 1;
		case `${LANGCHAIN_PREFIX}textClassifier`: {
			// One output for each category, and "Other" with the fallback `other`.
			const list =
				isRecord(p.categories) && Array.isArray(p.categories.categories)
					? p.categories.categories
					: [];
			const options = isRecord(p.options) ? p.options : {};
			return list.length + (options.fallback === 'other' ? 1 : 0);
		}
		case `${LANGCHAIN_PREFIX}sentimentAnalysis`: {
			// One output for each category of the comma-separated list.
			const options = isRecord(p.options) ? p.options : {};
			const text =
				typeof options.categories === 'string' ? options.categories : 'Positive, Neutral, Negative';
			return text.split(',').length;
		}
		default:
			return undefined;
	}
}
