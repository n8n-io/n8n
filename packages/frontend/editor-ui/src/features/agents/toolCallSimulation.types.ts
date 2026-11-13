// Mirrors `toolCallSimulationSchema` in
// `packages/@n8n/api-types/src/schemas/agent-safe-testing.schema.ts` (safe testing backend stack).
// Replace these local types with the `@n8n/api-types` import once that schema lands on master.

/** How one tool call ran in a test run. */
export type ToolCallRoute = 'real_read' | 'simulated' | 'simulated_made_up' | 'blocked';

/** Why a tool call took its route. */
export type ToolCallReason =
	| 'served_from_world'
	| 'invented_by_llm'
	| 'real_read_allowed'
	/** A simulator gap (for example a 501), not an agent failure. */
	| 'unsupported_by_simulator'
	/** The simulator is down, timed out or failed. */
	| 'simulator_unavailable'
	/** No simulator can serve this kind of tool (custom code, file nodes...). */
	| 'not_simulatable'
	| 'blocked_by_policy';

export interface ToolCallSimulation {
	route: ToolCallRoute;
	reason: ToolCallReason;
	/** Short detail that is safe to show to the user. */
	detail?: string;
}

// Frontend-only below.

/** One tool call of a turn, as `AgentToolCallRouteList` shows it. */
export interface AgentToolCallRouteItem {
	toolCallId: string;
	/** The name to show. Long names are truncated, with the full name on hover. */
	toolName: string;
	/** Missing when the call has no result yet or did not run in a test run. */
	simulation?: ToolCallSimulation;
}
