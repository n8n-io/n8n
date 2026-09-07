/**
 * Execution graph: step nodes connected by edges. The graph supports cycles
 * via back-edges (loop iteration), and is captured in the execution record at
 * start, immutable for the execution's lifetime.
 */

export type StepType = 'trigger' | 'v1-node' | 'wait' | 'subworkflow' | 'batch';

/**
 * Per-step configuration. The engine persists it with the graph without
 * inspecting it. Left as `unknown` — a to-be-narrowed union — because it
 * becomes a discriminated union of concrete per-`StepType` configs as those
 * step types land, rather than an arbitrary JSON blob.
 */
export type StepConfig = unknown;

/**
 * A batch node's configuration. Unlike a `v1-node`, whose config the engine
 * carries without reading, the engine runs a batch node itself and so has to
 * understand this.
 */
export interface BatchStepConfig {
	/** How many items each pass takes. At least 1, so every pass makes progress. */
	batchSize: number;
}

export function isBatchStepConfig(config: unknown): config is BatchStepConfig {
	if (typeof config !== 'object' || config === null) return false;
	const { batchSize } = config as { batchSize?: unknown };
	return typeof batchSize === 'number' && Number.isInteger(batchSize) && batchSize >= 1;
}

export interface GraphNode {
	/** Deterministic from the source workflow, so re-converting yields the same graph. */
	id: string;
	/** Human-readable name (the v1 node name, for v1 workflows). */
	name: string;
	type: StepType;
	/** Step-type-specific configuration; some step types (e.g. trigger) carry none. */
	config?: StepConfig;
}

export interface GraphEdge {
	/** Source node id. */
	from: string;
	/** Target node id. */
	to: string;
	/** Which output slot of `from` feeds this edge; `0` unless `from` has several outputs. */
	outputIndex: number;
	/** Which input slot of `to` this edge feeds; `0` unless `to` has several inputs (e.g. Merge). */
	inputIndex: number;
	/** Closes a cycle (loop iteration). `validateLoops` checks that it really does. */
	isBackEdge?: boolean;
}

export interface WorkflowGraph {
	nodes: GraphNode[];
	edges: GraphEdge[];
}
