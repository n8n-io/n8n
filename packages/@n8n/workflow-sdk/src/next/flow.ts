import { compileLambda, type LambdaRoot } from './lambda';
import type { IDataObject, WorkflowBuilder, WorkflowJSON } from '../types/base';
import { workflow as rootWorkflow } from '../workflow-builder';
import {
	node as rootNode,
	trigger as rootTrigger,
} from '../workflow-builder/node-builders/node-builder';

// ── Types the model reads ───────────────────────────────────────────────────

/** Item shape of a node whose output is unknown. Reads compile; their values are not checked. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- gradual typing: an unknown shape must never block a build
export type Loose = { [key: string]: any };

type TimeUnit = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';
type Duration = Partial<Record<`${TimeUnit}s`, number>>;

/** A Luxon DateTime, as n8n expressions expose it. */
export interface DateTime {
	toISO(): string;
	/** `2026-09-01` */
	toISODate(): string;
	/** Luxon tokens, e.g. `yyyy-MM-dd` */
	toFormat(format: string): string;
	toMillis(): number;
	plus(duration: Duration): DateTime;
	minus(duration: Duration): DateTime;
	startOf(unit: TimeUnit): DateTime;
	endOf(unit: TimeUnit): DateTime;
}

/** The second lambda parameter: earlier nodes by name, and n8n built-ins. */
export interface Dollar<Ctx> {
	/** The paired item of an earlier node on this path. */
	<K extends keyof Ctx & string>(name: K): Ctx[K];
	readonly now: DateTime;
	readonly today: DateTime;
	/** Parse an ISO 8601 string. */
	date(iso: string): DateTime;
	readonly execution: { readonly id: string };
	readonly workflow: { readonly id: string; readonly name: string };
	readonly vars: Readonly<Record<string, string>>;
}

/**
 * A fixed value, or a lambda that n8n evaluates for each item. A lambda compiles to an n8n
 * expression, so it may read only `item`, `$`, and JavaScript globals, never local variables.
 */
export type Value<Item, Ctx, V> = V | ((item: Item, $: Dollar<Ctx>) => V);

/** An item on an error output: the failed item's fields plus `error`. */
export type ErrorItem = Loose & { error: { message: string; description?: string | null } };

// ── Graph ───────────────────────────────────────────────────────────────────

/** Collects problems while a node compiles. Build problems are values, never exceptions. */
export interface Compiler {
	/** Compile lambdas anywhere inside `value` to n8n expressions. */
	value(value: unknown, root?: LambdaRoot): unknown;
	/** Compile one lambda to its JavaScript body, for embedding in a larger expression. */
	js(fn: unknown, root?: LambdaRoot): string;
	issue(message: string): void;
}

export interface NodeSpec {
	readonly name: string;
	readonly type: string;
	readonly version: number;
	readonly trigger?: boolean;
	readonly parameters: (compiler: Compiler) => Record<string, unknown>;
	readonly sample?: readonly unknown[];
	readonly onError?: 'continueErrorOutput';
	/** Main outputs before the error output. */
	readonly outputs?: number;
}

interface Edge {
	readonly from: string;
	readonly output: number;
	readonly to: string;
}

interface Tail {
	readonly node: string;
	readonly output: number;
}

interface Graph {
	readonly nodes: readonly NodeSpec[];
	readonly edges: readonly Edge[];
}

declare const phantom: unique symbol;

/** One node that reads `In` items and emits `Out` items. Pass it to `Flow.andThen`. */
export interface Step<In, Ctx, Out, N extends string> {
	readonly name: N;
	readonly spec: NodeSpec;
	readonly [phantom]?: { readonly read: (item: In, ctx: Ctx) => void; readonly emit: Out };
}

/** Keys both branches share, so `$("Node")` after a join names a node every path ran. */
type Common<A, B> = Pick<A, keyof A & keyof B>;

const isDataObject = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isLambda = (value: unknown): value is (...args: never[]) => unknown =>
	typeof value === 'function';

const edgeKey = (edge: Edge) => `${edge.from}\u0000${edge.output}\u0000${edge.to}`;

function unionGraphs(graphs: readonly Graph[]): Graph {
	const nodes = new Map<string, NodeSpec>();
	const edges = new Map<string, Edge>();
	for (const graph of graphs) {
		for (const spec of graph.nodes) {
			const known = nodes.get(spec.name);
			// A later spec of the same node carries settings such as onError.
			if (!known || known.type === spec.type) nodes.set(spec.name, { ...known, ...spec });
			else nodes.set(`${spec.name}\u0000duplicate`, spec);
		}
		for (const edge of graph.edges) edges.set(edgeKey(edge), edge);
	}
	return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

const attach = (graph: Graph, tails: readonly Tail[], spec: NodeSpec): Graph =>
	unionGraphs([
		graph,
		{
			nodes: [spec],
			edges: tails.map((tail) => ({ from: tail.node, output: tail.output, to: spec.name })),
		},
	]);

/**
 * An immutable graph fragment. `Item` is the item type at its open ends, and `Ctx` maps each
 * node name on every path to its item type, for `$("Node")` in lambdas.
 */
export class Flow<Item, Ctx> {
	declare readonly [phantom]?: { readonly item: Item; readonly ctx: Ctx };

	/** @internal Use a trigger such as `manual()` to start a flow. */
	constructor(
		readonly graph: Graph,
		readonly tails: readonly Tail[],
	) {}

	/** Run `step` on every item at the open ends. */
	andThen<Out, N extends string>(step: Step<Item, Ctx, Out, N>): Flow<Out, Ctx & Record<N, Out>> {
		return new Flow(attach(this.graph, this.tails, step.spec), [{ node: step.name, output: 0 }]);
	}

	/**
	 * Route each item by a condition (an IF node). Items where `if` is true go to `then`, the
	 * rest to `else`. Without `else`, false items stop. The open ends of both branches continue.
	 */
	branch<const N extends string, A, CA, B = never, CB = CA>(config: {
		name: N;
		if: (item: Item, $: Dollar<Ctx>) => boolean;
		then: (flow: Flow<Item, Ctx & Record<N, Item>>) => Flow<A, CA>;
		else?: (flow: Flow<Item, Ctx & Record<N, Item>>) => Flow<B, CB>;
	}): Flow<A | B, Common<CA, CB>> {
		const condition = config.if;
		const spec: NodeSpec = {
			name: config.name,
			type: 'n8n-nodes-base.if',
			version: 2.2,
			outputs: 2,
			parameters: (compiler) => ({
				conditions: {
					options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
					conditions: [
						{
							id: 'condition-0',
							leftValue: `={{ ${compiler.js(condition)} }}`,
							rightValue: '',
							operator: { type: 'boolean', operation: 'true', singleValue: true },
						},
					],
					combinator: 'and',
				},
				options: {},
			}),
		};
		const graph = attach(this.graph, this.tails, spec);
		const onTrue = config.then(new Flow(graph, [{ node: config.name, output: 0 }]));
		const onFalse = config.else?.(new Flow(graph, [{ node: config.name, output: 1 }]));
		return new Flow(unionGraphs([onTrue.graph, ...(onFalse ? [onFalse.graph] : [])]), [
			...onTrue.tails,
			...(onFalse?.tails ?? []),
		]);
	}

	/**
	 * Handle items the last node fails on (its error output). The node continues with the
	 * items it could process; the open ends of `handle` continue too.
	 */
	orElse<A, CA>(handle: (flow: Flow<ErrorItem, Ctx>) => Flow<A, CA>): Flow<Item | A, Ctx> {
		const failing = new Set(this.tails.map((tail) => tail.node));
		const nodes = this.graph.nodes.map((spec) =>
			failing.has(spec.name) ? { ...spec, onError: 'continueErrorOutput' as const } : spec,
		);
		const errorTails = nodes
			.filter((spec) => failing.has(spec.name))
			.map((spec) => ({ node: spec.name, output: spec.outputs ?? 1 }));
		const handled = handle(new Flow({ nodes, edges: this.graph.edges }, errorTails));
		return new Flow(unionGraphs([{ nodes, edges: this.graph.edges }, handled.graph]), [
			...this.tails,
			...handled.tails,
		]);
	}
}

/**
 * Per-node output types. The build derives them from each node's parameters and live schema
 * (Sheet columns, Notion properties) and adds them by declaration merging.
 */
export interface NodeOutputs {}

/** The derived output of node `N` when the build knows it, else the action's default output. */
export type OutputOf<N extends string, Default> = N extends keyof NodeOutputs
	? NodeOutputs[N]
	: Default;

/**
 * A node from an action contract. Generated node modules call this; the build compiles the
 * contract parameters to the underlying node type, version, and parameters.
 */
export function contractStep<In, Ctx, Out, N extends string>(
	id: string,
	// The generated module types `sample`; `Out` comes from its declared return type.
	config: { readonly name: N; readonly sample?: readonly unknown[] },
): Step<In, Ctx, Out, N> {
	const { name, sample, ...parameters } = config;
	return {
		name,
		spec: {
			name,
			type: id,
			version: 1,
			sample,
			parameters: (compiler) => {
				const compiled = compiler.value(parameters);
				return isDataObject(compiled) ? compiled : {};
			},
		},
	};
}

/** Start a flow at a trigger node. */
export function startFlow<Item, const N extends string>(
	spec: NodeSpec & { name: N },
): Flow<Item, Record<N, Item>> {
	return new Flow({ nodes: [{ ...spec, trigger: true }], edges: [] }, [
		{ node: spec.name, output: 0 },
	]);
}

// ── Build ───────────────────────────────────────────────────────────────────

function createCompiler(nodeName: string, nodeNames: ReadonlySet<string>, issues: string[]) {
	const lambda = (fn: (...args: never[]) => unknown, root: LambdaRoot) => {
		const result = compileLambda(fn, nodeNames, root);
		if (!result.ok) issues.push(`${nodeName}: ${result.error}`);
		return result;
	};
	const compiler: Compiler = {
		value: (value, root = '$json') => {
			if (isLambda(value)) {
				const result = lambda(value, root);
				return result.ok ? result.expression : '';
			}
			if (Array.isArray(value)) return value.map((entry) => compiler.value(entry, root));
			if (isDataObject(value)) {
				return Object.fromEntries(
					Object.entries(value).map(([key, entry]) => [key, compiler.value(entry, root)]),
				);
			}
			return value;
		},
		js: (fn, root = '$json') => {
			if (!isLambda(fn)) return JSON.stringify(fn);
			const result = lambda(fn, root);
			return result.ok ? result.js : 'undefined';
		},
		issue: (message) => issues.push(`${nodeName}: ${message}`),
	};
	return compiler;
}

/** The value `export default` gives the build: validate, serialize, and generate pin data. */
export interface Workflow {
	validate(): ReturnType<WorkflowBuilder['validate']>;
	toJSON(options?: { tidyUp?: boolean }): WorkflowJSON;
	generatePinData(): { toJSON(options?: { tidyUp?: boolean }): WorkflowJSON };
}

function failedWorkflow(issues: readonly string[]): Workflow {
	const fail = (): never => {
		throw new Error(`Workflow has ${issues.length} problem(s):\n- ${issues.join('\n- ')}`);
	};
	return { validate: fail, toJSON: fail, generatePinData: fail };
}

/** Combine flows (one per trigger) into the workflow to save. */
export function workflow(name: string, ...flows: ReadonlyArray<Flow<unknown, unknown>>): Workflow {
	const graph = unionGraphs(flows.map((flow) => flow.graph));
	const nodeNames = new Set(graph.nodes.map((spec) => spec.name));
	const issues: string[] = graph.nodes
		.filter((spec) => spec.name.endsWith('\u0000duplicate'))
		.map((spec) => `Two different nodes are named "${spec.name.split('\u0000')[0]}"`);

	const instances = new Map(
		graph.nodes.map((spec) => {
			const compiler = createCompiler(spec.name, nodeNames, issues);
			const config = {
				name: spec.name,
				parameters: spec.parameters(compiler),
				...(spec.onError ? { onError: spec.onError } : {}),
			};
			const input = {
				type: spec.type,
				version: spec.version,
				config,
				...(spec.sample ? { output: spec.sample.filter(isDataObject) } : {}),
			};
			return [spec.name, spec.trigger ? rootTrigger(input) : rootNode(input)] as const;
		}),
	);
	if (issues.length > 0) return failedWorkflow(issues);

	const withNodes = [...instances.values()].reduce(
		(builder, instance) => builder.add(instance),
		rootWorkflow(name, name),
	);
	return graph.edges.reduce((builder, edge) => {
		const from = instances.get(edge.from);
		const to = instances.get(edge.to);
		return from && to ? builder.connect(from, edge.output, to, 0) : builder;
	}, withNodes);
}
