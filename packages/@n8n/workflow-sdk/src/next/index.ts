/**
 * Typed workflow SDK. A workflow is a flat list: a trigger, then the parts that run in order.
 * A part is a step (one node) or a macro: `route` (each named output of a step), `when`,
 * `switchOn`, `forEach`, `loop`, `paginate`, `pollUntil`, `merge`, `onError` (the error branch
 * ends), `recover` (it joins again) and `group` (a frame on the canvas only). A macro takes one
 * part per branch or body; `steps(…)` puts several parts in one. Lambdas compile to n8n
 * expressions, and `tsc` checks every read against the item type of the part before it.
 * `expr('{{ … }}')` writes an n8n expression where a lambda has no form; the build checks it
 * too. AI nodes take their chat model, memory, tools, and output parser as `providers`.
 *
 * @example
 * ```typescript
 * import { workflow, manual, set } from '@n8n/workflow-sdk/next';
 *
 * export default workflow(
 *   'Greet',
 *   manual(),
 *   set({ name: 'Greeting', fields: { text: 'Hello' } }),
 * );
 * ```
 */
import { SPLIT_OUT_NODE, splitOutParameters } from './regions';
import {
	isFieldPath,
	MANUAL_NODE,
	SET_NODE,
	setParameters,
	providerSpecs,
	triggerStep,
	type Compiler,
	type Dollar,
	type Expr,
	type Json,
	type Loose,
	type NodeSettings,
	type NodeSpec,
	type RoutedStep,
	type Simplify,
	type Step,
	type Provider,
	type Providers,
	type Trigger,
} from './flow';

export {
	FIRST_PARTY_PACKAGES,
	workflow,
	steps,
	route,
	when,
	switchOn,
	forEach,
	group,
	loop,
	paginate,
	pollUntil,
	filter,
	merge,
	onError,
	recover,
	binaryKeys,
	contractStep,
	contractProvider,
	contractTool,
	contractTrigger,
	fromModel,
	routedStep,
} from './flow';
export { placeholder } from '../workflow-builder/node-builders/node-builder';
export {
	composedFactoryKey,
	decompileWorkflow,
	locateNextNodes,
	type ContractFactory,
	type ContractRead,
	type LegacyReader,
} from './decompile';
export { validateLoopWiring } from '../workflow-builder/plugins/validators/loop-wiring-validator';
export type { Interval, LoopLimit, RegionEmit, WaitUnit } from './regions';
export type {
	Binary,
	CaseField,
	CaseItem,
	ContinuedNodes,
	DateTime,
	Declared,
	DeepPartial,
	Dollar,
	EntryFields,
	ErrorItem,
	Exact,
	Expr,
	Expression,
	FailedItem,
	FromModel,
	FromSchema,
	InputOf,
	Json,
	Loose,
	Maybe,
	ModelCatalog,
	ModelOf,
	NodeInputs,
	NodeOutputs,
	NodeSettings,
	OpenValue,
	OutputNames,
	OutputOf,
	PageValue,
	Pairing,
	Part,
	ProviderConnection,
	Region,
	Requires,
	ResponsePage,
	RouteParts,
	RoutedStep,
	Sampled,
	Step,
	Provider,
	Providers,
	ProviderKind,
	SwitchParts,
	ToolConfig,
	Trigger,
	TriggerOptions,
	Value,
	ValueSchema,
	Workflow,
	WorkflowOptions,
	WorkflowSettings,
} from './flow';

/** A parameter tree whose leaves may be lambdas. */
export type Params<Item, Ctx> = {
	[key: string]:
		| Json
		| undefined
		| ((item: Item, $: Dollar<Ctx>) => unknown)
		| Params<Item, Ctx>
		| Array<Json | Params<Item, Ctx>>;
};

type Lambda<Item, Ctx> = (item: Item, $: Dollar<Ctx>) => unknown;

/**
 * An n8n expression, for a value that a lambda cannot write, e.g. `expr('{{ $input.first().json.id }}')`
 * or `expr('Hi {{ $json.name }}')`. It fits any field that takes a lambda. The SDK adds the `=`
 * that n8n reads as the expression mark; text that has it already stays as it is.
 */
export function expr<const E extends string>(text: E): Expr<E>;
export function expr(text: string): string {
	return text.startsWith('=') ? text : `=${text}`;
}

/**
 * The type of an expression result is known only when n8n evaluates it. `& {}` makes tsc show
 * the fields, not the lambdas they come from.
 */
type Fields<F> = {
	-readonly [K in keyof F]: F[K] extends Lambda<never, never>
		? ReturnType<F[K]>
		: F[K] extends Expr<string>
			? unknown
			: Widened<F[K]>;
} & {};

/**
 * A fixed value as a field type: `false` is `boolean`, as `''` is `string`, and `[]` is
 * `unknown[]`. Else a loop state that starts as `{ done: false, chain: [] }` does not take the
 * `boolean` or the list of a later pass.
 */
type Widened<V> = V extends boolean
	? boolean
	: [V] extends [readonly never[]]
		? unknown[]
		: V extends object
			? { -readonly [K in keyof V]: Widened<V[K]> }
			: V;

/**
 * Start a workflow when the user clicks Execute. It emits one empty item. Pass `sample` items
 * when a run gets input data: they type the output, and verification uses them as the output.
 */
export function manual<const N extends string = 'Start', Out = Record<string, never>>(config?: {
	/** The node name. Default `Start`. */
	name?: N;
	/** Sample output items. They type the output. */
	sample?: readonly Out[];
}): Trigger<Out, N>;
export function manual(config?: {
	name?: string;
	sample?: readonly unknown[];
}): Trigger<unknown, string> {
	return triggerStep({
		name: config?.name ?? 'Start',
		...MANUAL_NODE,
		...(config?.sample ? { sample: config.sample } : {}),
		parameters: () => ({}),
	});
}

type Head<P extends string> = P extends `${infer H}.${string}` ? H : P;

/** The rest of path `P` after the key `H`, e.g. `name` of `user.name`. */
type Rest<P extends string, H> = P extends `${H & string}.${infer R}` ? R : never;

/** The dotted paths into the fields of `T`, three keys deep at most. A list ends a path. */
type FieldPath<T, Depth extends unknown[] = []> = Depth['length'] extends 3
	? never
	: T extends readonly unknown[]
		? never
		: T extends object
			? {
					[K in keyof T & string]-?:
						| K
						| `${K}.${FieldPath<NonNullable<T[K]>, [...Depth, unknown]>}`;
				}[keyof T & string]
			: never;

/** `T` with only the paths `P`, as the Edit Fields node keeps the `selected` fields. */
type PickPaths<T, P extends string> = T extends readonly unknown[]
	? T
	: T extends object
		? Simplify<{
				[K in keyof T as K extends Head<P> ? K : never]: K extends P
					? T[K]
					: PickPaths<T[K], Rest<P, K>>;
			}>
		: T;

/** `T` without the paths `P`, as the Edit Fields node drops the `except` fields. */
type OmitPaths<T, P extends string> = T extends readonly unknown[]
	? T
	: T extends object
		? Simplify<{
				[K in keyof T as K extends P ? never : K]: K extends Head<P>
					? OmitPaths<T[K], Rest<P, K>>
					: T[K];
			}>
		: T;

/** The fields `F` set on `Base`. A dotted key sets a field in an object, as the node does. */
type SetPaths<Base, F> = Base extends unknown
	? Simplify<
			Omit<Base, Head<keyof F & string>> & {
				-readonly [H in Head<keyof F & string>]: H extends keyof F
					? F[H]
					: SetPaths<
							H extends keyof Base ? (Base[H] extends object ? Base[H] : {}) : {},
							{ [K in keyof F as K extends `${H}.${infer R}` ? R : never]: F[K] }
						>;
			}
		>
	: never;

/** The value at the dotted path `P` of `T`, `unknown` for a path that `T` does not have. */
type PathValue<T, P extends string> = T extends unknown
	? P extends `${infer H}.${infer R}`
		? H extends keyof T
			? PathValue<NonNullable<T[H]>, R>
			: unknown
		: P extends keyof T
			? T[P]
			: unknown
	: never;

type LastKey<P extends string> = P extends `${string}.${infer R}` ? LastKey<R> : P;

/** An expression names its key at run time. */
type KeyOf<K> = K extends `=${string}` ? string : K;

/** Without `keepMissing`, the node drops missing values and the `null` entries of lists. */
type AggregatedValue<V, A> = A extends { readonly keepMissing: true }
	? V
	: V extends ReadonlyArray<infer E>
		? Array<NonNullable<E>>
		: NonNullable<V>;

type MergedValue<V, A> = A extends { readonly mergeLists: true }
	? V extends ReadonlyArray<infer E>
		? E
		: V
	: V;

/** The output key of an aggregated field: `as`, else the last key of its path. */
type AggregatedKey<X> = X extends { readonly as: infer S extends string }
	? KeyOf<S>
	: X extends { readonly field: infer P extends string }
		? KeyOf<LastKey<P>>
		: string;

/** The list of an aggregated field `X` of the input items `In`. */
type AggregatedList<In, X, A> = Array<
	MergedValue<
		AggregatedValue<
			X extends { readonly field: infer P extends string } ? PathValue<In, P> : unknown,
			A
		>,
		A
	>
>;

/**
 * The item of the Aggregate contract for its `aggregate` config `A` and input items `In`:
 * `{ mode: 'items', into }` gives `{ [into]: In[] }`. `{ mode: 'fields', fields }` gives one list
 * per field, under `as` or the last key of the path.
 */
export type Aggregated<In, A> = A extends { readonly mode: 'items' }
	? { [K in A extends { readonly into: infer I extends string } ? KeyOf<I> : 'data']: In[] }
	: A extends { readonly mode: 'fields'; readonly fields: ReadonlyArray<infer F> }
		? SetPaths<{}, { [X in F as AggregatedKey<X>]: AggregatedList<In, X, A> }>
		: Record<string, unknown>;

/** Which input fields `set` keeps: none, all, the `selected` paths, or all `except` the paths. */
type SetKeepOf<In> =
	| 'none'
	| 'all'
	| {
			/** Keep only these input field paths, e.g. `['id', 'user.email']`. */
			readonly selected: ReadonlyArray<FieldPath<In>>;
	  }
	| {
			/** Keep every input field but these paths, e.g. `['password']`. */
			readonly except: ReadonlyArray<FieldPath<In>>;
	  };

type Kept<In, K> = K extends 'all'
	? In
	: K extends { readonly selected: ReadonlyArray<infer P extends string> }
		? PickPaths<In, P>
		: K extends { readonly except: ReadonlyArray<infer P extends string> }
			? OmitPaths<In, P>
			: {};

/**
 * Emit new fields for each item (the Edit Fields contract). A lambda field keeps its runtime
 * type (a number stays a number). A dotted key such as `user.name` sets a field in an object.
 * `keep` also keeps input fields: `'all'`, `{ selected: ['id', 'user.email'] }`, or
 * `{ except: ['password'] }`.
 *
 * @example
 * ```ts
 * set({ name: 'Contact', fields: { 'contact.email': (item) => item.email }, keep: { selected: ['id'] } }),
 * ```
 */
export function set<
	In,
	Ctx,
	const N extends string,
	F extends Record<string, Json | Lambda<In, Ctx>>,
	const K extends SetKeepOf<In> = 'none',
>(config: {
	/** The node name. */
	name: N;
	/** The new fields: a JSON value or a lambda each. A key is a field name or a dotted path. */
	fields: F;
	/** The input fields to keep beside the new fields. Default `none`. */
	keep?: K;
	/** Node settings, e.g. `{ notes }`. */
	settings?: NodeSettings;
}): Step<In, Ctx, SetPaths<Kept<In, K>, Fields<F>>, N> {
	const { name, fields, keep, settings } = config;
	return {
		name,
		spec: {
			name,
			...SET_NODE,
			...(settings ? { settings } : {}),
			parameters: (compiler) => {
				// The node reads `a[0]` as a list index, which the output type does not follow.
				Object.keys(fields)
					.filter((key) => !isFieldPath(key))
					.forEach((key) =>
						compiler.issue(
							`set field "${key}" must be a field name or a dotted path such as "user.name", without "[" or empty parts`,
						),
					);
				// A string that starts with "=" is an n8n expression here too, e.g. from expr().
				return setParameters(
					Object.fromEntries(
						Object.entries(fields).map(([key, value]) => [
							key,
							typeof value === 'function' ? `={{ ${compiler.js(value)} }}` : value,
						]),
					),
					keep ?? 'none',
				);
			},
		},
	};
}

const compiledParameters = (compiler: Compiler, parameters: unknown) => {
	const compiled = compiler.value(parameters ?? {});
	return typeof compiled === 'object' && compiled !== null && !Array.isArray(compiled)
		? Object.fromEntries(Object.entries(compiled))
		: {};
};

interface NodeConfig<In, Ctx, N extends string, Out> {
	/** The node name, unique in the workflow. */
	name: N;
	/** The n8n node type, e.g. `n8n-nodes-base.httpRequest`. */
	type: string;
	/** The node type version. */
	version: number;
	/** The node parameters. A leaf may be a lambda. */
	parameters?: Params<In, Ctx>;
	/** Node settings, e.g. `{ retryOnFail: true }`. */
	settings?: NodeSettings;
	/** The providers of an AI node, by slot. */
	providers?: Providers<In, Ctx>;
	/** Sample output items. They type the output. */
	sample?: readonly Out[];
}

/**
 * Any n8n node by type and version, for nodes without a typed module. Its output is `Loose`
 * unless you pass `sample` items. An AI node takes its providers in `providers`. Name the main
 * outputs in n8n order in `outputs`, e.g. `['true', 'false']` for IF, to wire each with
 * `route`. Node settings go in `settings`, e.g. `{ retryOnFail: true }`, as on a typed step.
 *
 * @example
 * ```ts
 * node({ name: 'Fetch', type: 'n8n-nodes-base.httpRequest', version: 4.2, parameters: { url: 'https://example.com' } }),
 * ```
 */
export function node<In, Ctx, const N extends string, Out = Loose>(
	config: NodeConfig<In, Ctx, N, Out>,
): Step<In, Ctx, Out, N>;
export function node<In, Ctx, const N extends string, const O extends string, Out = Loose>(
	config: NodeConfig<In, Ctx, N, Out> & {
		/** The main output names in n8n order, e.g. `['true', 'false']`. */
		outputs: readonly [O, O, ...O[]];
	},
): RoutedStep<In, Ctx, Out, N, O>;
export function node<In, Ctx, const N extends string, Out = Loose>(
	config: NodeConfig<In, Ctx, N, Out> & { outputs?: readonly string[] },
): Step<In, Ctx, Out, N> | RoutedStep<In, Ctx, Out, N, string> {
	const { name, type, version, parameters, settings, providers, sample, outputs } = config;
	const spec: NodeSpec = {
		name,
		type,
		version,
		sample,
		parameters: (compiler) => compiledParameters(compiler, parameters),
		...(settings ? { settings } : {}),
		...(providers ? { providers: providerSpecs(providers) } : {}),
		...(outputs ? { outputs: outputs.length } : {}),
	};
	return outputs ? { name, spec, outputs } : { name, spec };
}

/**
 * A provider of an AI node: a chat model, memory, tool, output parser, embedding, vector
 * store, retriever, document loader, text splitter, or reranker. Pass it in `node({ providers })`.
 * Its lambdas read the item of the AI node that uses it.
 */
export function provider<In, Ctx>(config: {
	/** The node name, unique in the workflow. */
	name: string;
	/** The n8n node type, e.g. `@n8n/n8n-nodes-langchain.lmChatOpenAi`. */
	type: string;
	/** The node type version. */
	version: number;
	/** The node parameters. A leaf may be a lambda. */
	parameters?: Params<In, Ctx>;
	/** Node settings. */
	settings?: NodeSettings;
	/** The providers of this provider, e.g. the model of a tool agent. */
	providers?: Providers<In, Ctx>;
}): Provider<In, Ctx> {
	const { name, type, version, parameters, settings, providers } = config;
	return {
		spec: {
			name,
			type,
			version,
			parameters: (compiler) => compiledParameters(compiler, parameters),
			...(settings ? { settings } : {}),
			...(providers ? { providers: providerSpecs(providers) } : {}),
		},
	};
}

/** Any n8n trigger node by type and version. */
export function trigger<const N extends string, Out = Loose>(config: {
	/** The node name, unique in the workflow. */
	name: N;
	/** The n8n trigger node type, e.g. `n8n-nodes-base.scheduleTrigger`. */
	type: string;
	/** The node type version. */
	version: number;
	/** The node parameters, as JSON. */
	parameters?: Record<string, Json>;
	/** Node settings. */
	settings?: NodeSettings;
	/** Sample output items. They type the output. */
	sample?: readonly Out[];
}): Trigger<Out, N> {
	const { name, type, version, parameters, settings, sample } = config;
	return triggerStep({
		name,
		type,
		version,
		sample,
		...(settings ? { settings } : {}),
		parameters: () => ({ ...parameters }),
	});
}

/**
 * Dot paths of `In` to an array, e.g. `body.orders`, at most 3 fields deep. Below a field typed
 * `any`, such as an open webhook body, any path fits.
 */
export type ListField<In, Depth extends unknown[] = []> = Depth['length'] extends 3
	? never
	: {
			[K in keyof In & string]-?: 0 extends 1 & In[K]
				? K | `${K}.${string}`
				: NonNullable<In[K]> extends readonly unknown[]
					? K
					: NonNullable<In[K]> extends object
						? `${K}.${ListField<NonNullable<In[K]>, [...Depth, unknown]>}`
						: never;
		}[keyof In & string];

/** The value at the dot path `P` of `T`. */
type ValueAt<T, P extends string> = P extends keyof T
	? T[P]
	: P extends `${infer Head}.${infer Rest}`
		? Head extends keyof T
			? ValueAt<NonNullable<T[Head]>, Rest>
			: never
		: never;

/**
 * One item per element of the list at `F`: the element itself, or `{ [F]: element }` for a
 * primitive. An untyped list gives `Loose` items.
 */
export type ElementOf<In, F extends string> = 0 extends 1 & ValueAt<In, F>
	? Loose
	: NonNullable<ValueAt<In, F>> extends ReadonlyArray<infer E>
		? 0 extends 1 & E
			? Loose
			: E extends object
				? E
				: { [P in F]: E }
		: never;

/** Emit one item per element of the list at the dot path `field` (a Split Out node). */
export function splitOut<In, Ctx, const N extends string, const F extends ListField<In>>(config: {
	/** The node name. */
	name: N;
	/** The dot path to a list of the input item, e.g. `body.orders`. */
	field: F;
}): Step<In, Ctx, ElementOf<In, F>, N> {
	const { name, field } = config;
	return {
		name,
		spec: { name, ...SPLIT_OUT_NODE, parameters: () => splitOutParameters(field) },
	};
}
