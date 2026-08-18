export type AgentSessionStatus = 'running' | 'succeeded' | 'error' | 'cancelled' | 'interrupted';

export type AgentSessionOrigin =
	| 'preview'
	| 'instance-ai'
	| 'mcp'
	| 'sub-agent'
	| 'schedule'
	| 'workflow'
	| 'slack'
	| 'telegram'
	| 'linear'
	| 'discord';

export interface AgentSessionFilters {
	status?: AgentSessionStatus;
	origin?: AgentSessionOrigin;
	updatedAfter?: Date;
	updatedBefore?: Date;
}
