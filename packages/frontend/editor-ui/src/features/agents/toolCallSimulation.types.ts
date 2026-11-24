import type {
	ToolCallEvidence,
	ToolCallReason,
	ToolCallRoute,
	ToolCallSimulation,
} from '@n8n/api-types';

export type { ToolCallEvidence, ToolCallReason, ToolCallRoute, ToolCallSimulation };

/** One tool call of a turn, as `AgentToolCallRouteList` shows it. */
export interface AgentToolCallRouteItem {
	toolCallId: string;
	/** The name to show. Long names are truncated, with the full name on hover. */
	toolName: string;
	/** Missing when the call has no result yet or did not run in a test run. */
	simulation?: ToolCallSimulation;
}
