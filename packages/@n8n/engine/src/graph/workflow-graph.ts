/**
 * Engine 2.0 execution graph types — see design doc §3.1, §3.2.
 *
 * A workflow executes as a graph of step nodes connected by edges. The graph
 * supports cycles via back-edges (used to model loop iteration). The graph is
 * captured in the execution record at start and is immutable for the
 * execution's lifetime.
 */

export type StepType = 'trigger' | 'v1-node' | 'wait' | 'subworkflow' | 'batch';

/**
 * Per-step configuration. Concrete shapes per `StepType` are defined in
 * later tickets — only `WaitStepConfig` is fully specified in the design
 * doc (§3.3) and even that is flagged as needing more design before the
 * `wait` step lands. For StartExecution, the engine treats `config` as
 * opaque payload and persists it with the graph.
 */
export type StepConfig = unknown;

export interface GraphNode {
	/** Deterministic from the source workflow — see §3.1 design properties. */
	id: string;
	/** Human-readable name (the v1 node name, for v1 workflows). */
	name: string;
	type: StepType;
	/**
	 * Step-type-specific configuration. Optional because some step types (e.g.
	 * empty trigger) carry no config; concrete shapes per `StepType` are
	 * deferred to later tickets — see design doc §3.3.
	 */
	config?: StepConfig;
}

export interface GraphEdge {
	/** Source node id. */
	from: string;
	/** Target node id. */
	to: string;
	/** Which output slot of `from` feeds this edge — multi-output nodes only. */
	outputIndex?: number;
	/** Closes a cycle (loop iteration) — see §3.1 design properties. */
	isBackEdge?: boolean;
}

export interface WorkflowGraph {
	nodes: GraphNode[];
	edges: GraphEdge[];
}
