import type { JsonValue } from '../common';
import type { ExecutionMode } from '../execution';
import type { GraphNode } from '../graph';

/**
 * Host integration seam — how the engine reaches capabilities it does not own.
 *
 * The engine runs steps but has no knowledge of what a `v1-node` step actually
 * is: executing one requires the v1 node runtime (node types, expressions,
 * credentials), which lives outside this package. In integrated mode the host
 * supplies an `IStepExecutor` for those step types; the engine only ever sees
 * the interfaces below.
 *
 * `inputs` and `outputs` are `JsonValue`, not `unknown`: the engine persists
 * step outputs to a `jsonb` column and reloads them as downstream inputs, so
 * anything crossing this seam must survive a JSON round-trip. The concrete
 * shape is step-type-specific (for `v1-node` it is the v1
 * `INodeExecutionData[][]`); constraining to `JsonValue` enforces
 * serializability without teaching the engine that shape — which is what keeps
 * this package free of `n8n-workflow` / `n8n-core`.
 *
 * The legacy engine passes live objects between nodes in memory, whereas all
 * non-JSON values inside step data (e.g. `Date`) are coerced by the round-trip
 * on every hop. This coercion is an accepted behavioural divergence from legacy.
 */

/** Ambient facts about the execution a step belongs to. */
export interface StepExecutionContext {
	executionId: string;
	stepId: string;
	workflowId: string;
	mode: ExecutionMode;
}

/** A single step handed to an executor. */
export interface StepExecutionRequest {
	/** The graph node to run; `node.config` is the step-type-specific payload. */
	node: GraphNode;
	/** Inputs gathered from predecessor steps; opaque to the engine but serializable. */
	inputs: JsonValue;
	context: StepExecutionContext;
}

export interface StepExecutionResult {
	/** Step outputs; persisted by the engine without inspection. */
	outputs: JsonValue;
}

/**
 * Executes a step whose behaviour the engine does not implement itself.
 * Implemented by the host (for `v1-node`, by the node-engine-compatibility
 * layer, which adapts v1 nodes to this interface).
 *
 * A failed step signals by throwing. The engine catches, records the error
 * on the step row, and classifies it as retryable or not. If `continueOnFail`
 * is enabled, errors travel as data inside `outputs`.
 */
export interface IStepExecutor {
	execute(request: StepExecutionRequest): Promise<StepExecutionResult>;
}

/**
 * Capabilities the host injects at engine construction time. Standalone mode
 * omits them and falls back to default behaviour; concrete shapes for other
 * hooks (pre-fetch, status callbacks) are introduced with the tickets that
 * first need them.
 *
 * Step types that are native to the engine (`wait`, `subworkflow`, `batch`)
 * do not go through this interface.
 */
export interface ExternalDependencies {
	/** Executes `v1-node` steps — supplied by the host in integrated mode. */
	v1StepExecutor?: IStepExecutor;
}
