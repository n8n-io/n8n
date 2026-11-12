import { z } from 'zod';

/**
 * PostHog flag that turns on safe testing for agents. With the flag on, draft
 * runs of an agent are test runs: tool calls go to a simulation and nothing is
 * sent to a real service. It is separate from `101_agent_evals`.
 */
export const AGENT_SAFE_TESTING_FLAG = '140_agent_safe_testing';

/** How one tool call ran in a test run. */
export const toolCallRouteSchema = z.enum([
	// A read sent to the real service, on purpose.
	'real_read',
	// Answered by the simulation from seeded or earlier state.
	'simulated',
	// Answered with a reply that an LLM invented.
	'simulated_made_up',
	// Not run. Nothing was sent.
	'blocked',
]);
export type ToolCallRoute = z.infer<typeof toolCallRouteSchema>;

/** Why a tool call took its route. */
export const toolCallReasonSchema = z.enum([
	'served_from_world',
	'invented_by_llm',
	'real_read_allowed',
	// The simulator cannot serve this call, for example it returned 501.
	// This is a gap in the simulator, not an agent failure.
	'unsupported_by_simulator',
	// The simulator is down, timed out or failed.
	'simulator_unavailable',
	// n8n cannot send this tool through a simulator at all.
	'not_simulatable',
	// A rule blocked the call.
	'blocked_by_policy',
]);
export type ToolCallReason = z.infer<typeof toolCallReasonSchema>;

export const toolCallSimulationSchema = z.object({
	route: toolCallRouteSchema,
	reason: toolCallReasonSchema,
	/** Short detail that is safe to show to the user. */
	detail: z.string().optional(),
});
export type ToolCallSimulation = z.infer<typeof toolCallSimulationSchema>;

/** Before a run: can this tool be tested, and how. */
export const toolTestabilitySchema = z.enum(['simulated', 'read_for_real', 'blocked']);
export type ToolTestability = z.infer<typeof toolTestabilitySchema>;

export const toolTestKindSchema = z.enum([
	'node',
	'workflow',
	'custom',
	'mcp',
	'integration',
	'web_search',
	'other',
]);
export type ToolTestKind = z.infer<typeof toolTestKindSchema>;

export const toolTestCapabilitySchema = z.object({
	/** The name the model calls. For an MCP server, the server name. */
	toolName: z.string(),
	kind: toolTestKindSchema,
	testability: toolTestabilitySchema,
	/** Set when the tool is blocked. */
	reason: toolCallReasonSchema.optional(),
	detail: z.string().optional(),
});
export type ToolTestCapability = z.infer<typeof toolTestCapabilitySchema>;
