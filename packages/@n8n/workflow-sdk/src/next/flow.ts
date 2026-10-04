import { compileBinaryKey, compileLambda, type LambdaRoot } from './lambda';
import {
	BODY_OUTPUT,
	CHECK_DONE,
	CHECK_LIMIT,
	checkAgain,
	FALLBACK_OUTPUT,
	FILTER_NODE,
	filterParameters,
	LOOP_STATE_NODE,
	MERGE_MAX_INPUTS,
	mergeNodeOf,
	NO_OP_NODE,
	STOP_NODE,
	SWITCH_NODE,
	WAIT_NODE,
	caseRouter,
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
	type LoopLimit,
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
import { expressionPathValidator } from '../workflow-builder/plugins/validators/expression-path-validator';
import { loopWiringValidator } from '../workflow-builder/plugins/validators/loop-wiring-validator';
import {
	NodeConnectionTypes,
	regionTreeOf,
	type IConnections,
	type IWorkflowSettings,
} from 'n8n-workflow';

// ── Types the model reads ───────────────────────────────────────────────────

/** Item shape of a node whose output is unknown. Reads compile; their values are not checked. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- gradual typing: an unknown shape must never block a build
export type Loose = { [key: string]: any };

type TimeUnit = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';
type Duration = Partial<Record<`${TimeUnit}s`, number>>;

/** A Luxon DateTime, as n8n expressions expose it. */
export interface DateTime {
	/** ISO 8601 text, e.g. `2026-09-01T10:00:00.000+02:00`. */
	toISO(): string;
	/** `2026-09-01` */
	toISODate(): string;
	/** Luxon tokens, e.g. `yyyy-MM-dd` */
	toFormat(format: string): string;
	/** Milliseconds since the Unix epoch. */
	toMillis(): number;
	/** A later time, e.g. `.plus({ days: 1 })`. */
	plus(duration: Duration): DateTime;
	/** An earlier time, e.g. `.minus({ hours: 2 })`. */
	minus(duration: Duration): DateTime;
	/** The start of the unit, e.g. `.startOf('day')`. */
	startOf(unit: TimeUnit): DateTime;
	/** The end of the unit, e.g. `.endOf('month')`. */
	endOf(unit: TimeUnit): DateTime;
}

/** The second lambda parameter: earlier nodes by name, and n8n built-ins. */
export interface Dollar<Ctx> {
	/** The paired item of an earlier node on this path. */
	<K extends keyof Ctx & string>(name: K): Ctx[K];
	/** The current time (`$now`). */
	readonly now: DateTime;
	/** The start of today (`$today`). */
	readonly today: DateTime;
	/** Parse an ISO 8601 string. */
	date(iso: string): DateTime;
	/** The current execution (`$execution`). */
	readonly execution: {
		/** The execution ID. */
		readonly id: string;
	};
	/** The current workflow (`$workflow`). */
	readonly workflow: {
		/** The workflow ID. */
		readonly id: string;
		/** The workflow name. */
		readonly name: string;
	};
	/** The variables of the instance (`$vars`). */
	readonly vars: Readonly<Record<string, string>>;
}

/**
 * A file on an item, as `item.binary.<name>` reads it. The bytes stay in the n8n binary data
 * store. Pass it to a binary field of a node: `file: (item) => item.binary.data`.
 */
export interface Binary {
	/** The MIME type, e.g. `image/png`. */
	readonly mimeType: string;
	/** The file name, e.g. `photo.png`. */
	readonly fileName?: string;
	/** The file extension, e.g. `png`. */
	readonly fileExtension?: string;
	/** For people, e.g. `1.2 MB`. */
	readonly fileSize?: string;
	/** The size in bytes. */
	readonly bytes?: number;
}

/** The brand of an expression from `expr()`. It keeps the text, as `@n8n/expression-types` does. */
interface ExpressionMark<E extends string> {
	/** The expression text. */
	readonly text: E;
}

/**
 * A field slot for an n8n expression, e.g. `={{ $json.id }}` or `=Hi {{ $json.name }}`. The
 * brand is optional, so a saved `'={{ … }}'` string still fits. The build checks the expression
 * as it checks a lambda: against the item of the node before, earlier nodes, and the field type.
 */
export type Expression = `=${string}` & {
	/** The brand of `expr()`. It has no value at run time. */
	readonly __n8n?: ExpressionMark<string>;
};

/** What `expr(text)` returns: the expression text with its `=`. */
export type Expr<E extends string> = (E extends `=${string}` ? E : `=${E}`) & {
	/** The brand of `expr()`. It has no value at run time. */
	readonly __n8n: ExpressionMark<E>;
};

/**
 * A fixed value, a lambda that n8n evaluates for each item, or an expression from `expr()`. A
 * lambda compiles to an n8n expression, so it may read only `item`, `$`, and JavaScript globals,
 * never local variables.
 */
export type Value<Item, Ctx, V> = V | ((item: Item, $: Dollar<Ctx>) => V) | Expression;

/**
 * The value of an optional field of a contract action. Its lambda can give `undefined`, e.g.
 * `(item) => item.binary.data.fileName`: the field then has no value, as if it were left out.
 */
export type Maybe<Item, Ctx, V> = Value<Item, Ctx, V | undefined>;

/** One response of a paged request, as `$response` of the legacy HTTP Request pagination. */
export interface ResponsePage {
	/** The parsed JSON body. Its shape is not known, so reads compile. */
	readonly body: Loose;
	/** Lower-case names, e.g. `link`. */
	readonly headers: Readonly<Record<string, string>>;
	/** The HTTP status code. */
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

/**
 * An item that a node emits for an input it fails on, with `onError: 'continueRegularOutput'`.
 * A contract node and `set` give the error message as text.
 */
export interface FailedItem {
	/** Why the node failed: the error message. */
	readonly error: string;
}

/**
 * An item on an error output: the fields of the input item that failed, plus `error`, the
 * error message. A legacy `node()` can give `error` in another shape, or none.
 */
export type ErrorItem = Loose & FailedItem;

type Primitive = string | number | boolean | null;

/**
 * A JSON Schema that a workflow declares for data it receives, e.g. the body of a webhook. A
 * field not in `required` is optional. An object with `properties` has only those fields,
 * unless `additionalProperties` is `true`.
 */
export interface ValueSchema {
	/** The JSON type. */
	readonly type?: 'string' | 'number' | 'integer' | 'boolean' | 'null' | 'array' | 'object';
	/** The allowed values. */
	readonly enum?: readonly Primitive[];
	/** The one allowed value. */
	readonly const?: Primitive;
	/** The schema of each named field. */
	readonly properties?: { readonly [key: string]: ValueSchema };
	/** The fields that must be present. */
	readonly required?: readonly string[];
	/** `true` allows fields that `properties` does not name. */
	readonly additionalProperties?: boolean;
	/** The schema of each array item. */
	readonly items?: ValueSchema;
	/** What the value is. */
	readonly description?: string;
	/** A string format, e.g. `date-time`. */
	readonly format?: string;
	/** Sample values. The first one seeds the trigger sample. */
	readonly examples?: readonly unknown[];
}

/** `T` as one object type, so tsc shows its fields. */
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

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
	/** Records a build problem of the node. */
	issue(message: string): void;
}

/** Each provider slot of an AI node and the connection type it maps to, in input order. */
export const PROVIDER_SLOTS = [
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

export type ProviderSlot = (typeof PROVIDER_SLOTS)[number][0];

/** The n8n connection type of a provider slot, e.g. `ai_languageModel`: what a derived provider gives. */
export type ProviderConnection = (typeof PROVIDER_SLOTS)[number][1];

/** The slot that takes each connection type. */
export const SLOT_OF_CONNECTION: ReadonlyMap<string, ProviderSlot> = new Map(
	PROVIDER_SLOTS.map(([slot, connection]) => [connection, slot]),
);

/**
 * The settings of an n8n node, outside its parameters. The `onError` and `recover` macros set
 * the error output (`onError: 'continueErrorOutput'`).
 */
export interface NodeSettings {
	/** Run the node again when it fails: `maxTries` runs, `waitBetweenTries` ms apart. */
	readonly retryOnFail?: boolean;
	/** The most runs with `retryOnFail`. */
	readonly maxTries?: number;
	/** The wait between runs with `retryOnFail`, in milliseconds. */
	readonly waitBetweenTries?: number;
	/** Emit one empty item when the node emits none. */
	readonly alwaysOutputData?: boolean;
	/** Run the node one time, for the first item only. */
	readonly executeOnce?: boolean;
	/**
	 * When the node fails: stop the workflow (default), or emit `{ error }` for each item it
	 * fails on. Then check `item.error === undefined` before you read an output field.
	 */
	readonly onError?: 'stopWorkflow' | 'continueRegularOutput';
	/** A note on the node. */
	readonly notes?: string;
	/** Show `notes` below the node on the canvas. */
	readonly notesInFlow?: boolean;
}

/** A node that an AI node uses through an `ai_*` input. It never receives items. */
export interface ProviderSpec {
	/** The node name. */
	readonly name: string;
	/** The n8n node type. */
	readonly type: string;
	/** The node type version. */
	readonly version: number;
	/** Compiles the node parameters. */
	readonly parameters: (compiler: Compiler) => Record<string, unknown>;
	/** Node settings. */
	readonly settings?: NodeSettings;
	/** The providers of this provider, by slot. */
	readonly providers?: ProviderSpecs;
}

/** Providers by slot, in input order. */
export type ProviderSpecs = Partial<Record<ProviderSlot, readonly ProviderSpec[]>>;

/** One node as the build compiles it. */
export interface NodeSpec {
	/** The node name. */
	readonly name: string;
	/** The n8n node type. */
	readonly type: string;
	/** The node type version. */
	readonly version: number;
	/** True for a trigger node. */
	readonly trigger?: boolean;
	/** Compiles the node parameters. */
	readonly parameters: (compiler: Compiler) => Record<string, unknown>;
	/** Sample output items, for verification. */
	readonly sample?: readonly unknown[];
	/**
	 * A step of a node contract of `@n8n/nodes-base-next`. Verification pins its sample: the host
	 * fills it from the output example for a service step, and runs a local step on its real input.
	 * Other steps, e.g. `node()` or a derived legacy node, run in verification as before.
	 */
	readonly pinsSample?: true;
	/** Node settings. */
	readonly settings?: NodeSettings;
	/** Set by `onError` and `recover`: the node has an error output. */
	readonly onError?: 'continueErrorOutput';
	/** Main outputs before the error output. */
	readonly outputs?: number;
	/** The credential scopes the node needs. The build unions them per workflow. */
	readonly requires?: Requires;
	/** A native trigger or its reply step. The build checks that the two go together. */
	readonly pairing?: Pairing;
	/** The providers of an AI node, by slot. */
	readonly providers?: ProviderSpecs;
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
	/** The trigger parameter that makes the caller wait. */
	readonly field?: string;
	/** The value of `field` that makes the caller wait. */
	readonly value?: string;
}

/** The scopes of one credential that a contract node needs, e.g. `{ credential: 'notion', scopes: ['content:read'] }`. */
export interface Requires {
	/** The node id that owns the credential. */
	readonly credential: string;
	/** The scopes that the node needs. */
	readonly scopes: readonly string[];
}

/** A connection from an output of one node to an input of another. */
interface Edge {
	/** The source node name. */
	readonly from: string;
	/** The output index of the source node. */
	readonly output: number;
	/** The target node name. */
	readonly to: string;
	/** The input index of the target node. */
	readonly input: number;
}

/** An open end: an output that the next part connects to. */
export interface Tail {
	/** The node name. */
	readonly node: string;
	/** The output index. */
	readonly output: number;
}

/** A `forEach` region by node names: the engine runs its members once for each batch. */
export interface RegionSpec {
	/** The region name, unique among nodes and regions. */
	readonly name: string;
	/** The items of one batch. */
	readonly batchSize: number;
	/** The member node names. */
	readonly members: readonly string[];
	/** The member node that takes each batch. */
	readonly entry: string;
	/** The member outputs that leave the region. */
	readonly exits: readonly Tail[];
	/** The problems of the region, as build issues. */
	readonly problems: readonly string[];
}

/** A `group` by node names: a frame on the canvas. It does not change the run. */
export interface GroupSpec {
	/** The group name, unique among groups and regions. */
	readonly name: string;
	/** The text the canvas shows when the group is collapsed. */
	readonly description?: string;
	/** The member node names. The build adds the providers of each member. */
	readonly members: readonly string[];
}

/** The nodes and connections that the build makes. */
export interface Graph {
	/** The nodes. */
	readonly nodes: readonly NodeSpec[];
	/** The connections. */
	readonly edges: readonly Edge[];
	/** The `forEach` regions. */
	readonly regions?: readonly RegionSpec[];
	/** The canvas groups. */
	readonly groups?: readonly GroupSpec[];
	/** The problems of values at a part position that are no part, as build issues. */
	readonly problems?: readonly string[];
}

/** @internal A graph and its open ends. Region builders take and return fragments. */
export interface Fragment {
	/** The nodes and connections so far. */
	readonly graph: Graph;
	/** The open ends. */
	readonly tails: readonly Tail[];
}

declare const phantom: unique symbol;
declare const routes: unique symbol;

/**
 * One position of a workflow: it reads `In` items, and `$()` reads the nodes `Ctx` before it.
 * It emits `Out` items, and the position after it reads the nodes `Next`.
 */
export interface Part<In, Ctx, Out, Next> {
	/** Holds the types of the part. It has no value at run time. */
	readonly [phantom]?: {
		/** What the part reads. */
		readonly read: (item: In, ctx: Ctx) => void;
		/** The items the part emits. */
		readonly emit: Out;
		/** The nodes that the next part reads with `$()`. */
		readonly next: Next;
	};
}

/**
 * The nodes with `settings: { onError: 'continueRegularOutput' }`. The build adds them by
 * declaration merging, so their items are `Out` or a {@link FailedItem}.
 */
export interface ContinuedNodes {}

/** The items of node `N`: `Out`, or also a {@link FailedItem} when it continues on error. */
// The first check needs no `N`, so a workflow without such nodes skips the per-step type.
// The failed item lists the output fields as absent, so a read of one gives `T | undefined`.
type Continued<N extends string, Out> = [keyof ContinuedNodes] extends [never]
	? Out
	: N extends keyof ContinuedNodes
		?
				| (Out & {
						/** Not set: the node did not fail on this item. */
						readonly error?: undefined;
				  })
				| (FailedItem & { readonly [K in keyof Out as Exclude<K, 'error'>]?: never })
		: Out;

/** One node that reads `In` items and emits `Out` items. */
export interface Step<In, Ctx, Out, N extends string>
	extends Part<In, Ctx, Continued<N, Out>, Ctx & Record<N, Continued<N, Out>>> {
	/** The node name. */
	readonly name: N;
	/** The node as the build compiles it. */
	readonly spec: NodeSpec;
}

/** A trigger node. It starts a flow: the positions after it read its items. */
export interface Trigger<Out, N extends string> extends Step<unknown, unknown, Out, N> {
	/** The trigger node as the build compiles it. */
	readonly spec: NodeSpec & {
		/** Marks a trigger node. */
		readonly trigger: true;
	};
}

/** A macro, e.g. `when` or `steps(…)`: it builds its nodes from the open ends before it. */
export interface Region<In, Ctx, Out, Next> extends Part<In, Ctx, Out, Next> {
	/**
	 * Builds the nodes of the macro from the open ends before it.
	 *
	 * @internal
	 */
	readonly region: (from: Fragment) => Fragment;
}

/**
 * A step with named outputs in n8n output order, from a contract with `outputs`. The position
 * after it continues from the first output; `route` continues from each output.
 */
export interface RoutedStep<In, Ctx, Out, N extends string, Names extends string>
	extends Step<In, Ctx, Out, N> {
	/** The output names the config makes, in n8n output order. */
	readonly outputs: readonly string[];
	/** Holds the output names for the types. It has no value at run time. */
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

/** What a contract provider gives, e.g. `chatModel`. `node` is a provider from `provider()`. */
export type ProviderKind = 'chatModel' | 'memory' | 'tool' | 'embeddings';

/** The slot of each kind that a contract provider gives. */
export const PROVIDER_KIND_SLOTS = {
	chatModel: 'model',
	memory: 'memory',
	tool: 'tools',
	embeddings: 'embedding',
} as const satisfies Record<ProviderKind, ProviderSlot>;

/**
 * A provider, e.g. a chat model or a tool. n8n evaluates its lambdas with the item of the AI
 * node that uses it, so they read that node's input `In`. `K` is what it gives: a contract root
 * node takes only contract providers of its kind, a derived root node only derived providers of
 * the connection type of the slot, and `node()` takes `provider()` or a derived provider.
 */
export interface Provider<In, Ctx, K extends ProviderKind | ProviderConnection | 'node' = 'node'> {
	/** The provider node as the build compiles it. */
	readonly spec: ProviderSpec;
	/** The slot of a contract provider in its root node. */
	readonly slot?: ProviderSlot;
	/** Holds the types of the provider. It has no value at run time. */
	readonly [phantom]?: {
		/** What the lambdas of the provider read. */
		readonly read: (item: In, ctx: Ctx) => void;
		/** What the provider gives. */
		readonly provides: K;
	};
}

/** A `provider()`, or a derived provider of connection type `C`. */
type SlotProvider<In, Ctx, C extends ProviderConnection> = Provider<In, Ctx, 'node' | C>;

/** The providers of an AI node (Agent, Basic LLM Chain, Vector Store, …) by slot. */
export interface Providers<In, Ctx> {
	/** A chat model. */
	model?: SlotProvider<In, Ctx, 'ai_languageModel'>;
	/** The chat memory. */
	memory?: SlotProvider<In, Ctx, 'ai_memory'>;
	/** The host gives a contract tool to a LangChain root node as a LangChain tool. */
	tools?: ReadonlyArray<Provider<In, Ctx, 'node' | 'ai_tool' | 'tool'>>;
	/** An output parser. */
	outputParser?: SlotProvider<In, Ctx, 'ai_outputParser'>;
	/** An embedding model. */
	embedding?: SlotProvider<In, Ctx, 'ai_embedding'>;
	/** A vector store. */
	vectorStore?: SlotProvider<In, Ctx, 'ai_vectorStore'>;
	/** A retriever. */
	retriever?: SlotProvider<In, Ctx, 'ai_retriever'>;
	/** A document loader. */
	documentLoader?: SlotProvider<In, Ctx, 'ai_document'>;
	/** A text splitter. */
	textSplitter?: SlotProvider<In, Ctx, 'ai_textSplitter'>;
	/** A reranker. */
	reranker?: SlotProvider<In, Ctx, 'ai_reranker'>;
}

/** Providers by slot, as `node()` and a derived root node take them. Only the specs are read. */
type ProvidersBySlot = Readonly<
	Partial<
		Record<
			ProviderSlot,
			| {
					/** The provider node as the build compiles it. */
					readonly spec: ProviderSpec;
			  }
			| ReadonlyArray<{
					/** The provider node as the build compiles it. */
					readonly spec: ProviderSpec;
			  }>
		>
	>
>;

/** The specs of `providers`, each slot as a list. */
export function providerSpecs(providers: ProvidersBySlot): ProviderSpecs {
	return Object.fromEntries(
		PROVIDER_SLOTS.flatMap(([slot]) => {
			const value = providers[slot];
			if (value === undefined) return [];
			const list = 'spec' in value ? [value] : value;
			return list.length > 0 ? [[slot, list.map((entry) => entry.spec)]] : [];
		}),
	);
}

const isProviderValue = (value: unknown): value is Provider<unknown, unknown, ProviderKind> =>
	isDataObject(value) && isDataObject(value.spec) && typeof value.spec.parameters === 'function';

/**
 * The fields of a contract config that hold contract providers, as provider specs by slot,
 * and the other fields as parameters. n8n connects a provider; it is no parameter.
 */
function splitProviders(fields: Readonly<Record<string, unknown>>): {
	parameters: Record<string, unknown>;
	providers: ProviderSpecs;
	unslotted: string[];
} {
	const entries = Object.entries(fields);
	const providersOf = (value: unknown) =>
		Array.isArray(value) && value.length > 0 && value.every(isProviderValue)
			? value
			: isProviderValue(value)
				? [value]
				: undefined;
	const held = entries.flatMap(([key, value]) => {
		const list = providersOf(value);
		return list ? list.map((provider) => ({ key, provider })) : [];
	});
	const heldKeys = new Set(held.map(({ key }) => key));
	const providers = held.reduce<ProviderSpecs>((specs, { provider }) => {
		if (provider.slot === undefined) return specs;
		return { ...specs, [provider.slot]: [...(specs[provider.slot] ?? []), provider.spec] };
	}, {});
	return {
		parameters: Object.fromEntries(entries.filter(([key]) => !heldKeys.has(key))),
		providers,
		unslotted: held.filter(({ provider }) => provider.slot === undefined).map(({ key }) => key),
	};
}

/**
 * The parameters and providers of a contract config. A derived root node takes its providers in
 * `providers`; a contract root node takes each in the input field of its slot.
 */
function splitConfig(fields: Readonly<Record<string, unknown>>, grouped?: ProvidersBySlot) {
	const split = splitProviders(fields);
	return grouped
		? { ...split, providers: { ...split.providers, ...providerSpecs(grouped) } }
		: split;
}

/** The resource and operation that select the action of a composed or derived node version. */
interface Selector {
	/** The `resource` parameter value. */
	readonly resource?: string;
	/** The `operation` parameter value. */
	readonly operation?: string;
}

const isProviderKind = (kind: string): kind is ProviderKind =>
	Object.hasOwn(PROVIDER_KIND_SLOTS, kind);
/** The legacy Manual Trigger node, which the native contract `manual.trigger` types. */
export const MANUAL_NODE = { type: 'n8n-nodes-base.manualTrigger', version: 1 };
/** The IF and Edit Fields contracts of `@n8n/nodes-base-next` (`condition.if`, `items.set`). */
export const BRANCH_NODE = { type: '@n8n/nodes-base-next.conditionIf', version: 1 };
export const SET_NODE = { type: '@n8n/nodes-base-next.itemsSet', version: 1 };
/** The node type prefix of the node contracts in `@n8n/nodes-base-next`. */
const CONTRACT_NODE_PREFIX = '@n8n/nodes-base-next.';

/** The IF contract parameters of `when` for the compiled JavaScript of its condition. */
export const branchParameters = (condition: string) => ({
	where: { conditions: [{ type: 'boolean', left: `={{ ${condition} }}`, test: { op: 'true' } }] },
});

/** The input fields that `set` keeps beside its own: none, all, or the given field paths only or all but. */
export type SetKeep =
	| 'none'
	| 'all'
	| {
			/** Keep only these input field paths. */
			readonly selected: readonly string[];
	  }
	| {
			/** Keep every input field but these paths. */
			readonly except: readonly string[];
	  };

/** A `set` field key: a field name or a dotted path. The node also reads `a[0]`, which `set` does not type. */
export const isFieldPath = (key: string) => key.split('.').every((part) => /^[^[\]]+$/.test(part));

/** The Edit Fields contract parameters of `set`: a lambda field holds `={{ js }}`. */
export const setParameters = (fields: Readonly<Record<string, unknown>>, keep: SetKeep) => ({
	fields,
	include:
		typeof keep === 'string'
			? { mode: keep }
			: 'selected' in keep
				? { mode: 'selected', fields: [...keep.selected] }
				: { mode: 'except', fields: [...keep.except] },
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
	// Fragments share their region objects. Two regions with one name stay, so the build reports them.
	const regions = new Set(graphs.flatMap((graph) => graph.regions ?? []));
	const groups = new Set(graphs.flatMap((graph) => graph.groups ?? []));
	const problems = new Set(graphs.flatMap((graph) => graph.problems ?? []));
	return {
		nodes: [...nodes.values()],
		edges: [...edges.values()],
		regions: [...regions],
		...(groups.size > 0 ? { groups: [...groups] } : {}),
		...(problems.size > 0 ? { problems: [...problems] } : {}),
	};
}

const wire = (tails: readonly Tail[], to: string, input = 0): Edge[] =>
	tails.map((tail) => ({ from: tail.node, output: tail.output, to, input }));

const attach = (graph: Graph, tails: readonly Tail[], spec: NodeSpec): Graph =>
	unionGraphs([graph, { nodes: [spec], edges: wire(tails, spec.name) }]);

const tail = (node: string, output: number): Tail[] => [{ node, output }];

const fromTail = (edge: Edge, open: Tail) => edge.from === open.node && edge.output === open.output;

// ── Regions ─────────────────────────────────────────────────────────────────
// Untyped builders, so decompile can replay a region without its item types.

/** The name of the node that `forEach` adds when its body starts with several nodes. */
const forEachStart = (region: string) => `${region} start`;

/**
 * @internal A `forEach` region: the engine runs `body` on each batch of the items at the open
 * ends, then emits the body output of all batches once, on the open ends of the body. A region
 * takes its items at one node, so a body that starts with branches gets a No Operation node
 * before them.
 */
export function forEachFragment(
	from: Fragment,
	name: string,
	batchSize: number,
	body: (each: Fragment) => Fragment,
): Fragment {
	const before = new Set(from.graph.nodes.map((spec) => spec.name));
	const entriesOf = (built: Fragment) => [
		...new Set(
			built.graph.edges
				.filter((edge) => !before.has(edge.to) && from.tails.some((open) => fromTail(edge, open)))
				.map((edge) => edge.to),
		),
	];
	const direct = body(from);
	const start: NodeSpec = { name: forEachStart(name), ...NO_OP_NODE, parameters: () => ({}) };
	const inner =
		entriesOf(direct).length > 1
			? body({ graph: attach(from.graph, from.tails, start), tails: tail(start.name, 0) })
			: direct;
	const members = inner.graph.nodes.map((spec) => spec.name).filter((node) => !before.has(node));
	const entries = entriesOf(inner);
	const problems = [
		...(Number.isInteger(batchSize) && batchSize >= 1
			? []
			: [`batchSize must be a whole number of at least 1, not ${batchSize}`]),
		...(members.length === 0 ? ['forEach needs a body that runs a node'] : []),
		...(entries.length > 1
			? [`forEach needs a body that starts with one node, not ${quoted(entries)}`]
			: []),
	];
	const region: RegionSpec = {
		name,
		batchSize,
		members,
		entry: entries[0] ?? '',
		exits: inner.tails,
		problems,
	};
	return {
		graph: { ...inner.graph, regions: [...(inner.graph.regions ?? []), region] },
		tails: inner.tails,
	};
}

/** @internal A canvas group of the nodes that `body` adds. The run is the run of `body`. */
export function groupFragment(
	from: Fragment,
	name: string,
	description: string | undefined,
	body: (flow: Fragment) => Fragment,
): Fragment {
	const before = new Set(from.graph.nodes.map((spec) => spec.name));
	const inner = body(from);
	const members = inner.graph.nodes.map((spec) => spec.name).filter((node) => !before.has(node));
	const group: GroupSpec = { name, ...(description ? { description } : {}), members };
	return {
		graph: { ...inner.graph, groups: [...(inner.graph.groups ?? []), group] },
		tails: inner.tails,
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
	/** At `maxIterations`: fail the run (default), or end as if `until` held. */
	readonly onLimit?: LoopLimit;
}

/**
 * @internal A while loop in node contracts: head (loop state) → body → check (Switch) → next
 * (loop state) → [wait] → head. At `maxIterations` the check fails the run (Stop and Error),
 * or with `onLimit: 'continue'` ends the loop as `until` does.
 */
export function loopFragment(
	from: Fragment,
	options: LoopOptions,
	body: (pass: Fragment) => Fragment,
): Fragment {
	const { name, maxIterations, wait, onLimit = 'fail' } = options;
	const again = checkAgain(onLimit);
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
		outputs: again + 1,
		parameters: (compiler) => {
			if (!Number.isInteger(maxIterations) || maxIterations < 1) {
				compiler.issue(`The pass limit must be a whole number of at least 1, not ${maxIterations}`);
			}
			if (inner.tails.some(({ node }) => node === name)) {
				compiler.issue(`${name} needs a body that runs a node`);
			}
			return loopCheckParameters(name, options.until(compiler), maxIterations, onLimit);
		},
	};
	const limit: NodeSpec = {
		name: names.limit,
		...STOP_NODE,
		parameters: () => loopLimitParameters(name, maxIterations),
	};
	const fails = onLimit === 'fail';
	const parts: Graph[] = [
		attach(inner.graph, inner.tails, check),
		{
			nodes: [
				...(fails ? [limit] : []),
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
				...(fails ? wire(tail(names.check, CHECK_LIMIT), names.limit) : []),
				...wire(tail(names.check, again), names.next),
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
		parameters: () => router.parameters,
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

/** @internal The Filter contract node of `filter`: it keeps the items a condition holds for. */
export const filterSpec = (name: string, condition: (compiler: Compiler) => string): NodeSpec => ({
	name,
	...FILTER_NODE,
	// The Filter contract sends the other items to its second output, which stays open.
	outputs: 2,
	parameters: (compiler) => filterParameters(condition(compiler)),
});

/** @internal Run every branch on the same items and join them in one Merge node, input by branch. */
export function mergeFragment(
	from: Fragment,
	name: string,
	join: MergeJoin,
	branches: ReadonlyArray<(flow: Fragment) => Fragment>,
): Fragment {
	const joined = branches.map((branch) => branch(from));
	const inputs = branches.length;
	const spec: NodeSpec = {
		name,
		...mergeNodeOf(join),
		parameters: (compiler) => {
			if (inputs < 2 || inputs > MERGE_MAX_INPUTS) {
				compiler.issue(`merge takes 2 to ${MERGE_MAX_INPUTS} branches, not ${inputs}`);
			} else if (typeof join === 'object' && inputs > 2) {
				compiler.issue(
					`merge by matching fields takes 2 branches, not ${inputs}. Use join "append" or "position", or merge twice`,
				);
			}
			return mergeParameters(join, inputs);
		},
	};
	const edges = joined.flatMap((flow, input) => wire(flow.tails, name, input));
	return {
		graph: unionGraphs([from.graph, ...joined.map((flow) => flow.graph), { nodes: [spec], edges }]),
		tails: tail(name, 0),
	};
}

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
					`${name}: items on ${quoted(missing)} stop. Give each output but the last a part in route`,
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

/** Keys of `Item` whose value is a string, so `switchOn` can route on them. */
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

// ── Parts ───────────────────────────────────────────────────────────────────

/** Any part, as the builders take it. A part keeps its item types for tsc only. */
type AnyPart = Part<never, never, unknown, unknown>;
type AnyRegion = Region<never, never, unknown, unknown>;

const isStep = (part: AnyPart): part is Step<never, unknown, unknown, string> => 'spec' in part;
const isRegion = (part: AnyPart): part is AnyRegion => 'region' in part;

/** @internal Run `step` on every item at the open ends. A trigger starts a new flow. */
export function stepFragment(
	from: Fragment,
	step: { readonly name: string; readonly spec: NodeSpec },
): Fragment {
	if (step.spec.trigger) {
		return {
			graph: unionGraphs([from.graph, { nodes: [step.spec], edges: [] }]),
			tails: tail(step.name, 0),
		};
	}
	const outputs = isRouted(step) ? step.outputs : [];
	const dropped = outputs.slice(1, -1);
	const spec: NodeSpec = dropped.length
		? {
				...step.spec,
				parameters: (compiler) => {
					compiler.issue(
						`${step.name}: only output "${outputs[0] ?? ''}" continues, so items on ${quoted(dropped)} stop. Use route(step, { … }) to give each output a part`,
					);
					return step.spec.parameters(compiler);
				},
			}
		: step.spec;
	return { graph: attach(from.graph, from.tails, spec), tails: tail(step.name, 0) };
}

// A plain JavaScript caller, or a source that tsc rejects, can pass an array or a lambda.
const notAPart = (part: unknown) =>
	Array.isArray(part)
		? 'A branch or a body takes one part, not an array: put several parts in steps(a, b)'
		: 'A branch or a body takes one part: a step, a macro, or steps(a, b)';

/** @internal The fragment of one position after `from`. */
export const partFragment = (from: Fragment, part: AnyPart): Fragment =>
	isStep(part)
		? stepFragment(from, part)
		: isRegion(part)
			? part.region(from)
			: {
					graph: unionGraphs([from.graph, { nodes: [], edges: [], problems: [notAPart(part)] }]),
					tails: from.tails,
				};

/** @internal An empty graph: the build starts here. */
export const EMPTY_FRAGMENT: Fragment = { graph: { nodes: [], edges: [] }, tails: [] };

const region = (build: (from: Fragment) => Fragment): AnyRegion => ({ region: build });

const given = (parts: ReadonlyArray<AnyPart | undefined>) =>
	parts.filter((part): part is AnyPart => part !== undefined);

/** The fragment of a part that takes the open ends of `from`. */
const run = (part: AnyPart) => (from: Fragment) => partFragment(from, part);

/**
 * @internal Route each item by a condition (an IF node): output 0 is "true" and output 1 is
 * "false", as the IF contract names them. Without `otherwise`, false items stop.
 */
export function branchFragment(
	from: Fragment,
	name: string,
	condition: (compiler: Compiler) => string,
	then: (flow: Fragment) => Fragment,
	otherwise?: (flow: Fragment) => Fragment,
): Fragment {
	const spec: NodeSpec = {
		name,
		...BRANCH_NODE,
		outputs: 2,
		parameters: (compiler) => branchParameters(condition(compiler)),
	};
	const graph = attach(from.graph, from.tails, spec);
	const onTrue = then({ graph, tails: tail(name, 0) });
	const onFalse = otherwise?.({ graph, tails: tail(name, 1) });
	return {
		graph: unionGraphs([onTrue.graph, ...(onFalse ? [onFalse.graph] : [])]),
		tails: [...onTrue.tails, ...(onFalse?.tails ?? [])],
	};
}

/**
 * Route each item by a condition (an IF node). Items where `if` is true go to `then`, the rest
 * to `else`. Without `else`, false items stop. The open ends of both branches continue.
 *
 * @example
 * ```ts
 * when({ name: 'Paid?', if: (order) => order.total > 0 }, {
 *   then: set({ name: 'Paid', fields: { paid: true } }),
 *   else: set({ name: 'Free', fields: { paid: false } }),
 * }),
 * ```
 */
export function when<In, Ctx, const N extends string, A, B = never>(
	config: {
		/** The node name, unique in the workflow. */
		name: N;
		/** The condition for each item. */
		if: (item: In, $: Dollar<Ctx>) => boolean;
	},
	branches: {
		/** The part for the items where `if` is true. */
		then: Part<NoInfer<In>, NoInfer<Ctx & Record<N, In>>, A, unknown>;
		/** The part for the other items. Without it, they stop. */
		else?: Part<NoInfer<In>, NoInfer<Ctx & Record<N, In>>, B, unknown>;
	},
): Region<In, Ctx, A | B, Ctx & Record<N, In>>;
export function when(
	config: { name: string; if: (...args: never[]) => boolean },
	// A plain JavaScript caller can leave out `then`.
	branches: { then?: AnyPart; else?: AnyPart },
): AnyRegion {
	const { name, if: condition } = config;
	const { then, else: otherwise } = branches;
	return region((from) =>
		branchFragment(
			from,
			name,
			(compiler) => {
				if (!then) {
					compiler.issue(
						`when "${name}" needs a then part. To act on the false items only, negate the condition and pass that part as then`,
					);
				}
				return compiler.js(condition);
			},
			then ? run(then) : (flow) => flow,
			otherwise ? run(otherwise) : undefined,
		),
	);
}

/**
 * One part per output name of a routed step; each reads the step output. A key that is no
 * output name is `never`.
 */
export type RouteParts<R, Names extends string, Out, Ctx> = {
	readonly [K in keyof R]: K extends Names
		? Part<NoInfer<Out>, NoInfer<Ctx>, R[K], unknown>
		: never;
};

/**
 * Run a step with named outputs, e.g. `dataTable.row.exists`, `ai.classify` or a Switch, and
 * continue from each output with its own part. Every output but the last needs a part. The
 * last output is the "no" path (false, missing, other): without a part its items stop.
 *
 * @example
 * ```ts
 * route(node({ name: 'Big?', type: 'n8n-nodes-base.if', version: 2.2, outputs: ['true', 'false'] }), {
 *   true: set({ name: 'Big', fields: { big: true } }),
 * }),
 * ```
 */
export function route<In, Ctx, Out, const N extends string, Names extends string, R>(
	step: RoutedStep<In, Ctx, Out, N, Names>,
	routes: RouteParts<R, Names, Out, Ctx & Record<N, Out>>,
): Region<In, Ctx, R[keyof R], Ctx & Record<N, Out>>;
export function route(
	step: RoutedStep<never, unknown, unknown, string, string>,
	routes: Readonly<Record<string, AnyPart | undefined>>,
): AnyRegion {
	const parts = new Map(
		Object.entries(routes).flatMap(([key, part]) => (part ? [[key, part]] : [])),
	);
	return region((from) =>
		routeFragment(
			from,
			step,
			(output, flow) => {
				const part = parts.get(output);
				return part ? partFragment(flow, part) : undefined;
			},
			[...parts.keys()],
		),
	);
}

/**
 * One part per case of `switchOn`: each reads the items of its case, with `F` narrowed. The
 * part `fallback` takes the items of no case. A literal union field needs a part for each
 * value; a plain `string` field needs `fallback`.
 */
export type SwitchParts<In, Ctx, F extends keyof In, R> = {
	readonly [K in keyof R]: K extends typeof FALLBACK_OUTPUT
		? Part<NoInfer<In>, NoInfer<Ctx>, R[K], unknown>
		: string extends In[F]
			? Part<NoInfer<In>, NoInfer<Ctx>, R[K], unknown>
			: K extends In[F]
				? Part<NoInfer<CaseItem<In, F, K>>, NoInfer<Ctx>, R[K], unknown>
				: never;
	// A mapped type, not a conditional object: tsc then still types the parts in `cases`.
} & { readonly [K in NeededCases<In, F>]: object };

/** The cases that `switchOn` needs: each value of a literal union, or `fallback` for a string. */
type NeededCases<In, F extends keyof In> = string extends In[F]
	? typeof FALLBACK_OUTPUT
	: In[F] & string;

/**
 * Route each item by the string field `on` (a Switch node). Each case gets the items of its
 * value, with the item type narrowed; `fallback` gets the items of no case. The open ends of
 * all cases continue.
 *
 * @example
 * ```ts
 * switchOn({ name: 'By kind', on: 'kind' }, {
 *   bug: set({ name: 'Bug', fields: { urgent: true } }),
 *   fallback: set({ name: 'Other', fields: { urgent: false } }),
 * }),
 * ```
 */
export function switchOn<In, Ctx, const N extends string, const F extends CaseField<In>, R>(
	config: {
		/** The node name, unique in the workflow. */
		name: N;
		/** The string field whose value picks the case. */
		on: F;
	},
	cases: SwitchParts<In, Ctx & Record<N, In>, F, R>,
): Region<In, Ctx, R[keyof R], Ctx & Record<N, In>>;
export function switchOn(
	config: { name: string; on: string },
	cases: Readonly<Record<string, AnyPart | undefined>>,
): AnyRegion {
	const { name, on } = config;
	const parts = Object.entries(cases).flatMap(([key, part]) =>
		part ? [[key, part] as const] : [],
	);
	const fallback = parts.find(([key]) => key === FALLBACK_OUTPUT)?.[1];
	const entries = parts
		.filter(([key]) => key !== FALLBACK_OUTPUT)
		.map(([key, part]) => [key, run(part)] as const);
	return region((from) =>
		switchFragment(from, name, on, entries, fallback ? run(fallback) : undefined),
	);
}

/**
 * Run `body` on batches of `batchSize` items, one batch after the other. The engine repeats
 * the body: `name` is a region, not a node, and `$(name)` reads the batch item in the body
 * and the emitted item after it. Afterwards the flow continues once with all body output.
 * Items that the body drops, e.g. with `filter`, do not stop the next batch. Use it only to
 * pace work, for example for a rate limit: every node already runs once for each item.
 */
export function forEach<In, Ctx, const N extends string, B>(
	config: {
		/** The region name, unique among nodes and regions. */
		name: N;
		/** The items of one batch. */
		batchSize: number;
	},
	body: Part<NoInfer<In>, NoInfer<Ctx & Record<N, In>>, B, unknown>,
): Region<In, Ctx, B, Ctx & Record<N, B>>;
export function forEach(config: { name: string; batchSize: number }, body: AnyPart): AnyRegion {
	const { name, batchSize } = config;
	return region((from) => forEachFragment(from, name, batchSize, run(body)));
}

/**
 * Without `next`, the next pass reads the body output, so `next` is needed when the body output
 * does not fit the loop input.
 */
type NextNeeded<In, B, CB, S> = [S] extends [never]
	? [B] extends [In]
		? unknown
		: {
				/** The state of the next pass, from the body output. */
				next: (out: B, $: Dollar<CB>) => In;
			}
	: unknown;

/** The config of `loop` besides `next`. */
interface LoopConfig<N extends string, B, CB> {
	/** The node name, unique in the workflow. */
	name: N;
	/** The most passes. After them the run fails, or the loop ends with `onLimit: 'continue'`. */
	maxIterations: number;
	/**
	 * After `maxIterations` passes: `fail` fails the run (default); `continue` ends the loop and
	 * emits the last pass, as if `until` held, e.g. for "at most 10 levels deep".
	 */
	onLimit?: LoopLimit;
	/** True when the loop ends, from the body output. */
	until: (out: B, $: Dollar<CB>) => boolean;
}

/**
 * Run `body` again until `until` holds. Each item is the loop state: `next` makes the state
 * of the next pass from the body output; without `next` the body output is the next state.
 * After `maxIterations` passes the run fails, or with `onLimit: 'continue'` the loop ends.
 * The flow continues with the output of the pass that met `until`.
 *
 * @example
 * ```ts
 * loop(
 *   { name: 'Count', maxIterations: 10, until: (out) => out.n >= 3, next: (out) => ({ n: out.n }) },
 *   set({ name: 'Add', fields: { n: (s) => s.n + 1 } }),
 * ),
 * ```
 */
export function loop<In, Ctx, const N extends string, B, CB, S extends In = never>(
	config: LoopConfig<N, B, CB> & {
		/** The state of the next pass, from the body output. Default: the body output. */
		next?: (out: B, $: Dollar<CB>) => S;
	} & NextNeeded<NoInfer<In>, B, CB, S>,
	body: Part<NoInfer<In>, NoInfer<Ctx & Record<N, In>>, B, CB>,
): Region<In, Ctx, B, Ctx & Record<N, In>>;
export function loop(
	config: {
		name: string;
		maxIterations: number;
		onLimit?: LoopLimit;
		until: unknown;
		next?: unknown;
	},
	body: AnyPart,
): AnyRegion {
	const { name, maxIterations, onLimit, until, next } = config;
	const options: LoopOptions = {
		name,
		maxIterations,
		emit: 'last',
		onLimit,
		until: (compiler) => compiler.js(until),
		next: (compiler) => (next === undefined ? BODY_OUTPUT : compiler.js(next)),
	};
	return region((from) => loopFragment(from, options, run(body)));
}

/**
 * Request pages until `next` gives `null`; each item is the cursor state of one page. Every
 * page continues as it arrives. Prefer the pagination of the node when it has one. In
 * execution order v1 the pages can continue last page first: v1 runs the node more to the
 * top left first.
 *
 * @example
 * ```ts
 * paginate(
 *   { name: 'Pages', maxPages: 10, next: (page) => (page.next === null ? null : { cursor: page.next }) },
 *   fetchPage,
 * ),
 * ```
 */
export function paginate<In, Ctx, const N extends string, B, CB, S extends In>(
	config: {
		/** The node name, unique in the workflow. */
		name: N;
		/** The most pages. The run fails after them. */
		maxPages: number;
		/** The cursor state of the next page, or `null` after the last page. */
		next: (response: B, $: Dollar<CB>) => S | null;
	},
	request: Part<NoInfer<In>, NoInfer<Ctx & Record<N, In>>, B, CB>,
): Region<In, Ctx, B, Ctx & Record<N, In>>;
export function paginate(
	config: { name: string; maxPages: number; next: unknown },
	request: AnyPart,
): AnyRegion {
	const { name, maxPages, next } = config;
	const options: LoopOptions = {
		name,
		maxIterations: maxPages,
		emit: 'each',
		until: (compiler) => noNextPage(compiler.js(next)),
		next: (compiler) => compiler.js(next),
	};
	return region((from) => loopFragment(from, options, run(request)));
}

/**
 * Run `attempt` until `until` holds, with a wait of `every` between attempts. The run fails
 * after `maxAttempts`. The flow continues with the output of the attempt that met `until`.
 *
 * @example
 * ```ts
 * pollUntil(
 *   { name: 'Poll', maxAttempts: 5, every: { amount: 30, unit: 'seconds' }, until: (job) => job.done },
 *   getStatus,
 * ),
 * ```
 */
export function pollUntil<In, Ctx, const N extends string, B, CB>(
	config: {
		/** The node name, unique in the workflow. */
		name: N;
		/** The most attempts. The run fails after them. */
		maxAttempts: number;
		/** The wait between attempts. */
		every: Interval;
		/** True when the attempt output is the result. */
		until: (out: B, $: Dollar<CB>) => boolean;
	},
	attempt: Part<NoInfer<In>, NoInfer<Ctx & Record<N, In>>, B, CB>,
): Region<In, Ctx, B, Ctx & Record<N, In>>;
export function pollUntil(
	config: { name: string; maxAttempts: number; every: Interval; until: unknown },
	attempt: AnyPart,
): AnyRegion {
	const { name, maxAttempts, every, until } = config;
	const options: LoopOptions = {
		name,
		maxIterations: maxAttempts,
		emit: 'last',
		wait: every,
		until: (compiler) => compiler.js(until),
		next: () => samePass(name),
	};
	return region((from) => loopFragment(from, options, run(attempt)));
}

/** Keep the items `if` holds for (a Filter node). A type guard narrows the item type. */
export function filter<In, Ctx, const N extends string, T extends In>(config: {
	/** The node name, unique in the workflow. */
	name: N;
	/** A type guard: the items it holds for continue, with the narrowed type. */
	if: (item: In, $: Dollar<Ctx>) => item is T;
}): Step<In, Ctx, T, N>;
/** Keep the items `if` holds for (a Filter node). */
export function filter<In, Ctx, const N extends string>(config: {
	/** The node name, unique in the workflow. */
	name: N;
	/** The condition for each item. */
	if: (item: In, $: Dollar<Ctx>) => boolean;
}): Step<In, Ctx, In, N>;
export function filter(config: {
	name: string;
	if: (...args: never[]) => boolean;
}): Step<never, unknown, unknown, string> {
	const { name } = config;
	const condition = config.if;
	return { name, spec: filterSpec(name, (compiler) => compiler.js(condition)) };
}

/** The items of all branches as one intersection. */
type AllOf<T extends readonly unknown[]> = T extends readonly [infer H, ...infer R]
	? H & AllOf<R>
	: unknown;

/** The item after `merge`: any branch item for `append`, else the joined item. */
type Joined<J, T extends readonly unknown[]> = J extends 'append' ? T[number] : AllOf<T>;

/**
 * Run 2 to 10 branches on the same items and join them (a Merge node). `append` emits the
 * items of all; `position` joins item i of each; `{ left, right }` joins the items of two
 * branches whose fields match.
 *
 * @example
 * ```ts
 * merge({ name: 'Join', join: { left: 'id', right: 'id' } }, [
 *   set({ name: 'Names', fields: { id: (c) => c.id, name: (c) => c.name } }),
 *   set({ name: 'Counts', fields: { id: (c) => c.id, count: (c) => c.orders.length } }),
 * ]),
 * ```
 */
export function merge<
	In,
	Ctx,
	const N extends string,
	T extends readonly [unknown, unknown, ...unknown[]],
	const J extends
		| 'append'
		| 'position'
		| (T extends readonly [infer A, infer B]
				? {
						/** The field of the first branch item. */
						left: keyof A & string;
						/** The field of the second branch item that must match `left`. */
						right: keyof B & string;
					}
				: never),
>(
	config: {
		/** The node name, unique in the workflow. */
		name: N;
		/** How the branches join: `append`, `position`, or matching fields of 2 branches. */
		join: J;
	},
	branches: { readonly [K in keyof T]: Part<NoInfer<In>, NoInfer<Ctx>, T[K], unknown> },
): Region<In, Ctx, Joined<J, T>, Ctx & Record<N, Joined<J, T>>>;
export function merge(
	config: { name: string; join: MergeJoin },
	branches: readonly AnyPart[],
): AnyRegion {
	const { name, join } = config;
	return region((from) => mergeFragment(from, name, join, branches.map(run)));
}

/**
 * Frame the nodes of `body` as one group on the canvas, for example one stage of the
 * workflow. The run does not change: the flow after the group continues from `body`, and
 * `$()` reads each node in it. With every group collapsed, aim for 7 boxes or fewer.
 *
 * @example
 * ```ts
 * group(
 *   { name: 'Enrich', description: 'Looks up each lead and scores it' },
 *   steps(lookUp, score),
 * ),
 * ```
 */
export function group<In, Ctx, B, CB>(
	config: {
		/** The group name, unique among groups and `forEach` regions. */
		name: string;
		/** The text the canvas shows when the group is collapsed, up to 145 characters. */
		description?: string;
	},
	body: Part<NoInfer<In>, NoInfer<Ctx>, B, CB>,
): Region<In, Ctx, B, CB>;
export function group(config: { name: string; description?: string }, body: AnyPart): AnyRegion {
	const { name, description } = config;
	return region((from) => groupFragment(from, name, description, run(body)));
}

/**
 * Handle items the step before fails on (its error output). The error branch ends with
 * `handle`: only the items the step could process continue. Use `recover` to continue with
 * the items of `handle` too.
 */
export function onError<In, Ctx>(
	handle: Part<ErrorItem, NoInfer<Ctx>, unknown, unknown>,
): Region<In, Ctx, In, Ctx>;
export function onError(handle: AnyPart): AnyRegion {
	return region((from) => errorFragment(from, run(handle), false));
}

/**
 * Handle items the step before fails on (its error output), and continue with them: the open
 * ends of `handle` join the items the step could process.
 *
 * @example
 * ```ts
 * fetchOrders,
 * recover(set({ name: 'Log', fields: { failed: (item) => item.error } })),
 * ```
 */
export function recover<In, Ctx, A>(
	handle: Part<ErrorItem, NoInfer<Ctx>, A, unknown>,
): Region<In, Ctx, In | A, Ctx>;
export function recover(handle: AnyPart): AnyRegion {
	return region((from) => errorFragment(from, run(handle), true));
}

declare const none: unique symbol;
/** A position that `steps(…)` was not given. */
type None = typeof none;

/** The item and the node names after the last given position. */
type LastOf<T extends ReadonlyArray<readonly [unknown, unknown]>> = T extends readonly [
	...infer R extends ReadonlyArray<readonly [unknown, unknown]>,
	infer L extends readonly [unknown, unknown],
]
	? [L[0]] extends [None]
		? LastOf<R>
		: L
	: never;

/**
 * Several parts in a row, where a macro takes one part, e.g. a branch of `when`: each part
 * reads the items of the part before. Without parts, the items pass on unchanged.
 */
// Each position is its own parameter: tsc infers the item of a position from the positions
// before it only across parameters, not across the elements of one array.
export function steps<
	I0,
	C0,
	I1 = None,
	C1 = None,
	I2 = None,
	C2 = None,
	I3 = None,
	C3 = None,
	I4 = None,
	C4 = None,
	I5 = None,
	C5 = None,
	I6 = None,
	C6 = None,
	I7 = None,
	C7 = None,
	I8 = None,
	C8 = None,
	I9 = None,
	C9 = None,
	I10 = None,
	C10 = None,
	I11 = None,
	C11 = None,
	I12 = None,
	C12 = None,
	I13 = None,
	C13 = None,
	I14 = None,
	C14 = None,
	I15 = None,
	C15 = None,
	I16 = None,
	C16 = None,
	I17 = None,
	C17 = None,
	I18 = None,
	C18 = None,
	I19 = None,
	C19 = None,
	I20 = None,
	C20 = None,
>(
	s1?: Part<NoInfer<I0>, NoInfer<C0>, I1, C1>,
	s2?: Part<NoInfer<I1>, NoInfer<C1>, I2, C2>,
	s3?: Part<NoInfer<I2>, NoInfer<C2>, I3, C3>,
	s4?: Part<NoInfer<I3>, NoInfer<C3>, I4, C4>,
	s5?: Part<NoInfer<I4>, NoInfer<C4>, I5, C5>,
	s6?: Part<NoInfer<I5>, NoInfer<C5>, I6, C6>,
	s7?: Part<NoInfer<I6>, NoInfer<C6>, I7, C7>,
	s8?: Part<NoInfer<I7>, NoInfer<C7>, I8, C8>,
	s9?: Part<NoInfer<I8>, NoInfer<C8>, I9, C9>,
	s10?: Part<NoInfer<I9>, NoInfer<C9>, I10, C10>,
	s11?: Part<NoInfer<I10>, NoInfer<C10>, I11, C11>,
	s12?: Part<NoInfer<I11>, NoInfer<C11>, I12, C12>,
	s13?: Part<NoInfer<I12>, NoInfer<C12>, I13, C13>,
	s14?: Part<NoInfer<I13>, NoInfer<C13>, I14, C14>,
	s15?: Part<NoInfer<I14>, NoInfer<C14>, I15, C15>,
	s16?: Part<NoInfer<I15>, NoInfer<C15>, I16, C16>,
	s17?: Part<NoInfer<I16>, NoInfer<C16>, I17, C17>,
	s18?: Part<NoInfer<I17>, NoInfer<C17>, I18, C18>,
	s19?: Part<NoInfer<I18>, NoInfer<C18>, I19, C19>,
	s20?: Part<NoInfer<I19>, NoInfer<C19>, I20, C20>,
): Region<
	I0,
	C0,
	LastOf<
		[
			[I0, C0],
			[I1, C1],
			[I2, C2],
			[I3, C3],
			[I4, C4],
			[I5, C5],
			[I6, C6],
			[I7, C7],
			[I8, C8],
			[I9, C9],
			[I10, C10],
			[I11, C11],
			[I12, C12],
			[I13, C13],
			[I14, C14],
			[I15, C15],
			[I16, C16],
			[I17, C17],
			[I18, C18],
			[I19, C19],
			[I20, C20],
		]
	>[0],
	LastOf<
		[
			[I0, C0],
			[I1, C1],
			[I2, C2],
			[I3, C3],
			[I4, C4],
			[I5, C5],
			[I6, C6],
			[I7, C7],
			[I8, C8],
			[I9, C9],
			[I10, C10],
			[I11, C11],
			[I12, C12],
			[I13, C13],
			[I14, C14],
			[I15, C15],
			[I16, C16],
			[I17, C17],
			[I18, C18],
			[I19, C19],
			[I20, C20],
		]
	>[1]
>;
export function steps(...parts: ReadonlyArray<AnyPart | undefined>): AnyRegion {
	return region((from) => given(parts).reduce(partFragment, from));
}

/**
 * @internal The last nodes of `from` emit failed items on their error output into `handle`.
 * `rejoins`: the open ends of `handle` join the open ends of `from` (`recover`), else the
 * error branch ends there (`onError`).
 */
export function errorFragment(
	from: Fragment,
	handle: (flow: Fragment) => Fragment,
	rejoins: boolean,
): Fragment {
	const failing = new Set(from.tails.map((each) => each.node));
	const nodes = from.graph.nodes.map((spec) =>
		failing.has(spec.name) ? { ...spec, onError: 'continueErrorOutput' as const } : spec,
	);
	const errorTails = nodes
		.filter((spec) => failing.has(spec.name))
		.map((spec) => ({ node: spec.name, output: spec.outputs ?? 1 }));
	// A failing node stays in its group.
	const marked: Graph = { ...from.graph, nodes };
	const handled = handle({ graph: marked, tails: errorTails });
	const before = new Set(nodes.map((spec) => spec.name));
	const added = handled.graph.nodes.map((spec) => spec.name).filter((name) => !before.has(name));
	const tails = rejoins ? [...from.tails, ...handled.tails] : from.tails;
	const graph = unionGraphs([marked, handled.graph]);
	// A region emits only on its exits, so the error branch of a failing member runs in the
	// region, and a branch that rejoins leaves it on new exits.
	const inRegion = (region: RegionSpec): RegionSpec =>
		region.members.some((member) => failing.has(member))
			? {
					...region,
					members: [...region.members, ...added],
					exits: rejoins ? [...region.exits, ...handled.tails] : region.exits,
				}
			: region;
	return { graph: { ...graph, regions: (graph.regions ?? []).map(inRegion) }, tails };
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

type AnyKeys<O> = { [K in keyof O]-?: 0 extends 1 & O[K] ? K : never }[keyof O];

/**
 * Output `O` with the fields of a sample `S` that fits it: `O & S`. A field of `O` typed `any`
 * takes the type of the sample, because `any & S` stays `any`. A field that the sample leaves
 * out keeps its type in `O`. `S` is `never` when there is no sample.
 */
export type Sampled<O, S> = [S] extends [never]
	? O
	: O extends unknown
		? [AnyKeys<O> & keyof S] extends [never]
			? O & S
			: Omit<O, AnyKeys<O> & keyof S> & S
		: never;

/** The lambda of a binary field. It compiles to the key of a binary of the input item. */
class BinaryKey {
	constructor(readonly fn: (...args: never[]) => unknown) {}
}

/** `value` with the lambda at `path` marked as a binary key. `*` is each entry of a list or a record. */
function markBinaryKey(value: unknown, path: readonly string[]): unknown {
	const [head, ...rest] = path;
	if (head === undefined) return isLambda(value) ? new BinaryKey(value) : value;
	if (head === '*' && Array.isArray(value)) return value.map((entry) => markBinaryKey(entry, rest));
	if (!isDataObject(value)) return value;
	if (head === '*') {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, markBinaryKey(entry, rest)]),
		);
	}
	return head in value ? { ...value, [head]: markBinaryKey(value[head], rest) } : value;
}

/**
 * `config` with the lambda of each binary field marked, so the build compiles
 * `(item) => item.binary.data` to `data`. Generated node modules call this with the paths of
 * the binary fields of an action input.
 */
export function binaryKeys<C extends object>(
	config: C,
	paths: ReadonlyArray<readonly string[]>,
): C & Record<string, unknown> {
	const marked = paths.reduce<unknown>(markBinaryKey, { ...config });
	return { ...config, ...(isDataObject(marked) ? marked : {}) };
}

/**
 * A node from an action contract. Generated node modules call this; the build compiles the
 * contract parameters to the underlying node type, version, and parameters.
 */
export function contractStep<In, Ctx, Out, N extends string>(
	id: string,
	// The generated module types `sample`; `Out` comes from its declared return type.
	config: {
		/** The node name, unique in the workflow. */
		readonly name: N;
		/** Sample output items, for verification. */
		readonly sample?: readonly unknown[];
		/** Node settings. */
		readonly settings?: NodeSettings;
		/** The providers of a derived root node, by slot. */
		readonly providers?: ProvidersBySlot;
	},
	/** The node version: the action major, or the version of a composed or derived node. */
	version = 1,
	slot?: Selector,
	requires?: Requires,
	/** Set on the reply step of a native trigger. */
	pairing?: Pairing,
	/** The paths of the fields whose lambdas read each response page, e.g. `[['pages', 'next']]`. */
	pageFields: ReadonlyArray<readonly string[]> = [],
): Step<In, Ctx, Out, N> {
	const { name, sample, settings, providers: grouped, ...fields } = config;
	const { parameters, providers, unslotted } = splitConfig(fields, grouped);
	return {
		name,
		spec: {
			name,
			type: id,
			version,
			sample,
			...(id.startsWith(CONTRACT_NODE_PREFIX) ? { pinsSample: true } : {}),
			...(settings ? { settings } : {}),
			...(requires ? { requires } : {}),
			...(Object.keys(providers).length > 0 ? { providers } : {}),
			...(pairing ? { pairing } : {}),
			parameters: (compiler) => {
				unslotted.forEach((key) =>
					compiler.issue(`${key} takes a contract provider of its module, not provider()`),
				);
				modelFieldIssues(compiler, parameters);
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
 * A provider, e.g. a chat model. Generated node modules call this. A contract root node takes a
 * contract provider in the input field of its kind; a derived root node takes a derived provider
 * in the `providers` slot of its connection type.
 */
export function contractProvider<In, Ctx, const K extends ProviderKind | ProviderConnection>(
	id: string,
	kind: K,
	config: {
		/** The node name, unique in the workflow. */
		readonly name: string;
		/** Node settings. */
		readonly settings?: NodeSettings;
		/** The providers of this provider, by slot. */
		readonly providers?: ProvidersBySlot;
	},
	version = 1,
	selector?: Selector,
): Provider<In, Ctx, K> {
	const { name, settings, providers: grouped, ...fields } = config;
	const { parameters, providers, unslotted } = splitConfig(fields, grouped);
	return {
		slot: isProviderKind(kind) ? PROVIDER_KIND_SLOTS[kind] : SLOT_OF_CONNECTION.get(kind),
		spec: {
			name,
			type: id,
			version,
			...(settings ? { settings } : {}),
			...(Object.keys(providers).length > 0 ? { providers } : {}),
			parameters: (compiler) => {
				unslotted.forEach((key) =>
					compiler.issue(`${key} takes a contract provider of its module, not provider()`),
				);
				modelFieldIssues(compiler, parameters);
				const compiled = compiler.value(parameters);
				return { ...(isDataObject(compiled) ? compiled : {}), ...selector };
			},
		},
	};
}

const FROM_MODEL: unique symbol = Symbol('fromModel');

/** A tool field that the model fills, see `fromModel()`. */
export interface FromModel {
	/** The description for the model. */
	readonly [FROM_MODEL]: string;
}

/**
 * A field of an agent tool that the model fills when it calls the tool. The workflow fixes the
 * other fields, so the model cannot change them. `description` tells the model what to give;
 * without it, the model reads the description of the field.
 *
 * @example
 * ```ts
 * providers: { tools: [httpRequest.getTool({ name: 'Fetch', url: fromModel('The page URL') })] },
 * ```
 */
export const fromModel = (description = ''): FromModel => ({ [FROM_MODEL]: description });

const isFromModel = (value: unknown): value is FromModel =>
	isDataObject(value) && FROM_MODEL in value;

/** A step or a provider is no tool, so the model fills none of its fields. */
function modelFieldIssues(compiler: Compiler, parameters: Readonly<Record<string, unknown>>) {
	Object.entries(parameters)
		.filter(([, value]) => isFromModel(value))
		.forEach(([key]) => compiler.issue(`${key}: fromModel() fills a field of a tool only`));
}

/** The marker that the editor adds to a field the model fills, so it shows that field so. */
const FROM_AI_MARKER = '/*n8n-auto-generated-fromAI-override*/';

const QUOTED = '(?:\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*"|`(?:[^`\\\\]|\\\\.)*`)';
const WHOLE_FROM_AI = new RegExp(
	`^=\\{\\{\\s*(?:\\/\\*[^*]*\\*\\/\\s*)?\\$fromAI\\(\\s*${QUOTED}(?:\\s*,\\s*(${QUOTED}))?(?:\\s*,\\s*${QUOTED})?\\s*\\)\\s*\\}\\}$`,
);

/** The `$fromAI()` expression of a field that the model fills, as the editor writes it. */
const fromAiExpression = (key: string, description: string) =>
	`={{ ${FROM_AI_MARKER} $fromAI(${[key, ...(description ? [description] : [])].map((text) => JSON.stringify(text)).join(', ')}) }}`;

/**
 * The description of a field value that is one `$fromAI()` call, or `undefined` for another
 * value. The decompiler reads it back as `fromModel()`.
 */
export function fromAiDescriptionOf(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const match = WHOLE_FROM_AI.exec(value.trim());
	if (!match) return undefined;
	const quoted = match[1];
	if (!quoted) return '';
	const unescaped = () => quoted.slice(1, -1).replace(/\\(.)/g, '$1');
	// `fromModel()` writes a JSON string. Other quotes come from the editor or the user.
	if (!quoted.startsWith('"')) return unescaped();
	try {
		const parsed: unknown = JSON.parse(quoted);
		return typeof parsed === 'string' ? parsed : unescaped();
	} catch {
		return unescaped();
	}
}

/**
 * The config of an agent tool: each input field takes a value, or `fromModel()` to let the
 * model fill it. `toolDescription` is what the model reads; the action summary when not set.
 */
export type ToolConfig<I> = {
	/** The node name, unique in the workflow. */
	readonly name: string;
	/** Node settings. */
	readonly settings?: NodeSettings;
	/** What the tool does, for the model. The action summary when not set. */
	readonly toolDescription?: string;
} & { [K in keyof I]: I[K] | FromModel };

/**
 * The agent tool of an action. Generated node modules call this. A contract root node takes it
 * in `tools`, and a derived root node in `providers.tools`.
 */
export function contractTool<In, Ctx>(
	id: string,
	config: ToolConfig<Record<never, never>>,
	version = 1,
	/** The paths of the fields whose lambdas read each response page, as for `contractStep`. */
	pageFields: ReadonlyArray<readonly string[]> = [],
): Provider<In, Ctx, 'tool'> {
	const { name, settings, ...fields } = config;
	const parameters = Object.fromEntries(
		Object.entries(fields).map(([key, value]) => [
			key,
			isFromModel(value) ? fromAiExpression(key, value[FROM_MODEL]) : value,
		]),
	);
	return {
		slot: 'tools',
		spec: {
			name,
			type: id,
			version,
			...(settings ? { settings } : {}),
			parameters: (compiler) => {
				const compiled = compileWithPages(compiler, parameters, pageFields);
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
	/** The reply step that the trigger goes with. */
	readonly pairing?: Pairing;
	/**
	 * An output item. It fills the fields that a sample item leaves out, and a declared schema
	 * replaces its fields to make a sample.
	 */
	readonly example?: Readonly<Record<string, unknown>>;
	/** The trigger declares output fields with `schema`, so `schema` is not a node parameter. */
	readonly takesSchema?: true;
	/** The resource and operation of a derived trigger. */
	readonly slot?: Selector;
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
 * A contract trigger. Generated node modules call this. `schema` holds the JSON
 * Schemas of declared output fields: it types the output, and without a `sample` it makes one.
 * It is not a node parameter.
 */
export function contractTrigger<Out, const N extends string>(
	id: string,
	config: {
		/** The node name, unique in the workflow. */
		readonly name: N;
		/** Sample output items. They type the output, and verification uses them. */
		readonly sample?: readonly unknown[];
		/** The JSON Schema of each declared output field, e.g. the body of a webhook. */
		readonly schema?: Readonly<Record<string, ValueSchema | undefined>>;
		/** Node settings. */
		readonly settings?: NodeSettings;
		/** The providers of the trigger, by slot. */
		readonly providers?: ProvidersBySlot;
	},
	version = 1,
	requires?: Requires,
	options: TriggerOptions = {},
): Trigger<Out, N> {
	const { name, sample: given, settings, providers: grouped, ...input } = config;
	const { pairing, example, takesSchema, slot } = options;
	const providers = grouped && providerSpecs(grouped);
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
	return triggerStep({
		name,
		type: id,
		version,
		sample,
		...(settings ? { settings } : {}),
		...(requires ? { requires } : {}),
		...(pairing ? { pairing } : {}),
		...(providers && Object.keys(providers).length > 0 ? { providers } : {}),
		parameters: (compiler) => {
			const compiled = compiler.value(parameters);
			return { ...(isDataObject(compiled) ? compiled : {}), ...slot };
		},
	});
}

/** Output names: a fixed list, or one per entry of an input list, then the fixed ones. */
export type OutputList =
	| readonly string[]
	| {
			/** The input list whose entries each name an output. */
			readonly each: string;
			/** Fixed outputs after the entry outputs. */
			readonly then?: readonly string[];
	  };

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
		/** The node name, unique in the workflow. */
		readonly name: N;
		/** Sample output items, for verification. */
		readonly sample?: readonly unknown[];
		/** Node settings. */
		readonly settings?: NodeSettings;
	},
	outputs: OutputList,
	version = 1,
	slot?: {
		/** The `resource` parameter value. */
		readonly resource?: string;
		/** The `operation` parameter value. */
		readonly operation?: string;
	},
	requires?: Requires,
): RoutedStep<In, Ctx, Out, N, Names> {
	const step = contractStep<In, Ctx, Out, N>(id, config, version, slot, requires);
	const names = outputNamesOf(outputs, config);
	return { ...step, spec: { ...step.spec, outputs: names.length }, outputs: names };
}

/** A trigger node. It starts a flow. */
export function triggerStep<Item, const N extends string>(
	spec: NodeSpec & { name: N },
): Trigger<Item, N> {
	return { name: spec.name, spec: { ...spec, trigger: true } };
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
			if (value instanceof BinaryKey) {
				const result = compileBinaryKey(value.fn);
				if (!result.ok) issues.push(`${nodeName}: ${result.error}`);
				return result.ok ? result.key : '';
			}
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

/** The problems of the groups of `graph` that the save would drop the group for. */
function groupIssues(graph: Graph): string[] {
	const regions = graph.regions ?? [];
	const frames = [...regions, ...(graph.groups ?? [])];
	const sameNodes = (one: readonly string[], other: readonly string[]) =>
		one.length === other.length && one.every((member) => other.includes(member));
	const issues = (graph.groups ?? []).flatMap((group) => {
		const { name, members } = group;
		if (members.length === 0) return [`${name}: group needs a body that runs a node`];
		const others = frames.filter((frame) => frame !== group);
		if (others.some((other) => other.name === name)) {
			return [`Two groups or forEach regions are named "${name}"`];
		}
		const same = others.find((other) => sameNodes(other.members, members));
		return same
			? [
					`${name}: group has the same nodes as "${same.name}". Remove one, or give the group more nodes`,
				]
			: [];
	});
	return [...new Set(issues)];
}

/**
 * The problems of the regions of `graph`: their own, then the region rules of n8n, which the
 * engine checks again before a run.
 */
function regionIssues(graph: Graph): string[] {
	const regions = graph.regions ?? [];
	const own = regions.flatMap(({ name, problems }) =>
		problems.map((problem) => `${name}: ${problem}`),
	);
	if (regions.length === 0 || own.length > 0) return own;
	const connections: IConnections = {};
	for (const edge of graph.edges) {
		const outputs = (connections[edge.from] ??= { main: [] }).main;
		while (outputs.length <= edge.output) outputs.push([]);
		outputs[edge.output]?.push({
			node: edge.to,
			type: NodeConnectionTypes.Main,
			index: edge.input,
		});
	}
	const { problems } = regionTreeOf({
		nodes: graph.nodes.map((spec) => ({ id: spec.name, name: spec.name })),
		connections,
		nodeGroups: regions.map((region) => ({
			id: region.name,
			name: region.name,
			nodeIds: [...region.members],
			repeat: {
				kind: 'forEach',
				batchSize: region.batchSize,
				entry: region.entry,
				exits: region.exits.map(({ node, output }) => ({ node, output })),
			},
		})),
		executionOrder: 'v1',
	});
	return problems.map(({ message }) => message);
}

/** The value `export default` gives the build: validate, serialize, and generate pin data. */
export interface Workflow {
	/** The scopes each credential needs, sorted, with the nodes that need each one. */
	scopes(): Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
	/** Validates the workflow. It throws when the build found problems. */
	validate(): ReturnType<WorkflowBuilder['validate']>;
	/** The workflow JSON to save. It throws when the build found problems. */
	toJSON(options?: {
		/** Lay out the nodes on the canvas. */
		tidyUp?: boolean;
	}): WorkflowJSON;
	/** The workflow with pin data from the samples. */
	generatePinData(): {
		/** The workflow JSON with pin data. */
		toJSON(options?: {
			/** Lay out the nodes on the canvas. */
			tidyUp?: boolean;
		}): WorkflowJSON;
	};
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

/**
 * The settings n8n saves with a workflow, e.g. `errorWorkflow` and `timezone`. Leave a key out
 * to keep its default: the editor's `'DEFAULT'` value means the same.
 */
export type WorkflowSettings = {
	[K in keyof IWorkflowSettings]: Exclude<IWorkflowSettings[K], 'DEFAULT'>;
};

/** The name of a workflow, its settings, and the scopes its credentials grant. */
export interface WorkflowOptions {
	/** The workflow name. */
	readonly name: string;
	/**
	 * The workflow settings, e.g. `{ errorWorkflow: '<workflow id>' }`. The id is of a published
	 * workflow that starts with an Error Trigger.
	 */
	readonly settings?: WorkflowSettings;
	/**
	 * The scopes each credential grants, by node id, e.g. `{ notion: ['content:read'] }`. The
	 * build fails on a scope that a node needs and the credential does not grant. A credential
	 * that is not listed is not checked.
	 */
	readonly grants?: Readonly<Record<string, readonly string[]>>;
}

/**
 * The default plugins plus loop wiring, which only `next` builds check for now. The build
 * type-checks each read in a lambda, an expression, and Code text, so `next` builds do not use
 * the expression path check: it reads a sample as the full output, and it does not know the
 * `error` of failed items.
 */
const nextRegistry = new PluginRegistry();
registerDefaultPlugins(nextRegistry);
nextRegistry.registerValidator(loopWiringValidator);
nextRegistry.unregisterValidator(expressionPathValidator.id);

/**
 * A trigger `sample` is the event the trigger delivers, so verification pins it as the trigger
 * output. A contract step sample is pinned too, see `NodeSpec.pinsSample`. The root builder
 * declares pin data for some node types only.
 */
function withSamples(built: WorkflowBuilder, specs: readonly NodeSpec[]): Omit<Workflow, 'scopes'> {
	const samples = Object.fromEntries(
		specs.flatMap((spec) =>
			(spec.trigger || spec.pinsSample) && spec.sample?.length
				? [[spec.name, spec.sample.filter(isDataObject)]]
				: [],
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

/** A source that tsc rejects can leave the name out. */
const hasName = (spec: { readonly name: unknown }) => typeof spec.name === 'string';

/** Every provider under `specs`, at any depth. */
const allProviders = (specs: ProviderSpecs | undefined): ProviderSpec[] =>
	Object.values(specs ?? {}).flatMap((list) =>
		list.flatMap((spec) => [spec, ...allProviders(spec.providers)]),
	);

/** The root builder config for `specs`; `input` gives each provider's node input. */
function providerConfig(
	specs: ProviderSpecs,
	input: (spec: ProviderSpec) => NodeInput,
): SubnodeConfig {
	const one = <T>(factory: (node: NodeInput) => T, list?: readonly ProviderSpec[]) =>
		list?.[0] ? factory(input(list[0])) : undefined;
	const all = <T>(factory: (node: NodeInput) => T, list?: readonly ProviderSpec[]) =>
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

/**
 * The workflow to save: a trigger, then the parts that run in order. Each part reads the items
 * of the part before. A trigger later in the list starts another flow.
 */
// Each position is its own parameter, as in `steps`.
export function workflow<
	I0,
	const N0 extends string,
	I1,
	C1,
	I2,
	C2,
	I3,
	C3,
	I4,
	C4,
	I5,
	C5,
	I6,
	C6,
	I7,
	C7,
	I8,
	C8,
	I9,
	C9,
	I10,
	C10,
	I11,
	C11,
	I12,
	C12,
	I13,
	C13,
	I14,
	C14,
	I15,
	C15,
	I16,
	C16,
	I17,
	C17,
	I18,
	C18,
	I19,
	C19,
	I20,
	C20,
	I21,
	C21,
	I22,
	C22,
	I23,
	C23,
	I24,
	C24,
	I25,
	C25,
	I26,
	C26,
	I27,
	C27,
	I28,
	C28,
	I29,
	C29,
	I30,
	C30,
	I31,
	C31,
	I32,
	C32,
	I33,
	C33,
	I34,
	C34,
	I35,
	C35,
	I36,
	C36,
	I37,
	C37,
	I38,
	C38,
	I39,
	C39,
	I40,
	C40,
>(
	options: string | WorkflowOptions,
	trigger: Trigger<I0, N0>,
	s1?: Part<NoInfer<I0>, NoInfer<Record<N0, I0>>, I1, C1>,
	s2?: Part<NoInfer<I1>, NoInfer<C1>, I2, C2>,
	s3?: Part<NoInfer<I2>, NoInfer<C2>, I3, C3>,
	s4?: Part<NoInfer<I3>, NoInfer<C3>, I4, C4>,
	s5?: Part<NoInfer<I4>, NoInfer<C4>, I5, C5>,
	s6?: Part<NoInfer<I5>, NoInfer<C5>, I6, C6>,
	s7?: Part<NoInfer<I6>, NoInfer<C6>, I7, C7>,
	s8?: Part<NoInfer<I7>, NoInfer<C7>, I8, C8>,
	s9?: Part<NoInfer<I8>, NoInfer<C8>, I9, C9>,
	s10?: Part<NoInfer<I9>, NoInfer<C9>, I10, C10>,
	s11?: Part<NoInfer<I10>, NoInfer<C10>, I11, C11>,
	s12?: Part<NoInfer<I11>, NoInfer<C11>, I12, C12>,
	s13?: Part<NoInfer<I12>, NoInfer<C12>, I13, C13>,
	s14?: Part<NoInfer<I13>, NoInfer<C13>, I14, C14>,
	s15?: Part<NoInfer<I14>, NoInfer<C14>, I15, C15>,
	s16?: Part<NoInfer<I15>, NoInfer<C15>, I16, C16>,
	s17?: Part<NoInfer<I16>, NoInfer<C16>, I17, C17>,
	s18?: Part<NoInfer<I17>, NoInfer<C17>, I18, C18>,
	s19?: Part<NoInfer<I18>, NoInfer<C18>, I19, C19>,
	s20?: Part<NoInfer<I19>, NoInfer<C19>, I20, C20>,
	s21?: Part<NoInfer<I20>, NoInfer<C20>, I21, C21>,
	s22?: Part<NoInfer<I21>, NoInfer<C21>, I22, C22>,
	s23?: Part<NoInfer<I22>, NoInfer<C22>, I23, C23>,
	s24?: Part<NoInfer<I23>, NoInfer<C23>, I24, C24>,
	s25?: Part<NoInfer<I24>, NoInfer<C24>, I25, C25>,
	s26?: Part<NoInfer<I25>, NoInfer<C25>, I26, C26>,
	s27?: Part<NoInfer<I26>, NoInfer<C26>, I27, C27>,
	s28?: Part<NoInfer<I27>, NoInfer<C27>, I28, C28>,
	s29?: Part<NoInfer<I28>, NoInfer<C28>, I29, C29>,
	s30?: Part<NoInfer<I29>, NoInfer<C29>, I30, C30>,
	s31?: Part<NoInfer<I30>, NoInfer<C30>, I31, C31>,
	s32?: Part<NoInfer<I31>, NoInfer<C31>, I32, C32>,
	s33?: Part<NoInfer<I32>, NoInfer<C32>, I33, C33>,
	s34?: Part<NoInfer<I33>, NoInfer<C33>, I34, C34>,
	s35?: Part<NoInfer<I34>, NoInfer<C34>, I35, C35>,
	s36?: Part<NoInfer<I35>, NoInfer<C35>, I36, C36>,
	s37?: Part<NoInfer<I36>, NoInfer<C36>, I37, C37>,
	s38?: Part<NoInfer<I37>, NoInfer<C37>, I38, C38>,
	s39?: Part<NoInfer<I38>, NoInfer<C38>, I39, C39>,
	s40?: Part<NoInfer<I39>, NoInfer<C39>, I40, C40>,
): Workflow;
export function workflow(
	options: string | WorkflowOptions,
	...positions: ReadonlyArray<AnyPart | undefined>
): Workflow {
	const {
		name,
		grants = {},
		settings,
	}: WorkflowOptions = typeof options === 'string' ? { name: options } : options;
	const parts = given(positions);
	const [first] = parts;
	const { graph } = parts.reduce(partFragment, EMPTY_FRAGMENT);
	const regions = graph.regions ?? [];
	const nodeNames = new Set(graph.nodes.map((spec) => spec.name));
	// `$()` reads a region as it reads a node.
	const readable = new Set([...nodeNames, ...regions.map((region) => region.name)]);
	const required = scopesOf(graph.nodes);
	const scopes = () => required;
	// A source that tsc rejects still runs, e.g. `node({ type, version, config: { name } })`.
	const unnamed = [
		...graph.nodes,
		...graph.nodes.flatMap((spec) => allProviders(spec.providers)),
	].filter((spec) => !hasName(spec));
	if (unnamed.length > 0) {
		return failedWorkflow(
			unnamed.map(({ type }) =>
				// `node('Fetch', { type })` passes a string as the config.
				typeof type !== 'string'
					? "A node() call has no name and no type. node() takes one object: node({ name: 'Fetch', type, version, parameters }), not node('Fetch', { … })"
					: `A node of type "${type}" has no name. Give each step its own \`name\` next to \`type\`, e.g. node({ name: 'Fetch', type, version, parameters }). node() takes no \`config\``,
			),
			scopes,
		);
	}
	const missing = Object.entries(required).flatMap(([credential, byScope]) =>
		Object.entries(byScope)
			.filter(([scope]) => grants[credential] !== undefined && !grants[credential].includes(scope))
			.map(
				([scope, nodes]) =>
					`Credential "${credential}" does not grant scope "${scope}", which ${nodes.map((node) => `"${node}"`).join(', ')} needs`,
			),
	);
	const providers = [...new Set(graph.nodes.flatMap((spec) => allProviders(spec.providers)))];
	const providerNames = providers.map((spec) => spec.name);
	const issues: string[] = [
		...[
			...graph.nodes
				.filter((spec) => spec.name.endsWith('\u0000duplicate'))
				.map((spec) => spec.name.split('\u0000')[0]),
			...providerNames.filter(
				(providerName, index) =>
					nodeNames.has(providerName) || providerNames.indexOf(providerName) !== index,
			),
		].map((duplicate) => `Two different nodes are named "${duplicate}"`),
		...missing,
		...(first && isStep(first) && first.spec.trigger
			? []
			: ['A workflow starts with a trigger, e.g. manual()']),
		...(graph.problems ?? []),
		...regionIssues(graph),
		...groupIssues(graph),
		...(regions.length > 0 && settings?.executionOrder === 'v0'
			? ['forEach runs in execution order v1 only. Remove settings.executionOrder']
			: []),
	];

	const providerInput = (spec: ProviderSpec): NodeInput => ({
		type: spec.type,
		version: spec.version,
		config: {
			name: spec.name,
			parameters: spec.parameters(createCompiler(spec.name, readable, issues)),
			...spec.settings,
			...(spec.providers ? { subnodes: providerConfig(spec.providers, providerInput) } : {}),
		},
	});
	const parametersOf = new Map(
		graph.nodes.map((spec) => [
			spec.name,
			spec.parameters(createCompiler(spec.name, readable, issues)),
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
				...(spec.providers ? { subnodes: providerConfig(spec.providers, providerInput) } : {}),
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
		rootWorkflow(name, name, {
			registry: nextRegistry,
			// The engine runs regions in execution order v1 only.
			...(regions.length > 0 || settings
				? { settings: { ...settings, ...(regions.length > 0 ? { executionOrder: 'v1' } : {}) } }
				: {}),
		}),
	);
	const connected = graph.edges.reduce((builder, edge) => {
		const from = instances.get(edge.from);
		const to = instances.get(edge.to);
		return from && to ? builder.connect(from, edge.output, to, edge.input) : builder;
	}, withNodes);
	const instanceOf = (node: string) => {
		const instance = instances.get(node);
		if (!instance) throw new Error(`Region node "${node}" is not in the workflow`);
		return instance;
	};
	const withRegions = regions.reduce(
		(builder, region) =>
			builder.group(region.name, region.members.map(instanceOf), {
				repeat: {
					kind: 'forEach',
					batchSize: region.batchSize,
					entry: instanceOf(region.entry),
					exits: region.exits.map(({ node, output }) => ({ node: instanceOf(node), output })),
				},
			}),
		connected,
	);
	// A provider rides with its node on the canvas, so the group holds it too.
	const byName = new Map(graph.nodes.map((spec) => [spec.name, spec]));
	const groupMembers = (members: readonly string[]) =>
		members.flatMap((member) => [
			instanceOf(member),
			...allProviders(byName.get(member)?.providers).flatMap(
				(spec) => withRegions.getNode(spec.name) ?? [],
			),
		]);
	const built = (graph.groups ?? []).reduce(
		(builder, { name: group, description, members }) =>
			builder.group(group, groupMembers(members), description ? { description } : undefined),
		withRegions,
	);
	const verified = withSamples(built, graph.nodes);
	return {
		scopes,
		validate: () => verified.validate(),
		toJSON: (toJsonOptions) => verified.toJSON(toJsonOptions),
		generatePinData: () => verified.generatePinData(),
	};
}
