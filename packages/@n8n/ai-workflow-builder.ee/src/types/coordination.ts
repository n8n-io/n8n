/**
 * Coordination types for multi-agent subgraph handoff.
 *
 * The coordination log is used to track which subgraphs have completed
 * and enable deterministic routing without polluting the messages array.
 */

export type SubgraphPhase = 'discovery' | 'builder' | 'configurator' | 'state_management';

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

export type CoordinationMetadata =
	| DiscoveryMetadata
	| BuilderMetadata
	| ConfiguratorMetadata
	| StateManagementMetadata
	| ErrorMetadata;

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

export interface ErrorMetadata {
	phase: 'error';
	/** The subgraph that failed */
	failedSubgraph: SubgraphPhase;
	/** Error message */
	errorMessage: string;
	/** Partial builder data when builder hits recursion error (AI-1812) */
	partialBuilderData?: {
		nodeCount: number;
		connectionCount: number;
		nodeNames: string[];
	};
}

export interface StateManagementMetadata {
	phase: 'state_management';
	/** Type of state management action */
	action: 'compact' | 'clear';
	/** Number of messages removed during compaction */
	messagesRemoved?: number;
}

/**
 * Helper functions to create typed metadata objects.
 * These eliminate the need for type assertions when creating coordination log entries.
 */
export function createDiscoveryMetadata(data: Omit<DiscoveryMetadata, 'phase'>): DiscoveryMetadata {
	return { phase: 'discovery', ...data };
}

export function createBuilderMetadata(data: Omit<BuilderMetadata, 'phase'>): BuilderMetadata {
	return { phase: 'builder', ...data };
}

export function createConfiguratorMetadata(
	data: Omit<ConfiguratorMetadata, 'phase'>,
): ConfiguratorMetadata {
	return { phase: 'configurator', ...data };
}

export function createErrorMetadata(data: Omit<ErrorMetadata, 'phase'>): ErrorMetadata {
	return { phase: 'error', ...data };
}

export function createStateManagementMetadata(
	data: Omit<StateManagementMetadata, 'phase'>,
): StateManagementMetadata {
	return { phase: 'state_management', ...data };
}
