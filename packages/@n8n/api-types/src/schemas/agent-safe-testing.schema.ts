import { z } from 'zod';

/** PostHog flag: agent draft runs are test runs that send nothing to real services. */
export const AGENT_SAFE_TESTING_FLAG = '140_agent_safe_testing';

/**
 * How a preview chat runs, chosen when it starts. `test` sends every tool call to a
 * simulation; `live` runs the draft against real services, as before safe testing.
 * Live is the default until the panel can show test runs.
 */
export const agentChatModeSchema = z.enum(['test', 'live']);
export type AgentChatMode = z.infer<typeof agentChatModeSchema>;

/** How one tool call ran in a test run. */
export const toolCallRouteSchema = z.enum([
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
	// A simulator gap (for example a 501), not an agent failure.
	'unsupported_by_simulator',
	// The simulator is down, timed out or failed.
	'simulator_unavailable',
	// No simulator can serve this kind of tool.
	'not_simulatable',
]);
export type ToolCallReason = z.infer<typeof toolCallReasonSchema>;

/** Why a call or a tool is blocked. */
export const blockedReasonSchema = z.enum([
	'unsupported_by_simulator',
	'simulator_unavailable',
	'not_simulatable',
]);

/**
 * What a served tool call did, as the simulation backend reports it. A closed list: it never
 * carries request or reply data. The names hold for any backend.
 */
export const toolCallEvidenceSchema = z.enum([
	// Read from the real service. Nothing was written to it.
	'real_read',
	// Read from the simulated world.
	'world_read',
	// Wrote to the simulated world only.
	'world_write',
]);
export type ToolCallEvidence = z.infer<typeof toolCallEvidenceSchema>;

/** The reasons that fit each route, so a payload cannot claim a blocked call was served. */
const REASONS_BY_ROUTE: Record<ToolCallRoute, readonly ToolCallReason[]> = {
	simulated: ['served_from_world'],
	simulated_made_up: ['invented_by_llm'],
	blocked: blockedReasonSchema.options,
};

export const toolCallSimulationSchema = z
	.object({
		route: toolCallRouteSchema,
		reason: toolCallReasonSchema,
		/** Short detail that is safe to show to the user. */
		detail: z.string().optional(),
		/** Each value at most once, in the order of the enum. Absent when the backend reports none. */
		evidence: z
			.array(toolCallEvidenceSchema)
			.min(1)
			.refine(
				(items) =>
					items.every(
						(item, index) =>
							index === 0 ||
							toolCallEvidenceSchema.options.indexOf(items[index - 1]) <
								toolCallEvidenceSchema.options.indexOf(item),
					),
				{ message: 'Evidence holds each value at most once, in the order of the enum' },
			)
			.optional(),
	})
	.refine(({ route, reason }) => REASONS_BY_ROUTE[route].includes(reason), {
		message: 'The reason does not fit the route',
		path: ['reason'],
	})
	.refine(({ route, evidence }) => route !== 'blocked' || evidence === undefined, {
		message: 'A blocked call has no evidence',
		path: ['evidence'],
	});
export type ToolCallSimulation = z.infer<typeof toolCallSimulationSchema>;

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

const toolTestCapabilityBase = {
	/** The name the model calls. For an MCP server, the server name. */
	toolName: z.string(),
	kind: toolTestKindSchema,
};

/** A simulated tool has no reason. A blocked tool always says why. */
export const toolTestCapabilitySchema = z.discriminatedUnion('testability', [
	z.object({ ...toolTestCapabilityBase, testability: z.literal('simulated') }),
	z.object({
		...toolTestCapabilityBase,
		testability: z.literal('blocked'),
		reason: blockedReasonSchema,
		detail: z.string().optional(),
	}),
]);
export type ToolTestCapability = z.infer<typeof toolTestCapabilitySchema>;
/** Before a run: can this tool be tested. */
export type ToolTestability = ToolTestCapability['testability'];

export interface AgentTestRunToolsResponse {
	tools: ToolTestCapability[];
}
