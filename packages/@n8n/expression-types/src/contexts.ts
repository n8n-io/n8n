// What an n8n expression in a node parameter can see, as TypeScript interfaces over a runtime
// sample `R`: `{ input?: { json, binaryKeys? }, nodes?: { [name]: { json, binaryKeys?, params? } },
// parameters?, vars?, env? }`. A hole that `R` does not fill is `H`: N8nLooseJson (any) by
// default, `never` where a hole must be an error.
//
// Sources: packages/workflow/src/workflow-data-proxy.ts, packages/core/.../get-additional-keys.ts,
// packages/@n8n/task-runner/src/js-task-runner/js-task-runner.ts (Code node).
import type { DateTime as LuxonDateTime, Duration, Interval } from 'luxon';

type Prop<R, K extends string> = K extends keyof R ? Exclude<R[K], undefined> : never;
type Or<V, Fallback> = [V] extends [never] ? Fallback : V;
/** The sample's type for `K`; the hole `H` when the sample has none. */
type Data<R, K extends string, H> = Or<Prop<R, K>, H>;
/** ['a', 'b'] as const → 'a' | 'b'; anything else means "any key", or no key when H is never. */
type Keys<K, H> = [K] extends [ReadonlyArray<infer S extends string>]
	? [S] extends [never]
		? AnyKey<H>
		: S
	: AnyKey<H>;
type AnyKey<H> = [H] extends [never] ? never : string;

type Input<R> = Prop<R, 'input'>;
type Nodes<R> = Or<Prop<R, 'nodes'>, {}>;
type NodeData<N, H> = N8nNodeData<
	Data<N, 'json', H>,
	Keys<Prop<N, 'binaryKeys'>, H>,
	Data<N, 'params', H>
>;

interface CommonContext<R, H> {
	/** The current date and time as a Luxon DateTime, in the workflow timezone. */
	$now: DateTime;
	/** Today at midnight as a Luxon DateTime, in the workflow timezone. */
	$today: DateTime;
	/** Luxon's DateTime class, e.g. `DateTime.fromISO('2024-03-30')`. */
	DateTime: typeof LuxonDateTime;
	/** Luxon's Duration class. */
	Duration: typeof Duration;
	/** Luxon's Interval class. */
	Interval: typeof Interval;
	/** Workflow variables, all strings. */
	$vars: Record<Keys<Prop<R, 'vars'>, H>, string>;
	/** Environment variables, when access is allowed. */
	$env: Record<Keys<Prop<R, 'env'>, H>, string>;
	/** External secrets by provider, when enabled. */
	$secrets: Record<string, Record<string, N8nLooseJson>>;
	/** Data about the current execution: id, mode, resume URLs, customData. */
	$execution: N8nExecution;
	$evaluation: { runId: string } | undefined;
	/** How the workflow was started. */
	$mode: N8nMode;
	/** The current workflow: id, name, active. */
	$workflow: N8nWorkflow;
	/** Queries data with a JMESPath expression. */
	$jmespath(data: Record<string, N8nLooseJson> | N8nLooseJson[], query: string): N8nLooseJson;
	/** @deprecated use $jmespath */
	$jmesPath(data: Record<string, N8nLooseJson> | N8nLooseJson[], query: string): N8nLooseJson;
	/** Evaluates an expression string at runtime. Returns any value. */
	$evaluateExpression(expression: string, itemIndex?: number): N8nLooseJson;
}

/** Node parameter values: runs per item with $json, $input, $('Node'), ... */
export interface NodeParameterContext<R = {}, H = N8nLooseJson> extends CommonContext<R, H> {
	/** JSON data of the current input item. */
	$json: Data<Input<R>, 'json', H>;
	/** @deprecated use $json */
	$data: Data<Input<R>, 'json', H>;
	/** Binary data of the current input item, by property name. */
	$binary: Record<Keys<Prop<Input<R>, 'binaryKeys'>, H>, N8nBinaryData>;
	/** The current node's input: item, first(), last(), all(), params. */
	$input: N8nInput<
		Data<Input<R>, 'json', H>,
		Keys<Prop<Input<R>, 'binaryKeys'>, H>,
		Data<R, 'parameters', H>
	>;
	/** The current input item, json and binary. */
	$thisItem: N8nItem<Data<Input<R>, 'json', H>, Keys<Prop<Input<R>, 'binaryKeys'>, H>>;
	/** Output of another node in the workflow: item, first(), last(), all(), params, isExecuted. */
	$<K extends keyof Nodes<R>>(nodeName: K, resolveFullItem?: boolean): NodeData<Nodes<R>[K], H>;
	$(nodeName?: string, resolveFullItem?: boolean): [H] extends [never] ? never : N8nAnyNodeData;
	/** @deprecated use $('Node') */
	$node: {
		[K in keyof Nodes<R>]: N8nLegacyNode<
			Data<Nodes<R>[K], 'json', H>,
			Keys<Prop<Nodes<R>[K], 'binaryKeys'>, H>,
			Data<Nodes<R>[K], 'params', H>
		>;
	} & Record<AnyKey<H>, N8nLegacyNode<N8nLooseJson, string, N8nLooseJson>>;
	$items(
		nodeName?: string,
		outputIndex?: number,
		runIndex?: number,
	): Array<N8nItem<N8nLooseJson, string>>;
	/** @deprecated */
	$item(itemIndex: number, runIndex?: number): N8nLooseJson;
	/** The current node's parameters, resolved. */
	$parameter: Data<R, 'parameters', H>;
	$rawParameter: Data<R, 'parameters', H>;
	/** Index of the item this expression runs for. */
	$itemIndex: number;
	/** How many times the current node has run in this execution. */
	$runIndex: number;
	$position: number;
	$thisItemIndex: number;
	$thisRunIndex: number;
	/** The node the current input came from: name, outputIndex, runIndex. */
	$prevNode: N8nPrevNode;
	/** Type version of the current node. */
	$nodeVersion: number;
	$nodeId: string;
	$webhookId: string | undefined;
	/** @deprecated use $execution.id */
	$executionId: string;
	/** @deprecated use $execution.resumeUrl */
	$resumeWebhookUrl: string;
	/** Tool call context inside AI tool nodes. */
	$tool: N8nLooseJson;
	/** Tools and memory connected to the current AI Agent node. */
	$agentInfo: N8nAgentInfo;
	$getPairedItem(
		destinationNodeName: string,
		incomingSourceData: unknown,
		pairedItem: unknown,
	): N8nItem<N8nLooseJson, string> | null;
	/** In AI tool nodes: lets the model fill this value. */
	$fromAI(
		name: string,
		description?: string,
		type?: N8nFromAIType,
		defaultValue?: unknown,
	): N8nLooseJson;
	/** @deprecated use $fromAI */
	$fromAi(
		name: string,
		description?: string,
		type?: N8nFromAIType,
		defaultValue?: unknown,
	): N8nLooseJson;
	/** @deprecated use $fromAI */
	$fromai(
		name: string,
		description?: string,
		type?: N8nFromAIType,
		defaultValue?: unknown,
	): N8nLooseJson;
}

// ---------- typed flows ----------
//
// `@n8n/workflow-sdk/next` knows the item type `I` of the node before and the item type of
// each earlier node by name, `C`. These scopes are what an expression sees there.

type NodesOf<C> = { [K in keyof C]: { json: C[K] } };

/**
 * A node parameter expression in a typed flow. `$json` is the item of the node before, and
 * `$('Node')` reads only the earlier nodes of `C`: a name outside it is an error.
 */
export type ItemScope<I, C> = Omit<
	NodeParameterContext<{ input: { json: I }; nodes: NodesOf<C> }>,
	'$' | '$node'
> & {
	/** Output of an earlier node on this path: item, first(), last(), all(), params, isExecuted. */
	$<K extends keyof C & string>(
		nodeName: K,
		resolveFullItem?: boolean,
	): N8nNodeData<C[K], string, N8nLooseJson>;
	/** @deprecated use $('Node') */
	$node: { [K in keyof C & string]: N8nLegacyNode<C[K], string, N8nLooseJson> };
};

/** The JavaScript of a Code node: the expression globals, the input items, and Code helpers. */
export type CodeScope<I, C> = ItemScope<I, C> & {
	/** All input items, in "Run Once for All Items" mode. */
	items: Array<N8nItem<I, string>>;
	/** The current input item, in "Run Once for Each Item" mode. */
	item: N8nItem<I, string>;
	/** Data that persists between executions of the active workflow. */
	$getWorkflowStaticData(type: 'global' | 'node'): Record<string, N8nLooseJson>;
	helpers: Record<string, N8nLooseJson>;
};
