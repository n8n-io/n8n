/**
 * Typed workflow SDK. A workflow is a chain of immutable `Flow` values: start at a trigger,
 * then `andThen`, `branch`, and `orElse`. Lambdas compile to n8n expressions, and `tsc`
 * checks every read against the item type of the node before it.
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
import { startFlow, type Dollar, type Flow, type Loose, type Step } from './flow';

export { workflow, Flow, contractStep } from './flow';
export type {
	DateTime,
	Dollar,
	ErrorItem,
	Loose,
	NodeOutputs,
	OutputOf,
	Step,
	Value,
	Workflow,
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
type Fields<F> = {
	-readonly [K in keyof F]: F[K] extends Lambda<never, never> ? ReturnType<F[K]> : F[K];
};

/** Start a workflow when the user clicks Execute. It emits one empty item. */
export function manual<const N extends string = 'Start'>(config?: {
	name?: N;
}): Flow<Record<string, never>, Record<N, Record<string, never>>> {
	return startFlow({
		name: config?.name ?? 'Start',
		type: 'n8n-nodes-base.manualTrigger',
		version: 1,
		parameters: () => ({}),
	});
}

/**
 * Emit new fields for each item. A lambda field keeps its runtime type (a number stays a
 * number). `keep: 'all'` also keeps every input field.
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
			type: 'n8n-nodes-base.set',
			version: 3.4,
			parameters: (compiler) => {
				const entries = Object.entries(fields).map(
					([key, value]) => `${JSON.stringify(key)}: ${compiler.js(value)}`,
				);
				return {
					mode: 'raw',
					jsonOutput: `={{ ({ ${entries.join(', ')} }) }}`,
					includeOtherFields: keep === 'all',
					...(keep === 'all' ? { include: 'all' } : {}),
					options: {},
				};
			},
		},
	};
}

/**
 * Any n8n node by type and version, for nodes without a typed module. Its output is `Loose`
 * unless you pass `sample` items.
 */
export function node<In, Ctx, const N extends string, Out = Loose>(config: {
	name: N;
	type: string;
	version: number;
	parameters?: Params<In, Ctx>;
	sample?: readonly Out[];
}): Step<In, Ctx, Out, N> {
	const { name, type, version, parameters, sample } = config;
	return {
		name,
		spec: {
			name,
			type,
			version,
			sample,
			parameters: (compiler) => {
				const compiled = compiler.value(parameters ?? {});
				return typeof compiled === 'object' && compiled !== null && !Array.isArray(compiled)
					? Object.fromEntries(Object.entries(compiled))
					: {};
			},
		},
	};
}

/** Any n8n trigger node by type and version. */
export function trigger<const N extends string, Out = Loose>(config: {
	name: N;
	type: string;
	version: number;
	parameters?: Record<string, Json>;
	sample?: readonly Out[];
}): Flow<Out, Record<N, Out>> {
	const { name, type, version, parameters, sample } = config;
	return startFlow({ name, type, version, sample, parameters: () => ({ ...parameters }) });
}
