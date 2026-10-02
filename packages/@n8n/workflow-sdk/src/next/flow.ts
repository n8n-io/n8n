import { compileLambda, type LambdaRoot } from './lambda';
import {
	CHECK_AGAIN,
	CHECK_DONE,
	CHECK_LIMIT,
	FALLBACK_OUTPUT,
	FILTER_NODE,
	filterParameters,
	LOOP_DONE,
	LOOP_EACH,
	LOOP_NODE,
	LOOP_STATE_NODE,
	mergeNodeOf,
	STOP_NODE,
	SWITCH_NODE,
	WAIT_NODE,
	caseRouter,
	forEachParameters,
	loopCheckParameters,
	loopHeadParameters,
	loopLimitParameters,
	loopNextParameters,
	loopNodeNames,
	mergeParameters,
	noNextPage,
	samePass,
	waitParameters,
	type Interval,
	type MergeJoin,
} from './regions';
import type {
	IDataObject,
	NodeInput,
	SubnodeConfig,
	WorkflowBuilder,
	WorkflowJSON,
} from '../types/base';
import { workflow as rootWorkflow } from '../workflow-builder';
import {
	node as rootNode,
	trigger as rootTrigger,
} from '../workflow-builder/node-builders/node-builder';
import {
	documentLoader,
	embedding,
	languageModel,
	memory,
	outputParser,
	reranker,
	retriever,
	textSplitter,
	tool,
	vectorStore,
} from '../workflow-builder/node-builders/subnode-builders';
import { registerDefaultPlugins } from '../workflow-builder/plugins/defaults';
import { PluginRegistry } from '../workflow-builder/plugins/registry';
import { loopWiringValidator } from '../workflow-builder/plugins/validators/loop-wiring-validator';

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
 * A file on an item, as `item.binary.<name>` reads it. The bytes stay in the n8n binary data
 * store. Pass it to a binary field of a node: `file: (item) => item.binary.data`.
 */
export interface Binary {
	readonly mimeType: string;
	readonly fileName?: string;
	readonly fileExtension?: string;
	/** For people, e.g. `1.2 MB`. */
	readonly fileSize?: string;
	/** The size in bytes. */
	readonly bytes?: number;
}

/**
 * An n8n expression, e.g. `={{ $json.id }}` or `=Hi {{ $json.name }}`. The build checks it as it
 * checks a lambda: against the item of the node before, earlier nodes, and the field type.
 */
export type Expression = `=${string}`;

/**
 * A fixed value, a lambda that n8n evaluates for each item, or an expression string. A lambda
 * compiles to an n8n expression, so it may read only `item`, `$`, and JavaScript globals, never
 * local variables.
 */
export type Value<Item, Ctx, V> = V | ((item: Item, $: Dollar<Ctx>) => V) | Expression;

/** One response of a paged request, as `$response` of the legacy HTTP Request pagination. */
export interface ResponsePage {
	/** The parsed JSON body. Its shape is not known, so reads compile. */
	readonly body: Loose;
	/** Lower-case names, e.g. `link`. */
	readonly headers: Readonly<Record<string, string>>;
	readonly statusCode: number;
}

/**
 * A value the node reads from each response page, e.g. `(page) => page.body.next_cursor`. The
 * lambda compiles to an expression over `$response`. It reads fields, list items, `.at(n)`,
 * `.first()` and `.last()`, nothing else.
 */
export type PageValue<V> = ((page: ResponsePage) => V) | Expression;

/**
 * Any value in an open object, as `unknown` accepts. Unlike `unknown`, it gives a lambda in
 * its place typed parameters.
 */
export type OpenValue = {} | null | undefined;

/** An item on an error output: the failed item's fields plus `error`. */
export type ErrorItem = Loose & { error: { message: string; description?: string | null } };

type Primitive = string | number | boolean | null;

/**
 * A JSON Schema that a workflow declares for data it receives, e.g. the body of a webhook. A
 * field not in `required` is optional. An object with `properties` has only those fields,
 * unless `additionalProperties` is `true`.
 */
export interface ValueSchema {
	readonly type?: 'string' | 'number' | 'integer' | 'boolean' | 'null' | 'array' | 'object';
	readonly enum?: readonly Primitive[];
	readonly const?: Primitive;
	readonly properties?: { readonly [key: string]: ValueSchema };
	readonly required?: readonly string[];
	readonly additionalProperties?: boolean;
	readonly items?: ValueSchema;
	readonly description?: string;
	readonly format?: string;
	readonly examples?: readonly unknown[];
}

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type ObjectFromSchema<S extends ValueSchema> = S extends {
	readonly properties: infer P extends { readonly [key: string]: ValueSchema };
}
	? Simplify<
			{
				-readonly [K in keyof P as K extends RequiredOf<S> ? K : never]: FromSchema<P[K]>;
			} & {
				-readonly [K in keyof P as K extends RequiredOf<S> ? never : K]?: FromSchema<P[K]>;
			} & (S extends { readonly additionalProperties: true } ? Loose : unknown)
		>
	: Loose;

type RequiredOf<S> = S extends { readonly required: ReadonlyArray<infer R> } ? R : never;

/** The TypeScript type of the values a `ValueSchema` allows. */
export type FromSchema<S> = S extends { readonly const: infer C }
	? C
	: S extends { readonly enum: ReadonlyArray<infer E> }
		? E
		: S extends { readonly type: 'string' }
			? string
			: S extends { readonly type: 'number' | 'integer' }
				? number
				: S extends { readonly type: 'boolean' }
					? boolean
					: S extends { readonly type: 'null' }
						? null
						: S extends { readonly type: 'array' }
							? Array<S extends { readonly items: infer I } ? FromSchema<I> : unknown>
							: S extends ValueSchema
								? ObjectFromSchema<S>
								: Loose;

/** Output `O` with each field that `S` declares typed by its schema. */
export type Declared<O, S> = Simplify<
	Omit<O, keyof S> & { -readonly [K in keyof S]-?: FromSchema<NonNullable<S[K]>> }
>;

/** `T` with every field optional at any depth. A trigger sample gives only the fields it needs. */
export type DeepPartial<T> = T extends ReadonlyArray<infer E>
	? Array<DeepPartial<E>>
	: T extends object
		? { [K in keyof T]?: DeepPartial<T[K]> }
		: T;

type AllKeys<T> = T extends unknown ? keyof T : never;

type ValueAt<T, K> = T extends unknown ? (K extends keyof T ? T[K] : never) : never;

/** `T` with each key that `Shape` does not have, at any depth, typed `never`, so tsc names it. */
export type Exact<T, Shape> = unknown extends Shape
	? T
	: T extends readonly unknown[]
		? { [I in keyof T]: Exact<T[I], NonNullable<Shape> extends ReadonlyArray<infer E> ? E : never> }
		: T extends object
			? {
					[K in keyof T]: K extends AllKeys<NonNullable<Shape>>
						? Exact<T[K], ValueAt<NonNullable<Shape>, K>>
						: never;
				}
			: T;

type At<T, P extends readonly string[]> = P extends readonly [
	infer H extends string,
	...infer R extends string[],
]
	? T extends { readonly [K in H]?: infer V }
		? At<NonNullable<V>, R>
		: never
	: T;

type EntryKey<E, Keys extends readonly string[]> = Keys extends readonly [
	infer K extends string,
	...infer R extends string[],
]
	? E extends { readonly [P in K]: infer V extends string }
		? V
		: EntryKey<E, R>
	: never;

/**
 * One field per entry of the list at path `List` of the config `C`, e.g. per form field. The
 * first entry field in `Keys` names it; the entry field `TypeField` picks its type in `Types`.
 * It is `null` unless the entry field `Required` is `true`.
 */
export type EntryFields<
	C,
	List extends readonly string[],
	Keys extends readonly string[],
	TypeField extends string,
	Types,
	Fallback,
	Required extends string = never,
> = At<C, List> extends ReadonlyArray<infer E>
	? Simplify<{
			-readonly [X in E as EntryKey<X, Keys>]:
				| (X extends { readonly [P in TypeField]: infer T }
						? T extends keyof Types
							? Types[T]
							: Fallback
						: Fallback)
				| (X extends { readonly [P in Required]: true } ? never : null);
		}>
	: unknown;

/** One value that `schema` allows, for a trigger sample. */
function exampleOfSchema(schema: ValueSchema): unknown {
	if (schema.const !== undefined) return schema.const;
	if (schema.examples?.length) return schema.examples[0];
	if (schema.enum?.length) return schema.enum[0];
	switch (schema.type) {
		case 'string':
			return 'example';
		case 'number':
		case 'integer':
			return 1;
		case 'boolean':
			return true;
		case 'null':
			return null;
		case 'array':
			return schema.items ? [exampleOfSchema(schema.items)] : [];
		default:
			return Object.fromEntries(
				Object.entries(schema.properties ?? {}).map(([key, child]) => [
					key,
					exampleOfSchema(child),
				]),
			);
	}
}

// ── Graph ───────────────────────────────────────────────────────────────────

/** Collects problems while a node compiles. Build problems are values, never exceptions. */
export interface Compiler {
	/** Compile lambdas anywhere inside `value` to n8n expressions. */
	value(value: unknown, root?: LambdaRoot): unknown;
	/** Compile one lambda to its JavaScript body, for embedding in a larger expression. */
	js(fn: unknown, root?: LambdaRoot): string;
	issue(message: string): void;
}

/** Each sub-node slot of an AI node and the connection type it maps to, in input order. */
export const SUBNODE_SLOTS = [
	['model', 'ai_languageModel'],
	['memory', 'ai_memory'],
	['tools', 'ai_tool'],
	['outputParser', 'ai_outputParser'],
	['embedding', 'ai_embedding'],
	['vectorStore', 'ai_vectorStore'],
	['retriever', 'ai_retriever'],
	['documentLoader', 'ai_document'],
	['textSplitter', 'ai_textSplitter'],
	['reranker', 'ai_reranker'],
] as const;

export type SubnodeSlot = (typeof SUBNODE_SLOTS)[number][0];

/**
 * The settings of an n8n node, outside its parameters. `Flow.orElse` sets the error output
 * (`onError: 'continueErrorOutput'`).
 */
export interface NodeSettings {
	/** Run the node again when it fails: `maxTries` runs, `waitBetweenTries` ms apart. */
	readonly retryOnFail?: boolean;
	readonly maxTries?: number;
	readonly waitBetweenTries?: number;
	/** Emit one empty item when the node emits none. */
	readonly alwaysOutputData?: boolean;
	/** Run the node one time, for the first item only. */
	readonly executeOnce?: boolean;
	/** When the node fails: stop the workflow (default), or emit the error as an item. */
	readonly onError?: 'stopWorkflow' | 'continueRegularOutput';
	readonly notes?: string;
	/** Show `notes` below the node on the canvas. */
	readonly notesInFlow?: boolean;
}

/** A node that an AI node uses through an `ai_*` input. It never receives items. */
export interface SubnodeSpec {
	readonly name: string;
	readonly type: string;
	readonly version: number;
	readonly parameters: (compiler: Compiler) => Record<string, unknown>;
	readonly settings?: NodeSettings;
	readonly subnodes?: SubnodeSpecs;
}

/** Sub-nodes by slot, in input order. */
export type SubnodeSpecs = Partial<Record<SubnodeSlot, readonly SubnodeSpec[]>>;

export interface NodeSpec {
	readonly name: string;
	readonly type: string;
	readonly version: number;
	readonly trigger?: boolean;
	readonly parameters: (compiler: Compiler) => Record<string, unknown>;
	readonly sample?: readonly unknown[];
	readonly settings?: NodeSettings;
	readonly onError?: 'continueErrorOutput';
	/** Main outputs before the error output. */
	readonly outputs?: number;
	/** The credential scopes the node needs. The build unions them per workflow. */
	readonly requires?: Requires;
	/** A native trigger or its reply step. The build checks that the two go together. */
	readonly pairing?: Pairing;
	readonly subnodes?: SubnodeSpecs;
}

/**
 * A native trigger and the step that replies to its caller, e.g. Webhook and Respond to
 * Webhook. The caller waits for the reply when the trigger parameter `field` is `value`.
 * Without `field`, the step always belongs to the trigger, e.g. a form page.
 */
export interface Pairing {
	/** The node type of the trigger. */
	readonly trigger: string;
	/** The node type of the reply step. */
	readonly reply: string;
	readonly field?: string;
	readonly value?: string;
}

/** The scopes of one credential that a contract node needs, e.g. `{ credential: 'notion', scopes: ['content:read'] }`. */
export interface Requires {
	/** The node id that owns the credential. */
	readonly credential: string;
	readonly scopes: readonly string[];
}

interface Edge {
	readonly from: string;
	readonly output: number;
	readonly to: string;
	readonly input: number;
}

export interface Tail {
	readonly node: string;
	readonly output: number;
}

export interface Graph {
	readonly nodes: readonly NodeSpec[];
	readonly edges: readonly Edge[];
}

/** @internal A graph and its open ends. Region builders take and return fragments. */
export interface Fragment {
	readonly graph: Graph;
	readonly tails: readonly Tail[];
}

declare const phantom: unique symbol;
declare const routes: unique symbol;

/** One node that reads `In` items and emits `Out` items. Pass it to `Flow.andThen`. */
export interface Step<In, Ctx, Out, N extends string> {
	readonly name: N;
	readonly spec: NodeSpec;
	readonly [phantom]?: { readonly read: (item: In, ctx: Ctx) => void; readonly emit: Out };
}

/**
 * A step with named outputs in n8n output order, from a contract with `outputs`.
 * `andThen` continues from the first output; `Flow.route` continues from each output.
 */
export interface RoutedStep<In, Ctx, Out, N extends string, Names extends string>
	extends Step<In, Ctx, Out, N> {
	/** The output names the config makes, in n8n output order. */
	readonly outputs: readonly string[];
	readonly [routes]?: Names;
}

/** The output names of a routed step, e.g. `"kept" | "discarded"`. */
export type OutputNames<S> = S extends RoutedStep<
	infer _In,
	infer _Ctx,
	infer _Out,
	infer _N,
	infer Names
>
	? Names
	: never;

/** What a contract sub-node supplies, e.g. `chatModel`. `node` is a sub-node from `subnode()`. */
export type SupplyKind = 'chatModel' | 'memory' | 'tool' | 'embeddings';

/** The slot of each kind that a contract sub-node supplies. */
export const SUPPLY_SLOTS = {
	chatModel: 'model',
	memory: 'memory',
	tool: 'tools',
	embeddings: 'embedding',
} as const satisfies Record<SupplyKind, SubnodeSlot>;

/**
 * A sub-node, e.g. a chat model or a tool. n8n evaluates its lambdas with the item of the AI
 * node that uses it, so they read that node's input `In`. `K` is what it supplies: a contract
 * root node takes only contract sub-nodes of its kind, and `node()` takes only `subnode()`.
 */
export interface Subnode<In, Ctx, K extends SupplyKind | 'node' = 'node'> {
	readonly spec: SubnodeSpec;
	/** The slot of a contract sub-node in its root node. */
	readonly slot?: SubnodeSlot;
	readonly [phantom]?: { readonly read: (item: In, ctx: Ctx) => void; readonly supplies: K };
}

/** The sub-nodes of an AI node (Agent, Basic LLM Chain, Vector Store, …) by slot. */
export interface Subnodes<In, Ctx> {
	/** A chat model. */
	model?: Subnode<In, Ctx>;
	memory?: Subnode<In, Ctx>;
	tools?: ReadonlyArray<Subnode<In, Ctx>>;
	outputParser?: Subnode<In, Ctx>;
	embedding?: Subnode<In, Ctx>;
	vectorStore?: Subnode<In, Ctx>;
	retriever?: Subnode<In, Ctx>;
	documentLoader?: Subnode<In, Ctx>;
	textSplitter?: Subnode<In, Ctx>;
	reranker?: Subnode<In, Ctx>;
}

/** The specs of `subnodes`, each slot as a list. */
export function subnodeSpecs<In, Ctx>(subnodes: Subnodes<In, Ctx>): SubnodeSpecs {
	return Object.fromEntries(
		SUBNODE_SLOTS.flatMap(([slot]) => {
			const value = subnodes[slot];
			if (value === undefined) return [];
			const list = 'spec' in value ? [value] : value;
			return list.length > 0 ? [[slot, list.map((entry) => entry.spec)]] : [];
		}),
	);
}

const isSubnodeValue = (value: unknown): value is Subnode<unknown, unknown, SupplyKind> =>
	isDataObject(value) && isDataObject(value.spec) && typeof value.spec.parameters === 'function';

/**
 * The fields of a contract config that hold contract sub-nodes, as sub-node specs by slot,
 * and the other fields as parameters. n8n connects a sub-node; it is no parameter.
 */
function splitSubnodes(fields: Readonly<Record<string, unknown>>): {
	parameters: Record<string, unknown>;
	subnodes: SubnodeSpecs;
	unslotted: string[];
} {
	const entries = Object.entries(fields);
	const subnodesOf = (value: unknown) =>
		Array.isArray(value) && value.length > 0 && value.every(isSubnodeValue)
			? value
			: isSubnodeValue(value)
				? [value]
				: undefined;
	const held = entries.flatMap(([key, value]) => {
		const list = subnodesOf(value);
		return list ? list.map((subnode) => ({ key, subnode })) : [];
	});
	const heldKeys = new Set(held.map(({ key }) => key));
	const subnodes = held.reduce<SubnodeSpecs>((specs, { subnode }) => {
		if (subnode.slot === undefined) return specs;
		return { ...specs, [subnode.slot]: [...(specs[subnode.slot] ?? []), subnode.spec] };
	}, {});
	return {
		parameters: Object.fromEntries(entries.filter(([key]) => !heldKeys.has(key))),
		subnodes,
		unslotted: held.filter(({ subnode }) => subnode.slot === undefined).map(({ key }) => key),
	};
}

/** Keys both branches share, so `$("Node")` after a join names a node every path ran. */
type Common<A, B> = Pick<A, keyof A & keyof B>;

/** The built-in Manual Trigger, which the native contract `manual.trigger` types. */
export const MANUAL_NODE = { type: 'n8n-nodes-base.manualTrigger', version: 1 };
/** The IF and Edit Fields contracts of `@n8n/nodes-base-next` (`core.if`, `core.set`). */
export const BRANCH_NODE = { type: '@n8n/nodes-base-next.coreIf', version: 1 };
export const SET_NODE = { type: '@n8n/nodes-base-next.coreSet', version: 1 };

/** The IF contract parameters of `Flow.branch` for the compiled JavaScript of its condition. */
export const branchParameters = (condition: string) => ({
	where: { conditions: [{ type: 'boolean', left: `={{ ${condition} }}`, test: { op: 'true' } }] },
});

/** The Edit Fields contract parameters of `set`: a lambda field holds `={{ js }}`. */
export const setParameters = (fields: Readonly<Record<string, unknown>>, keepAll: boolean) => ({
	fields,
	include: { mode: keepAll ? 'all' : 'none' },
});

const isDataObject = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isLambda = (value: unknown): value is (...args: never[]) => unknown =>
	typeof value === 'function';

export const edgeKey = (edge: Edge) =>
	`${edge.from}\u0000${edge.output}\u0000${edge.to}\u0000${edge.input}`;

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

const wire = (tails: readonly Tail[], to: string, input = 0): Edge[] =>
	tails.map((tail) => ({ from: tail.node, output: tail.output, to, input }));

const attach = (graph: Graph, tails: readonly Tail[], spec: NodeSpec): Graph =>
	unionGraphs([graph, { nodes: [spec], edges: wire(tails, spec.name) }]);

const tail = (node: string, output: number): Tail[] => [{ node, output }];

// ── Regions ─────────────────────────────────────────────────────────────────
// Untyped builders, so decompile can replay a region without its item types.

/**
 * Loop Over Items takes the next batch each time items return to it. So each batch must return
 * exactly once: no body end may emit on every pass of an inner loop, and no item may stop.
 */
function forEachBodyProblems(name: string, entered: Graph, inner: Fragment): string[] {
	const { edges } = inner.graph;
	const targetsOf = (node: string, output?: number) =>
		edges
			.filter((edge) => edge.from === node && (output === undefined || edge.output === output))
			.map((edge) => edge.to);
	const reaches = (start: readonly string[], goal: string) => {
		const seen = new Set<string>();
		const queue = [...start];
		while (queue.length > 0) {
			const node = queue.shift();
			if (node === goal) return true;
			if (node === undefined || node === name || seen.has(node)) continue;
			seen.add(node);
			queue.push(...targetsOf(node));
		}
		return false;
	};
	const isTail = (node: string, output: number) =>
		inner.tails.some((each) => each.node === node && each.output === output);
	const before = new Set(entered.nodes.map((spec) => spec.name));
	const bodySpecs = inner.graph.nodes.filter((spec) => !before.has(spec.name));

	const perPass = inner.tails
		.filter((each) => reaches(targetsOf(each.node, each.output), each.node))
		.map(
			({ node }) =>
				`${node} returns to ${name} on every pass of an inner loop, so ${name} takes a new batch for each pass. paginate takes all items at once: move it out of forEach`,
		);
	const filters = bodySpecs
		.filter((spec) => spec.type === FILTER_NODE.type)
		.map(
			(spec) =>
				`${spec.name} can drop a whole batch, and then ${name} stops without an error. Filter before forEach, or use branch with else`,
		);
	const openBranches = bodySpecs
		.filter((spec) => spec.type === BRANCH_NODE.type)
		.flatMap((spec) =>
			Array.from({ length: spec.outputs ?? 1 }, (_, output) => output)
				.filter((output) => targetsOf(spec.name, output).length === 0 && !isTail(spec.name, output))
				.map(
					(output) =>
						`Items on output ${output} of ${spec.name} never return to ${name}. When a whole batch goes there, ${name} stops without an error. Give the branch an else`,
				),
		);
	return [...perPass, ...filters, ...openBranches];
}

/** @internal Loop Over Items: the body runs on each batch, then `done` emits all body output. */
export function forEachFragment(
	from: Fragment,
	name: string,
	batchSize: number,
	body: (each: Fragment) => Fragment,
): Fragment {
	const loop: NodeSpec = { name, ...LOOP_NODE, outputs: 2, parameters: () => ({}) };
	const entered = attach(from.graph, from.tails, loop);
	const inner = body({ graph: entered, tails: tail(name, LOOP_EACH) });
	const returns = [...new Set(inner.tails.map(({ node }) => node))];
	const problems = forEachBodyProblems(name, entered, inner);
	const spec: NodeSpec = {
		...loop,
		parameters: (compiler) => {
			if (!Number.isInteger(batchSize) || batchSize < 1) {
				compiler.issue(`batchSize must be a whole number of at least 1, not ${batchSize}`);
			}
			if (returns.includes(name)) compiler.issue('forEach needs a body that runs a node');
			problems.forEach((problem) => compiler.issue(problem));
			return forEachParameters(batchSize, returns);
		},
	};
	return {
		graph: unionGraphs([inner.graph, { nodes: [spec], edges: wire(inner.tails, name) }]),
		tails: tail(name, LOOP_DONE),
	};
}

/** @internal How a loop region decides and emits; lambdas arrive compiled per node. */
export interface LoopOptions {
	readonly name: string;
	readonly maxIterations: number;
	readonly until: (compiler: Compiler) => string;
	readonly next: (compiler: Compiler) => string;
	/** `each` emits every pass (pages); `last` emits the pass that met `until`. */
	readonly emit: 'each' | 'last';
	readonly wait?: Interval;
}

/**
 * @internal A while loop in node contracts: head (loop state) → body → check (Switch) → next
 * (loop state) → [wait] → head. The check also fails the run at `maxIterations` (Stop and
 * Error).
 */
export function loopFragment(
	from: Fragment,
	options: LoopOptions,
	body: (pass: Fragment) => Fragment,
): Fragment {
	const { name, maxIterations, wait } = options;
	const names = loopNodeNames(name);
	const back = wait ? names.wait : names.next;
	const head: NodeSpec = {
		name,
		...LOOP_STATE_NODE,
		parameters: () => loopHeadParameters(name, back),
	};
	const inner = body({ graph: attach(from.graph, from.tails, head), tails: tail(name, 0) });
	const check: NodeSpec = {
		name: names.check,
		...SWITCH_NODE,
		outputs: 3,
		parameters: (compiler) => {
			if (!Number.isInteger(maxIterations) || maxIterations < 1) {
				compiler.issue(`The pass limit must be a whole number of at least 1, not ${maxIterations}`);
			}
			if (inner.tails.some(({ node }) => node === name)) {
				compiler.issue(`${name} needs a body that runs a node`);
			}
			return loopCheckParameters(name, options.until(compiler), maxIterations);
		},
	};
	const parts: Graph[] = [
		attach(inner.graph, inner.tails, check),
		{
			nodes: [
				{
					name: names.limit,
					...STOP_NODE,
					parameters: () => loopLimitParameters(name, maxIterations),
				},
				{
					name: names.next,
					...LOOP_STATE_NODE,
					parameters: (compiler) => loopNextParameters(name, options.next(compiler)),
				},
				...(wait
					? [{ name: names.wait, ...WAIT_NODE, parameters: () => waitParameters(wait) }]
					: []),
			],
			edges: [
				...wire(tail(names.check, CHECK_LIMIT), names.limit),
				...wire(tail(names.check, CHECK_AGAIN), names.next),
				...(wait ? wire(tail(names.next, 0), names.wait) : []),
				...wire(tail(back, 0), name),
			],
		},
	];
	return {
		graph: unionGraphs(parts),
		tails: options.emit === 'last' ? tail(names.check, CHECK_DONE) : inner.tails,
	};
}

/** @internal Route each item by the string value of `field`: one flow per case. */
export function switchFragment(
	from: Fragment,
	name: string,
	field: string,
	cases: ReadonlyArray<readonly [string, (flow: Fragment) => Fragment]>,
	fallback?: (flow: Fragment) => Fragment,
): Fragment {
	const router = caseRouter(
		field,
		cases.map(([key]) => key),
		fallback !== undefined,
	);
	const spec: NodeSpec = {
		name,
		type: router.type,
		version: router.version,
		outputs: router.outputs,
		parameters: (compiler) => {
			if (cases.some(([key]) => key === FALLBACK_OUTPUT)) {
				compiler.issue(`switch case "${FALLBACK_OUTPUT}" is the name of the output for no case`);
			}
			return router.parameters;
		},
	};
	const graph = attach(from.graph, from.tails, spec);
	const { caseOutputs, defaultOutput } = router;
	const routed = [
		...cases.map(([, build], index) => build({ graph, tails: tail(name, caseOutputs[index]) })),
		...(fallback && defaultOutput !== undefined
			? [fallback({ graph, tails: tail(name, defaultOutput) })]
			: []),
	];
	return {
		graph: unionGraphs([graph, ...routed.map((flow) => flow.graph)]),
		tails: routed.flatMap((flow) => flow.tails),
	};
}

/** @internal Keep the items a condition holds for (the Filter contract). */
export function filterFragment(
	from: Fragment,
	name: string,
	condition: (compiler: Compiler) => string,
): Fragment {
	// The Filter contract sends the other items to its second output, which stays open.
	const spec: NodeSpec = {
		name,
		...FILTER_NODE,
		outputs: 2,
		parameters: (compiler) => filterParameters(condition(compiler)),
	};
	return { graph: attach(from.graph, from.tails, spec), tails: tail(name, 0) };
}

/** @internal Run every branch on the same items and join them in one Merge node, input by branch. */
export function mergeFragment(
	from: Fragment,
	name: string,
	join: MergeJoin,
	branches: ReadonlyArray<(flow: Fragment) => Fragment>,
): Fragment {
	const joined = branches.map((branch) => branch(from));
	const spec: NodeSpec = { name, ...mergeNodeOf(join), parameters: () => mergeParameters(join) };
	const edges = joined.flatMap((flow, input) => wire(flow.tails, name, input));
	return {
		graph: unionGraphs([from.graph, ...joined.map((flow) => flow.graph), { nodes: [spec], edges }]),
		tails: tail(name, 0),
	};
}

const asFlow = <Item, Ctx>(fragment: Fragment) =>
	new Flow<Item, Ctx>(fragment.graph, fragment.tails);

const isRouted = <S extends object>(step: S): step is S & { readonly outputs: readonly string[] } =>
	'outputs' in step && Array.isArray(step.outputs);

const quoted = (names: readonly string[]) => names.map((name) => `"${name}"`).join(', ');

/** @internal Run a routed step and build the flow of each output; outputs without one stop. */
export function routeFragment(
	from: Fragment,
	step: { readonly name: string; readonly spec: NodeSpec; readonly outputs: readonly string[] },
	flowOf: (output: string, flow: Fragment) => Fragment | undefined,
	keys: readonly string[],
): Fragment {
	const { name, outputs } = step;
	const unknown = keys.filter((key) => !outputs.includes(key));
	const missing = outputs.slice(0, -1).filter((output) => !keys.includes(output));
	const spec: NodeSpec = {
		...step.spec,
		parameters: (compiler) => {
			if (unknown.length) {
				compiler.issue(
					`${name}: route names ${quoted(unknown)}, which are not outputs of ${name} (${quoted(outputs)})`,
				);
			}
			if (missing.length) {
				compiler.issue(
					`${name}: items on ${quoted(missing)} stop. Give each output but the last a flow in route`,
				);
			}
			return step.spec.parameters(compiler);
		},
	};
	const graph = attach(from.graph, from.tails, spec);
	const flows = outputs.flatMap((output, index) => {
		const built = flowOf(output, { graph, tails: tail(name, index) });
		return built ? [built] : [];
	});
	return {
		graph: unionGraphs([graph, ...flows.map((flow) => flow.graph)]),
		tails: flows.flatMap((flow) => flow.tails),
	};
}

/**
 * One flow per output name of a routed step; each gets the step output. `R` maps each output
 * to the flow it builds, so a key that is no output name is `never`.
 */
export type RouteFlows<R, Names extends string, Out, Ctx> = {
	readonly [K in keyof R]: K extends Names ? (flow: Flow<Out, Ctx>) => R[K] : never;
};

type RouteEnds<R> = {
	[K in keyof R]-?: R[K] extends Flow<infer A, infer C> ? [A, C] : never;
}[keyof R];

/** The item after `route`: the item of any output flow. */
export type RoutedItem<R> = RouteEnds<R>[0];
/** Node names that every output flow ran, as after `branch`. */
export type RoutedCtx<R> = Pick<RouteEnds<R>[1], keyof RouteEnds<R>[1]>;

/** Keys of `Item` whose value is a string, so `switch` can route on them. */
export type CaseField<Item> = {
	[K in keyof Item]-?: Item[K] extends string ? K : never;
}[keyof Item] &
	string;

/** The items of case `K`: union members whose `F` can be `K`, with `F` narrowed to `K`. */
export type CaseItem<Item, F extends keyof Item, K> = Item extends unknown
	? K extends Item[F]
		? Item & { readonly [P in F]: K }
		: never
	: never;

type CaseFlow<Item, Ctx, N extends string, F extends keyof Item, K> = (
	flow: Flow<CaseItem<Item, F, K>, Ctx & Record<N, CaseItem<Item, F, K>>>,
) => Fragment;

/** Every literal value of `Item[F]` needs a case. A plain `string` field needs `default`. */
export type SwitchCases<Item, Ctx, N extends string, F extends keyof Item> = string extends Item[F]
	? { readonly [key: string]: CaseFlow<Item, Ctx, N, F, string> }
	: { readonly [K in Item[F] & string]: CaseFlow<Item, Ctx, N, F, K> };

type FlowItem<T> = T extends (flow: never) => Flow<infer A, infer _Ctx> ? A : never;
type CasesItem<C> = { [K in keyof C]: FlowItem<C[K]> }[keyof C];

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
		const outputs = isRouted(step) ? step.outputs : [];
		const dropped = outputs.slice(1, -1);
		const spec: NodeSpec = dropped.length
			? {
					...step.spec,
					parameters: (compiler) => {
						compiler.issue(
							`${step.name}: andThen continues only from output "${outputs[0] ?? ''}", so items on ${quoted(dropped)} stop. Use .route(step, { … }) to give each output a flow`,
						);
						return step.spec.parameters(compiler);
					},
				}
			: step.spec;
		return new Flow(attach(this.graph, this.tails, spec), [{ node: step.name, output: 0 }]);
	}

	/**
	 * Run a step with named outputs, e.g. `dataTable.row.exists` or `ai.classify`, and continue
	 * from each output with its own flow. Every output but the last needs a flow. The last output
	 * is the "no" path (false, missing, other): without a flow its items stop.
	 */
	route<
		Out,
		const N extends string,
		Names extends string,
		R extends Readonly<Record<keyof R, Fragment>>,
	>(
		step: RoutedStep<Item, Ctx, Out, N, Names>,
		routes: RouteFlows<R, Names, Out, Ctx & Record<N, Out>>,
	): Flow<RoutedItem<R>, RoutedCtx<R>> {
		const flows: Readonly<
			Partial<Record<string, (flow: Flow<Out, Ctx & Record<N, Out>>) => Fragment>>
		> = routes;
		const fragment = routeFragment(
			this,
			step,
			(output, flow) => flows[output]?.(asFlow(flow)),
			Object.keys(routes),
		);
		return asFlow(fragment);
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
			type: BRANCH_NODE.type,
			version: BRANCH_NODE.version,
			outputs: 2,
			parameters: (compiler) => branchParameters(compiler.js(condition)),
		};
		// Output 0 is "true" and output 1 is "false", as the IF contract names them.
		const graph = attach(this.graph, this.tails, spec);
		const onTrue = config.then(new Flow(graph, [{ node: config.name, output: 0 }]));
		const onFalse = config.else?.(new Flow(graph, [{ node: config.name, output: 1 }]));
		return new Flow(unionGraphs([onTrue.graph, ...(onFalse ? [onFalse.graph] : [])]), [
			...onTrue.tails,
			...(onFalse?.tails ?? []),
		]);
	}

	/**
	 * Run `body` on batches of `batchSize` items, one batch after the other (Loop Over Items).
	 * Afterwards the flow continues once with all body output. Use it only to pace work, for
	 * example for a rate limit: every node already runs once for each item. Each batch must
	 * return once: a `loop` or `pollUntil` in the body must meet `until` for all items of a batch
	 * on the same pass, and `paginate`, `filter`, and a `branch` without `else` are build errors.
	 */
	forEach<const N extends string, B, CB>(config: {
		name: N;
		batchSize: number;
		body: (each: Flow<Item, Ctx & Record<N, Item>>) => Flow<B, CB>;
	}): Flow<B, Ctx & Record<N, B>> {
		return asFlow(
			forEachFragment(this, config.name, config.batchSize, (each) => config.body(asFlow(each))),
		);
	}

	/**
	 * Run `body` again until `until` holds. Each item is the loop state: `next` makes the state
	 * of the next pass from the body output. The run fails after `maxIterations` passes.
	 * The flow continues with the output of the pass that met `until`.
	 */
	loop<const N extends string, B, CB, S extends Item>(config: {
		name: N;
		maxIterations: number;
		body: (pass: Flow<Item, Ctx & Record<N, Item>>) => Flow<B, CB>;
		until: (out: B, $: Dollar<CB>) => boolean;
		next: (out: B, $: Dollar<CB>) => S;
	}): Flow<B, Ctx & Record<N, Item>> {
		const { name, maxIterations, until, next } = config;
		const options: LoopOptions = {
			name,
			maxIterations,
			emit: 'last',
			until: (compiler) => compiler.js(until),
			next: (compiler) => compiler.js(next),
		};
		return asFlow(loopFragment(this, options, (pass) => config.body(asFlow(pass))));
	}

	/**
	 * Request pages until `next` gives `null`; each item is the cursor state of one page. Every
	 * page continues as it arrives. Prefer the pagination of the node when it has one. In
	 * execution order v1 the pages can continue last page first: v1 runs the node more to the
	 * top left first.
	 */
	paginate<const N extends string, B, CB, S extends Item>(config: {
		name: N;
		maxPages: number;
		request: (page: Flow<Item, Ctx & Record<N, Item>>) => Flow<B, CB>;
		next: (response: B, $: Dollar<CB>) => S | null;
	}): Flow<B, Ctx & Record<N, Item>> {
		const { name, maxPages, next } = config;
		const options: LoopOptions = {
			name,
			maxIterations: maxPages,
			emit: 'each',
			until: (compiler) => noNextPage(compiler.js(next)),
			next: (compiler) => compiler.js(next),
		};
		return asFlow(loopFragment(this, options, (page) => config.request(asFlow(page))));
	}

	/**
	 * Run `attempt` until `until` holds, with a wait of `every` between attempts. The run fails
	 * after `maxAttempts`. The flow continues with the output of the attempt that met `until`.
	 */
	pollUntil<const N extends string, B, CB>(config: {
		name: N;
		maxAttempts: number;
		every: Interval;
		attempt: (flow: Flow<Item, Ctx & Record<N, Item>>) => Flow<B, CB>;
		until: (out: B, $: Dollar<CB>) => boolean;
	}): Flow<B, Ctx & Record<N, Item>> {
		const { name, maxAttempts, every, until } = config;
		const options: LoopOptions = {
			name,
			maxIterations: maxAttempts,
			emit: 'last',
			wait: every,
			until: (compiler) => compiler.js(until),
			next: () => samePass(name),
		};
		return asFlow(loopFragment(this, options, (attempt) => config.attempt(asFlow(attempt))));
	}

	/**
	 * Route each item by the string field `on` (a Switch node). Each case flow gets the items of
	 * its value, with the item type narrowed. A literal union field needs a case for each value;
	 * a plain `string` field needs `default`. The open ends of all cases continue.
	 */
	switch<
		const N extends string,
		const F extends CaseField<Item>,
		const C extends SwitchCases<Item, Ctx, N, F>,
		D = never,
		CD = unknown,
	>(
		config: {
			name: N;
			on: F;
			cases: C;
		} & (string extends Item[F]
			? { default: (flow: Flow<Item, Ctx & Record<N, Item>>) => Flow<D, CD> }
			: { default?: (flow: Flow<Item, Ctx & Record<N, Item>>) => Flow<D, CD> }),
	): Flow<CasesItem<C> | D, Ctx & Record<N, Item>> {
		const { name, on, cases } = config;
		const fallback = config.default;
		const entries = Object.entries(cases).map(
			([key, build]) => [key, (flow: Fragment) => build(asFlow(flow))] as const,
		);
		return asFlow(
			switchFragment(
				this,
				name,
				on,
				entries,
				fallback ? (flow) => fallback(asFlow(flow)) : undefined,
			),
		);
	}

	/** Keep the items `if` holds for (a Filter node). A type guard narrows the item type. */
	filter<const N extends string, T extends Item>(config: {
		name: N;
		if: (item: Item, $: Dollar<Ctx>) => item is T;
	}): Flow<T, Ctx & Record<N, T>>;
	filter<const N extends string>(config: {
		name: N;
		if: (item: Item, $: Dollar<Ctx>) => boolean;
	}): Flow<Item, Ctx & Record<N, Item>>;
	filter(config: { name: string; if: (item: Item, $: Dollar<Ctx>) => boolean }): Fragment {
		const condition = config.if;
		return asFlow(filterFragment(this, config.name, (compiler) => compiler.js(condition)));
	}

	/**
	 * Run two branches on the same items and join them (a Merge node). `append` emits the items
	 * of both; `position` joins item i of each; `{ left, right }` joins items whose fields match.
	 */
	merge<const N extends string, A, B, CA, CB>(config: {
		name: N;
		join: 'append';
		branches: readonly [
			(flow: Flow<Item, Ctx>) => Flow<A, CA>,
			(flow: Flow<Item, Ctx>) => Flow<B, CB>,
		];
	}): Flow<A | B, Ctx & Record<N, A | B>>;
	merge<const N extends string, A, B, CA, CB>(config: {
		name: N;
		join: 'position';
		branches: readonly [
			(flow: Flow<Item, Ctx>) => Flow<A, CA>,
			(flow: Flow<Item, Ctx>) => Flow<B, CB>,
		];
	}): Flow<A & B, Ctx & Record<N, A & B>>;
	merge<const N extends string, A, B, CA, CB>(config: {
		name: N;
		join: { left: keyof A & string; right: keyof B & string };
		branches: readonly [
			(flow: Flow<Item, Ctx>) => Flow<A, CA>,
			(flow: Flow<Item, Ctx>) => Flow<B, CB>,
		];
	}): Flow<A & B, Ctx & Record<N, A & B>>;
	merge(config: {
		name: string;
		join: MergeJoin;
		branches: ReadonlyArray<(flow: Flow<Item, Ctx>) => Fragment>;
	}): Fragment {
		const branches = config.branches.map(
			(branch) => (flow: Fragment) => branch(asFlow<Item, Ctx>(flow)),
		);
		return asFlow(mergeFragment(this, config.name, config.join, branches));
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
	config: {
		readonly name: N;
		readonly sample?: readonly unknown[];
		readonly settings?: NodeSettings;
	},
	/** The node version: the action major, or the version of a composed or derived node. */
	version = 1,
	/** The resource and operation that select the action in a composed or derived node version. */
	slot?: { readonly resource?: string; readonly operation?: string },
	requires?: Requires,
	/** Set on the reply step of a native trigger. */
	pairing?: Pairing,
	/** The paths of the fields whose lambdas read each response page, e.g. `[['pages', 'next']]`. */
	pageFields: ReadonlyArray<readonly string[]> = [],
): Step<In, Ctx, Out, N> {
	const { name, sample, settings, ...fields } = config;
	const { parameters, subnodes, unslotted } = splitSubnodes(fields);
	return {
		name,
		spec: {
			name,
			type: id,
			version,
			sample,
			...(settings ? { settings } : {}),
			...(requires ? { requires } : {}),
			...(Object.keys(subnodes).length > 0 ? { subnodes } : {}),
			...(pairing ? { pairing } : {}),
			parameters: (compiler) => {
				unslotted.forEach((key) =>
					compiler.issue(`${key} takes a contract sub-node of its module, not subnode()`),
				);
				const compiled = compileWithPages(compiler, parameters, pageFields);
				// The slot goes last: no contract field may change the action that runs.
				return { ...(isDataObject(compiled) ? compiled : {}), ...slot };
			},
		},
	};
}

/** Compiles the lambdas at `pageFields` over the response page, and every other lambda over the item. */
function compileWithPages(
	compiler: Compiler,
	value: unknown,
	pageFields: ReadonlyArray<readonly string[]>,
	at: readonly string[] = [],
): unknown {
	const startsWith = (path: readonly string[]) => at.every((key, index) => path[index] === key);
	const inside = pageFields.filter(startsWith);
	if (inside.some((path) => path.length === at.length)) return compiler.value(value, '$response');
	if (inside.length === 0 || !isDataObject(value)) return compiler.value(value);
	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [
			key,
			compileWithPages(compiler, entry, inside, [...at, key]),
		]),
	);
}

/**
 * A contract sub-node, e.g. a chat model. Generated node modules call this. A root node
 * takes it in the input field of its kind.
 */
export function contractSubnode<In, Ctx, const K extends SupplyKind>(
	id: string,
	kind: K,
	config: { readonly name: string; readonly settings?: NodeSettings },
	version = 1,
): Subnode<In, Ctx, K> {
	const { name, settings, ...fields } = config;
	const { parameters, subnodes, unslotted } = splitSubnodes(fields);
	return {
		slot: SUPPLY_SLOTS[kind],
		spec: {
			name,
			type: id,
			version,
			...(settings ? { settings } : {}),
			...(Object.keys(subnodes).length > 0 ? { subnodes } : {}),
			parameters: (compiler) => {
				unslotted.forEach((key) =>
					compiler.issue(`${key} takes a contract sub-node of its module, not subnode()`),
				);
				const compiled = compiler.value(parameters);
				return isDataObject(compiled) ? compiled : {};
			},
		},
	};
}

/**
 * Model IDs by model catalog provider (models.dev), e.g. `openai`. The build adds the
 * catalog it knows by declaration merging.
 */
export interface ModelCatalog {}

/** A model ID of provider `P` in the catalog. Any string when the build has no catalog for `P`. */
export type ModelOf<P extends string> = P extends keyof ModelCatalog ? ModelCatalog[P] : string;

/** What a generated module adds for a native trigger. */
export interface TriggerOptions {
	readonly pairing?: Pairing;
	/**
	 * An output item. It fills the fields that a sample item leaves out, and a declared schema
	 * replaces its fields to make a sample.
	 */
	readonly example?: Readonly<Record<string, unknown>>;
	/** The trigger declares output fields with `schema`, so `schema` is not a node parameter. */
	readonly takesSchema?: true;
}

/** `sample` with the fields it leaves out taken from `example`, at any depth. */
const filledSample = (example: unknown, sample: unknown): unknown =>
	isDataObject(example) && isDataObject(sample)
		? {
				...example,
				...Object.fromEntries(
					Object.entries(sample).map(([key, value]) => [key, filledSample(example[key], value)]),
				),
			}
		: sample;

/**
 * Start a flow at a contract trigger. Generated node modules call this. `schema` holds the JSON
 * Schemas of declared output fields: it types the output, and without a `sample` it makes one.
 * It is not a node parameter.
 */
export function contractTrigger<Out, const N extends string>(
	id: string,
	config: {
		readonly name: N;
		readonly sample?: readonly unknown[];
		readonly schema?: Readonly<Record<string, ValueSchema | undefined>>;
		readonly settings?: NodeSettings;
	},
	version = 1,
	requires?: Requires,
	options: TriggerOptions = {},
): Flow<Out, Record<N, Out>> {
	const { name, sample: given, settings, ...input } = config;
	const { pairing, example, takesSchema } = options;
	// Only a trigger with declared output fields takes `schema`; for another it is a parameter.
	const { schema, ...withoutSchema } = input;
	const parameters = takesSchema ? withoutSchema : input;
	const declared = Object.entries((takesSchema && schema) || {}).flatMap(([field, fieldSchema]) =>
		fieldSchema ? [[field, exampleOfSchema(fieldSchema)] as const] : [],
	);
	const full = example && { ...example, ...Object.fromEntries(declared) };
	const sample = given
		? given.map((item) => filledSample(full, item))
		: full && declared.length
			? [full]
			: undefined;
	return startFlow({
		name,
		type: id,
		version,
		sample,
		...(settings ? { settings } : {}),
		...(requires ? { requires } : {}),
		...(pairing ? { pairing } : {}),
		parameters: (compiler) => {
			const compiled = compiler.value(parameters);
			return isDataObject(compiled) ? compiled : {};
		},
	});
}

/** Output names: a fixed list, or one per entry of an input list, then the fixed ones. */
export type OutputList =
	| readonly string[]
	| { readonly each: string; readonly then?: readonly string[] };

export const outputNamesOf = (outputs: OutputList, config: Readonly<Record<string, unknown>>) => {
	if (!('each' in outputs)) return outputs;
	const entries = config[outputs.each];
	return [
		...(Array.isArray(entries) ? entries : []).map((entry: unknown) =>
			isDataObject(entry) && typeof entry.output === 'string' ? entry.output : '',
		),
		...(outputs.then ?? []),
	];
};

/** A contract node with named outputs. Generated node modules call this, as `contractStep`. */
export function routedStep<In, Ctx, Out, N extends string, Names extends string>(
	id: string,
	config: {
		readonly name: N;
		readonly sample?: readonly unknown[];
		readonly settings?: NodeSettings;
	},
	outputs: OutputList,
	version = 1,
	slot?: { readonly resource?: string; readonly operation?: string },
	requires?: Requires,
): RoutedStep<In, Ctx, Out, N, Names> {
	const step = contractStep<In, Ctx, Out, N>(id, config, version, slot, requires);
	const names = outputNamesOf(outputs, config);
	return { ...step, spec: { ...step.spec, outputs: names.length }, outputs: names };
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
	/** The scopes each credential needs, sorted, with the nodes that need each one. */
	scopes(): Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
	validate(): ReturnType<WorkflowBuilder['validate']>;
	toJSON(options?: { tidyUp?: boolean }): WorkflowJSON;
	generatePinData(): { toJSON(options?: { tidyUp?: boolean }): WorkflowJSON };
}

function failedWorkflow(issues: readonly string[], scopes: Workflow['scopes']): Workflow {
	const fail = (): never => {
		throw new Error(`Workflow has ${issues.length} problem(s):\n- ${issues.join('\n- ')}`);
	};
	return { scopes, validate: fail, toJSON: fail, generatePinData: fail };
}

/** The union of the scopes the nodes need, per credential, sorted. */
function scopesOf(nodes: readonly NodeSpec[]) {
	const pairs = nodes.flatMap(({ name, requires }) =>
		(requires?.scopes ?? []).map((scope) => ({
			credential: requires?.credential ?? '',
			scope,
			name,
		})),
	);
	const credentials = [...new Set(pairs.map(({ credential }) => credential))].sort();
	return Object.fromEntries(
		credentials.map((credential) => {
			const own = pairs.filter((pair) => pair.credential === credential);
			const scopes = [...new Set(own.map(({ scope }) => scope))].sort();
			return [
				credential,
				Object.fromEntries(
					scopes.map((scope) => [
						scope,
						own.filter((pair) => pair.scope === scope).map((pair) => pair.name),
					]),
				),
			];
		}),
	);
}

export interface WorkflowOptions {
	readonly name: string;
	/**
	 * The scopes each credential grants, by node id, e.g. `{ notion: ['content:read'] }`. The
	 * build fails on a scope that a node needs and the credential does not grant. A credential
	 * that is not listed is not checked.
	 */
	readonly grants?: Readonly<Record<string, readonly string[]>>;
}

/** The default plugins plus loop wiring, which only `next` builds check for now. */
const nextRegistry = new PluginRegistry();
registerDefaultPlugins(nextRegistry);
nextRegistry.registerValidator(loopWiringValidator);

/**
 * A trigger `sample` is the event the trigger delivers, so verification pins it as the trigger
 * output. The root builder declares pin data for some node types only.
 */
function withTriggerSamples(
	built: WorkflowBuilder,
	specs: readonly NodeSpec[],
): Omit<Workflow, 'scopes'> {
	const samples = Object.fromEntries(
		specs.flatMap((spec) =>
			spec.trigger && spec.sample?.length ? [[spec.name, spec.sample.filter(isDataObject)]] : [],
		),
	);
	if (Object.keys(samples).length === 0) return built;
	return {
		validate: () => built.validate(),
		toJSON: (options) => built.toJSON(options),
		generatePinData: () => {
			const declared = built.generatePinData();
			return {
				toJSON: (options) => {
					const json = declared.toJSON(options);
					return { ...json, pinData: { ...samples, ...json.pinData } };
				},
			};
		},
	};
}

/** Every sub-node under `specs`, at any depth. */
const allSubnodes = (specs: SubnodeSpecs | undefined): SubnodeSpec[] =>
	Object.values(specs ?? {}).flatMap((list) =>
		list.flatMap((spec) => [spec, ...allSubnodes(spec.subnodes)]),
	);

/** The root builder config for `specs`; `input` gives each sub-node's node input. */
function subnodeConfig(
	specs: SubnodeSpecs,
	input: (spec: SubnodeSpec) => NodeInput,
): SubnodeConfig {
	const one = <T>(factory: (node: NodeInput) => T, list?: readonly SubnodeSpec[]) =>
		list?.[0] ? factory(input(list[0])) : undefined;
	const all = <T>(factory: (node: NodeInput) => T, list?: readonly SubnodeSpec[]) =>
		list?.map((spec) => factory(input(spec)));
	return {
		model: one(languageModel, specs.model),
		memory: one(memory, specs.memory),
		tools: all(tool, specs.tools),
		outputParser: one(outputParser, specs.outputParser),
		embedding: one(embedding, specs.embedding),
		vectorStore: one(vectorStore, specs.vectorStore),
		retriever: one(retriever, specs.retriever),
		documentLoader: one(documentLoader, specs.documentLoader),
		textSplitter: one(textSplitter, specs.textSplitter),
		reranker: one(reranker, specs.reranker),
	};
}

/** The nodes that `start` reaches along the edges, forward or backward, without `start`. */
function reachable(graph: Graph, start: string, direction: 'down' | 'up'): Set<string> {
	const next = (name: string) =>
		graph.edges.flatMap((edge) =>
			direction === 'down'
				? edge.from === name
					? [edge.to]
					: []
				: edge.to === name
					? [edge.from]
					: [],
		);
	const seen = new Set<string>();
	const queue = next(start);
	for (const name of queue) {
		if (seen.has(name)) continue;
		seen.add(name);
		queue.push(...next(name));
	}
	return seen;
}

/**
 * The checks n8n makes when a native trigger runs, made at build time. A reply step can also
 * belong to another node that waits for it, e.g. a Wait node that resumes on a webhook or a
 * Chat Trigger, so a reply step alone is never an issue.
 */
function pairingIssues(
	graph: Graph,
	parametersOf: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
): string[] {
	const byName = new Map(graph.nodes.map((spec) => [spec.name, spec]));
	const waits = (name: string, pairing: Pairing) =>
		pairing.field !== undefined && parametersOf.get(name)?.[pairing.field] === pairing.value;
	return graph.nodes.flatMap((spec): string[] => {
		const { pairing } = spec;
		if (pairing && pairing.field === undefined) {
			// n8n fails such a step at run time when its trigger is not before it.
			const before = [...reachable(graph, spec.name, 'up')];
			return spec.type === pairing.reply &&
				!before.some((name) => byName.get(name)?.type === pairing.trigger)
				? [`${spec.name}: needs a ${pairing.trigger} trigger before it`]
				: [];
		}
		if (pairing?.trigger !== spec.type) return [];
		const after = reachable(graph, spec.name, 'down');
		const replies = [...after].filter((name) => byName.get(name)?.type === pairing.reply);
		if (waits(spec.name, pairing)) {
			return replies.length === 0
				? [
						`${spec.name}: ${pairing.field} is "${pairing.value}", so the flow needs its reply step after it. Add it, or set another ${pairing.field}`,
					]
				: [];
		}
		const ownedByNodeBetween = (reply: string) =>
			[...reachable(graph, reply, 'up')].some((name) => after.has(name) && waits(name, pairing));
		return replies
			.filter((reply) => !ownedByNodeBetween(reply))
			.map(
				(reply) =>
					`${reply}: replies to "${spec.name}", which does not wait for it. Set ${pairing.field}: "${pairing.value}" on "${spec.name}"`,
			);
	});
}

/** Combine flows (one per trigger) into the workflow to save. */
export function workflow(
	options: string | WorkflowOptions,
	...flows: readonly Fragment[]
): Workflow {
	const { name, grants = {} } = typeof options === 'string' ? { name: options } : options;
	const graph = unionGraphs(flows.map((flow) => flow.graph));
	const nodeNames = new Set(graph.nodes.map((spec) => spec.name));
	const required = scopesOf(graph.nodes);
	const scopes = () => required;
	const missing = Object.entries(required).flatMap(([credential, byScope]) =>
		Object.entries(byScope)
			.filter(([scope]) => grants[credential] !== undefined && !grants[credential].includes(scope))
			.map(
				([scope, nodes]) =>
					`Credential "${credential}" does not grant scope "${scope}", which ${nodes.map((node) => `"${node}"`).join(', ')} needs`,
			),
	);
	const subnodes = [...new Set(graph.nodes.flatMap((spec) => allSubnodes(spec.subnodes)))];
	const subnodeNames = subnodes.map((spec) => spec.name);
	const issues: string[] = [
		...[
			...graph.nodes
				.filter((spec) => spec.name.endsWith('\u0000duplicate'))
				.map((spec) => spec.name.split('\u0000')[0]),
			...subnodeNames.filter(
				(subnodeName, index) =>
					nodeNames.has(subnodeName) || subnodeNames.indexOf(subnodeName) !== index,
			),
		].map((duplicate) => `Two different nodes are named "${duplicate}"`),
		...missing,
	];

	const subnodeInput = (spec: SubnodeSpec): NodeInput => ({
		type: spec.type,
		version: spec.version,
		config: {
			name: spec.name,
			parameters: spec.parameters(createCompiler(spec.name, nodeNames, issues)),
			...spec.settings,
			...(spec.subnodes ? { subnodes: subnodeConfig(spec.subnodes, subnodeInput) } : {}),
		},
	});
	const parametersOf = new Map(
		graph.nodes.map((spec) => [
			spec.name,
			spec.parameters(createCompiler(spec.name, nodeNames, issues)),
		]),
	);
	issues.push(...pairingIssues(graph, parametersOf));
	const instances = new Map(
		graph.nodes.map((spec) => {
			const config = {
				name: spec.name,
				parameters: parametersOf.get(spec.name) ?? {},
				...spec.settings,
				...(spec.onError ? { onError: spec.onError } : {}),
				...(spec.subnodes ? { subnodes: subnodeConfig(spec.subnodes, subnodeInput) } : {}),
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
	if (issues.length > 0) return failedWorkflow(issues, scopes);

	const withNodes = [...instances.values()].reduce(
		(builder, instance) => builder.add(instance),
		rootWorkflow(name, name, { registry: nextRegistry }),
	);
	const built = graph.edges.reduce((builder, edge) => {
		const from = instances.get(edge.from);
		const to = instances.get(edge.to);
		return from && to ? builder.connect(from, edge.output, to, edge.input) : builder;
	}, withNodes);
	const verified = withTriggerSamples(built, graph.nodes);
	return {
		scopes,
		validate: () => verified.validate(),
		toJSON: (toJsonOptions) => verified.toJSON(toJsonOptions),
		generatePinData: () => verified.generatePinData(),
	};
}
