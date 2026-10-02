/**
 * Typed workflow SDK. A workflow is a chain of immutable `Flow` values: start at a trigger,
 * then `andThen`, `branch`, `route`, and `orElse`, and the regions `forEach`, `loop`, `paginate`,
 * `pollUntil`, `switch`, `filter`, and `merge`. Lambdas compile to n8n expressions, and `tsc`
 * checks every read against the item type of the node before it. AI nodes take their chat
 * model, memory, tools, and output parser as `providers`.
 *
 * @example
 * ```typescript
 * import { workflow, manual, set } from '@n8n/workflow-sdk/next';
 *
 * export default workflow(
 *   'Greet',
 *   manual().andThen(set({ name: 'Greeting', fields: { text: 'Hello' } })),
 * );
 * ```
 */
import { SPLIT_OUT_NODE, splitOutParameters } from './regions';
import {
	MANUAL_NODE,
	SET_NODE,
	setParameters,
	startFlow,
	providerSpecs,
	type Compiler,
	type Dollar,
	type Flow,
	type Loose,
	type NodeSettings,
	type NodeSpec,
	type RoutedStep,
	type Step,
	type Provider,
	type Providers,
} from './flow';

export {
	workflow,
	Flow,
	contractStep,
	contractProvider,
	contractTrigger,
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
	Expression,
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
	ProviderConnection,
	Requires,
	ResponsePage,
	RouteFlows,
	RoutedCtx,
	RoutedItem,
	RoutedStep,
	Step,
	Provider,
	Providers,
	SupplyKind,
	TriggerOptions,
	Value,
	ValueSchema,
	Workflow,
	WorkflowOptions,
} from './flow';

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

/** n8n reads text that starts with "=" as an expression, so such a constant is quoted. */
const startsExpression = (value: unknown): boolean =>
	typeof value === 'string'
		? value.startsWith('=')
		: typeof value === 'object' && value !== null && Object.values(value).some(startsExpression);
type Fields<F> = {
	-readonly [K in keyof F]: F[K] extends Lambda<never, never> ? ReturnType<F[K]> : F[K];
};

/**
 * Start a workflow when the user clicks Execute. It emits one empty item. Pass `sample` items
 * when a run gets input data: they type the output, and verification uses them as the output.
 */
export function manual<const N extends string = 'Start', Out = Record<string, never>>(config?: {
	name?: N;
	sample?: readonly Out[];
}): Flow<Out, Record<N, Out>> {
	return startFlow({
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
	name: N;
	fields: F;
	keep?: K;
}): Step<In, Ctx, K extends 'all' ? Omit<In, keyof F> & Fields<F> : Fields<F>, N> {
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
				return setParameters(
					Object.fromEntries(
						Object.entries(fields).map(([key, value]) => [
							key,
							typeof value === 'function' || startsExpression(value)
								? `={{ ${compiler.js(value)} }}`
								: value,
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
	name: N;
	type: string;
	version: number;
	parameters?: Params<In, Ctx>;
	settings?: NodeSettings;
	providers?: Providers<In, Ctx>;
	sample?: readonly Out[];
}

/**
 * Any n8n node by type and version, for nodes without a typed module. Its output is `Loose`
 * unless you pass `sample` items. An AI node takes its providers in `providers`. Name the main
 * outputs in n8n order in `outputs`, e.g. `['true', 'false']` for IF, to wire each with
 * `Flow.route`. Node settings go in `settings`, e.g. `{ retryOnFail: true }`, as on a typed step.
 */
export function node<In, Ctx, const N extends string, Out = Loose>(
	config: NodeConfig<In, Ctx, N, Out>,
): Step<In, Ctx, Out, N>;
export function node<In, Ctx, const N extends string, const O extends string, Out = Loose>(
	config: NodeConfig<In, Ctx, N, Out> & { outputs: readonly [O, O, ...O[]] },
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
	name: string;
	type: string;
	version: number;
	parameters?: Params<In, Ctx>;
	settings?: NodeSettings;
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
	name: N;
	type: string;
	version: number;
	parameters?: Record<string, Json>;
	settings?: NodeSettings;
	sample?: readonly Out[];
}): Flow<Out, Record<N, Out>> {
	const { name, type, version, parameters, settings, sample } = config;
	return startFlow({
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
	name: N;
	field: F;
}): Step<In, Ctx, ElementOf<In, F>, N> {
	const { name, field } = config;
	return {
		name,
		spec: { name, ...SPLIT_OUT_NODE, parameters: () => splitOutParameters(field) },
	};
}
