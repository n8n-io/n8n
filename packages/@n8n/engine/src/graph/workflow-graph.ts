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
	/**
	 * Runs the passes of the loop at the same time instead of one after another.
	 * Absent means sequential. See `loop-admission.ts`.
	 */
	parallel?: ParallelBatchConfig;
}

export interface ParallelBatchConfig {
	/** How many passes of the loop body can run at the same time. At least 1. */
	maxConcurrency: number;
}

function isPositiveInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

export function hasValidBatchSize(config: unknown): boolean {
	if (typeof config !== 'object' || config === null) return false;
	return isPositiveInteger((config as { batchSize?: unknown }).batchSize);
}

export function isBatchStepConfig(config: unknown): config is BatchStepConfig {
	if (!hasValidBatchSize(config)) return false;
	const { parallel } = config as { parallel?: unknown };
	if (parallel === undefined) return true;
	if (typeof parallel !== 'object' || parallel === null) return false;
	return isPositiveInteger((parallel as { maxConcurrency?: unknown }).maxConcurrency);
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
