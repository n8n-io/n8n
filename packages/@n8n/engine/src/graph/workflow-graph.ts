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

/**
 * How the engine runs a node again after its step fails. Each failed try
 * suspends the step until the next one, as a wait with a deadline; the last
 * try's failure fails the step.
 */
export interface RetryPolicy {
	/** How many runs in total, the first one included. At least 1. */
	maxTries: number;
	/** How long the step waits between two tries. At least 0. */
	waitBetweenTriesMs: number;
}

export interface GraphNode {
	/** Deterministic from the source workflow, so re-converting yields the same graph. */
	id: string;
	/** Human-readable name (the v1 node name, for v1 workflows). */
	name: string;
	type: StepType;
	/** Step-type-specific configuration; some step types (e.g. trigger) carry none. */
	config?: StepConfig;
	/** Absent for a node that runs once, whatever the outcome. */
	retry?: RetryPolicy;
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

/**
 * The graph as stored with an execution: as sent, plus what the engine records
 * on it at start. A caller cannot set that part; the request type has none.
 */
export interface StoredWorkflowGraph extends WorkflowGraph {
	/**
	 * Ids of the nodes whose outputs the caller supplied, so the engine records
	 * each as completed with them instead of running it. The outputs live in
	 * their own table.
	 */
	seeded: string[];
}
