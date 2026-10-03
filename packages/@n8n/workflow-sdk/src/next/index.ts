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
	MANUAL_NODE,
	SET_NODE,
	setParameters,
	providerSpecs,
	triggerStep,
	type Compiler,
	type Dollar,
	type Expr,
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
export type { Interval, WaitUnit } from './regions';
/** For hosts that read a saved workflow: the nodes that `loop`, `paginate` and `pollUntil` emit. */
export { LOOP_STATE_NODE, loopNodeNames } from './regions';
export type {
	Binary,
	CaseField,
	CaseItem,
	DateTime,
	Declared,
	DeepPartial,
	Dollar,
	EntryFields,
	ErrorItem,
	Exact,
	Expr,
	Expression,
	FromModel,
	FromSchema,
	Loose,
	ModelCatalog,
	ModelOf,
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

/** A JSON value. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

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
			: F[K];
} & {};

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

/**
 * Emit new fields for each item (the Edit Fields contract). A lambda field keeps its runtime
 * type (a number stays a number). `keep: 'all'` also keeps every input field.
 */
export function set<
	In,
	Ctx,
	const N extends string,
	F extends Record<string, Json | Lambda<In, Ctx>>,
	const K extends 'none' | 'all' = 'none',
>(config: {
	/** The node name. */
	name: N;
	/** The new fields: a JSON value or a lambda each. A key holds no `.` or `[`. */
	fields: F;
	/** `all` also keeps every input field. Default `none`. */
	keep?: K;
}): Step<In, Ctx, K extends 'all' ? Simplify<Omit<In, keyof F> & Fields<F>> : Fields<F>, N> {
	const { name, fields, keep } = config;
	return {
		name,
		spec: {
			name,
			...SET_NODE,
			parameters: (compiler) => {
				// The node reads a field name as a path, so a literal key keeps the type true.
				Object.keys(fields)
					.filter((key) => /[.[\]]/.test(key))
					.forEach((key) => compiler.issue(`set field "${key}" cannot hold "." or "["`));
				// A string that starts with "=" is an n8n expression here too, e.g. from expr().
				return setParameters(
					Object.fromEntries(
						Object.entries(fields).map(([key, value]) => [
							key,
							typeof value === 'function' ? `={{ ${compiler.js(value)} }}` : value,
						]),
					),
					keep === 'all',
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

/** Keys of `In` whose value is an array. */
export type ListField<In> = {
	[K in keyof In]-?: NonNullable<In[K]> extends readonly unknown[] ? K : never;
}[keyof In] &
	string;

/** One item per element of `In[F]`: the element itself, or `{ [F]: element }` for a primitive. */
export type ElementOf<In, F extends keyof In> = NonNullable<In[F]> extends ReadonlyArray<infer E>
	? E extends object
		? E
		: { [P in F]: E }
	: never;

/** Emit one item per element of the list field `field` (a Split Out node). */
export function splitOut<In, Ctx, const N extends string, const F extends ListField<In>>(config: {
	/** The node name. */
	name: N;
	/** The list field of the input item. */
	field: F;
}): Step<In, Ctx, ElementOf<In, F>, N> {
	const { name, field } = config;
	return {
		name,
		spec: { name, ...SPLIT_OUT_NODE, parameters: () => splitOutParameters(field) },
	};
}
