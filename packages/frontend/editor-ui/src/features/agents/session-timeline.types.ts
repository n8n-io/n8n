export type EventKind =
	| 'user'
	| 'agent'
	| 'tool'
	| 'node'
	| 'workflow'
	| 'suspension'
	| 'hitl-response';

export type ToolCallOutcome = 'success' | 'error';
export type HitlRequestType = 'approval' | 'interaction';
export type HitlResponseStatus = 'approved' | 'declined' | 'responded';
export type TimelineStatusFilterKey = 'approved' | 'declined' | 'error';

export interface TimelineItem {
	kind: EventKind;
	executionId: string;
	timestamp: number;
	endTimestamp?: number;
	content?: string;
	/** Files attached to the user turn (only set for `kind: 'user'`). */
	attachments?: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number }>;
	toolName?: string;
	toolCallId?: string;
	toolInput?: unknown;
	toolOutput?: unknown;
	/** Terminal outcome of a tool execution. Human decisions are represented on HITL response items. */
	toolOutcome?: ToolCallOutcome;
	/** @deprecated Use `toolOutcome`. Kept for compatibility with existing timeline consumers. */
	toolSuccess?: boolean;
	workflowId?: string;
	workflowName?: string;
	workflowExecutionId?: string;
	workflowTriggerType?: string;
	nodeType?: string;
	nodeTypeVersion?: number;
	nodeDisplayName?: string;
	/** Request and response data correlated across a suspended tool call. */
	hitlRequestType?: HitlRequestType;
	hitlRequest?: unknown;
	hitlResponse?: unknown;
	hitlResponseStatus?: HitlResponseStatus;
	hitlToolDisplayName?: string;
	/**
	 * Configured node parameters from the agent's JSON config (only set for
	 * `kind: 'node'`). Surfaced in the IO viewer so the user can see the node's
	 * actual config — channel, operation, `$fromAI(...)` templates — alongside
	 * the LLM's runtime input items.
	 */
	nodeParameters?: Record<string, unknown>;
	/**
	 * Resolved display name for a `delegate_subagent` tool call — the configured
	 * sub-agent's name, falling back to the humanized task name. Set by the view
	 * so the row/chart/detail can render "Sub-agent · <name>".
	 */
	subAgentName?: string;
	resumed?: boolean;
}

export interface IdleRange {
	start: number;
	end: number;
}

interface BaseFilterOption {
	key: string;
	label: string;
	count: number;
}

export type FilterOption =
	| (BaseFilterOption & { presentation: 'swatch'; color: string })
	| (BaseFilterOption & {
			presentation: 'badge';
			badgeTheme: 'default' | 'success' | 'danger';
	  });
