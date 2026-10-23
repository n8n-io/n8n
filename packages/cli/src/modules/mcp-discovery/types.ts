// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
export interface McpDiscoveryState {
	status: 'inactive' | 'unknown' | 'waiting' | 'excluded' | 'assigned';
	eligibleAt?: number;
	hasConnectedClaude?: boolean;
	hasUsedMcp?: boolean;
}
// EOF Experiment cleanup
