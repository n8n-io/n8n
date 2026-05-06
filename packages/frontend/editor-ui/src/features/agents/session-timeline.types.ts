export type EventKind =
	| 'user'
	| 'agent'
	| 'tool'
	| 'node'
	| 'workflow'
	| 'working-memory'
	| 'suspension';

export interface TimelineItem {
	kind: EventKind;
	executionId: string;
	timestamp: number;
	endTimestamp?: number;
	content?: string;
	toolName?: string;
	toolCallId?: string;
	toolInput?: unknown;
	toolOutput?: unknown;
	toolSuccess?: boolean;
	workflowId?: string;
	workflowName?: string;
	workflowExecutionId?: string;
	workflowTriggerType?: string;
	nodeType?: string;
	nodeTypeVersion?: number;
	nodeDisplayName?: string;
	/**
	 * Configured node parameters from the agent's JSON config (only set for
	 * `kind: 'node'`). Surfaced in the IO viewer so the user can see the node's
	 * actual config — channel, operation, `$fromAI(...)` templates — alongside
	 * the LLM's runtime input items.
	 */
	nodeParameters?: Record<string, unknown>;
	resumed?: boolean;
}

export interface IdleRange {
	start: number;
	end: number;
}

export interface FilterOption {
	key: string;
	label: string;
	color: string;
	count: number;
}
