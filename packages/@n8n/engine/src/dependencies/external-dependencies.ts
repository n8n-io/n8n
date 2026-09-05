import type { ExecutionContext, ExecutionMode, StepSlots } from '../execution';
import type { GraphNode } from '../graph';
import type { LifecycleEventCallback } from '../lifecycle-events';

/**
 * Host integration seam — how the engine reaches capabilities it does not own.
 *
 * The engine runs steps but has no knowledge of what a `v1-node` step actually
 * is: executing one requires the v1 node runtime (node types, expressions,
 * credentials), which lives outside this package. In integrated mode the host
 * supplies an `IStepExecutor` for those step types; the engine only ever sees
 * the interfaces below.
 *
 * `inputs` and `outputs` are `StepSlots` (`JsonValue[]`), not `unknown`: the
 * engine routes data slot to slot and persists it to a `jsonb` column, so it
 * owns exactly one level of structure — the slot list — and anything crossing
 * this seam must survive a JSON round-trip. A slot's contents are
 * step-type-specific (for `v1-node`, the items of one v1 connection, i.e. one
 * element of `INodeExecutionData[][]`); keeping them opaque is what keeps this
 * package free of `n8n-workflow` / `n8n-core`.
 *
 * The legacy engine passes live objects between nodes in memory, whereas all
 * non-JSON values inside step data (e.g. `Date`) are coerced by the round-trip
 * on every hop. This coercion is an accepted behavioural divergence from legacy.
 */

/**
 * Ambient facts about the execution a step belongs to. The caller facts from
 * `ExecutionContext` are flattened in, so an executor reads one object.
 */
export interface StepExecutionContext extends ExecutionContext {
	executionId: string;
	stepId: string;
	workflowId: string;
	mode: ExecutionMode;
	iteration: number;
}

/** A single step handed to an executor. */
export interface StepExecutionRequest {
	/** The graph node to run; `node.config` is the step-type-specific payload. */
	node: GraphNode;
	/** Input slots gathered from predecessor steps; slot contents are opaque. */
	inputs: StepSlots;
	context: StepExecutionContext;
}

export interface StepExecutionResult {
	/** Output slots; persisted by the engine without inspecting slot contents. */
	outputs: StepSlots;
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
 * hooks (pre-fetch) are introduced with the tickets that first need them.
 *
 * Step types that are native to the engine (`wait`, `subworkflow`, `batch`)
 * do not go through this interface.
 */
export interface ExternalDependencies {
	/** Executes `v1-node` steps — supplied by the host in integrated mode. */
	v1StepExecutor?: IStepExecutor;
	/** Ships lifecycle events to the host. A failed delivery never fails a step. */
	lifecycleEventCallback?: LifecycleEventCallback;
}
