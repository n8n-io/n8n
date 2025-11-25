/**
 * Coordination types for multi-agent subgraph handoff.
 *
 * The coordination log is used to track which subgraphs have completed
 * and enable deterministic routing without polluting the messages array.
 */

export type SubgraphPhase = 'discovery' | 'builder' | 'configurator';

/**
 * Entry in the coordination log tracking subgraph completion.
 */
export interface CoordinationLogEntry {
	/** Which subgraph completed */
	phase: SubgraphPhase;

	/** Completion status */
	status: 'completed' | 'error';

	/** When the subgraph completed (Unix timestamp) */
	timestamp: number;

	/** Brief summary for logging/debugging */
	summary: string;

	/** Full output message (e.g., configurator's setup instructions) */
	output?: string;

	/** Phase-specific metadata */
	metadata: CoordinationMetadata;
}

export type CoordinationMetadata = DiscoveryMetadata | BuilderMetadata | ConfiguratorMetadata;

export interface DiscoveryMetadata {
	phase: 'discovery';
	/** Number of nodes discovered */
	nodesFound: number;
	/** List of node type names discovered */
	nodeTypes: string[];
	/** Whether best practices were retrieved */
	hasBestPractices: boolean;
}

export interface BuilderMetadata {
	phase: 'builder';
	/** Number of nodes created */
	nodesCreated: number;
	/** Number of connections created */
	connectionsCreated: number;
	/** Names of nodes created */
	nodeNames: string[];
}

export interface ConfiguratorMetadata {
	phase: 'configurator';
	/** Number of nodes configured */
	nodesConfigured: number;
	/** Whether setup instructions were generated */
	hasSetupInstructions: boolean;
}
