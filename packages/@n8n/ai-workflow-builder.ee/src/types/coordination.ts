/**
 * Coordination types for multi-agent subgraph handoff.
 *
 * The coordination log is used to track which subgraphs have completed
 * and enable deterministic routing without polluting the messages array.
 */

export type SubgraphPhase =
	| 'discovery'
	| 'builder'
	| 'assistant'
	| 'state_management'
	| 'responder';

const SUBGRAPH_PHASES: readonly SubgraphPhase[] = [
	'discovery',
	'builder',
	'assistant',
	'state_management',
	'responder',
];

/**
 * Type guard to check if a string is a valid SubgraphPhase.
 */
export function isSubgraphPhase(value: string): value is SubgraphPhase {
	return SUBGRAPH_PHASES.includes(value as SubgraphPhase);
}

/**
 * Entry in the coordination log tracking subgraph completion.
 */
export interface CoordinationLogEntry {
	/** Which subgraph completed */
	phase: SubgraphPhase;

	/** Completion status */
	status: 'completed' | 'in_progress' | 'error';

	/** When the subgraph completed (Unix timestamp) */
	timestamp: number;

	/** Brief summary for logging/debugging */
	summary: string;

	/** Full output message (e.g., builder's setup instructions) */
	output?: string;

	/** Phase-specific metadata */
	metadata: CoordinationMetadata;
}

export type CoordinationMetadata =
	| DiscoveryMetadata
	| BuilderMetadata
	| AssistantMetadata
	| StateManagementMetadata
	| ResponderMetadata
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

export interface AssistantMetadata {
	phase: 'assistant';
	/** Whether the assistant response included a code diff */
	hasCodeDiff: boolean;
	/** Number of suggestions in the assistant response */
	suggestionCount: number;
}

export interface ResponderMetadata {
	phase: 'responder';
	/** Length of the generated response */
	responseLength: number;
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

export function createErrorMetadata(data: Omit<ErrorMetadata, 'phase'>): ErrorMetadata {
	return { phase: 'error', ...data };
}

export function createStateManagementMetadata(
	data: Omit<StateManagementMetadata, 'phase'>,
): StateManagementMetadata {
	return { phase: 'state_management', ...data };
}

export function createAssistantMetadata(data: Omit<AssistantMetadata, 'phase'>): AssistantMetadata {
	return { phase: 'assistant', ...data };
}

export function createResponderMetadata(data: Omit<ResponderMetadata, 'phase'>): ResponderMetadata {
	return { phase: 'responder', ...data };
}
