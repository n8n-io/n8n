export type EventKind = 'user' | 'agent' | 'tool' | 'workflow' | 'working-memory' | 'suspension';

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
