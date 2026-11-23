/**
 * Testability of each Agent tool in a test run.
 *
 * These types mirror `packages/@n8n/api-types/src/schemas/agent-safe-testing.schema.ts`, which
 * `GET /projects/:projectId/agents/v2/:agentId/test-run/tools` returns. Replace them with the
 * `@n8n/api-types` import once that schema lands.
 */

export type ToolTestKind =
	| 'node'
	| 'workflow'
	| 'custom'
	| 'mcp'
	| 'integration'
	| 'web_search'
	| 'other';

/** Why a tool is blocked. */
export type BlockedReason =
	| 'unsupported_by_simulator'
	| 'simulator_unavailable'
	| 'not_simulatable';

interface ToolTestCapabilityBase {
	/** The name the model calls. For an MCP server, the server name. */
	toolName: string;
	kind: ToolTestKind;
}

/** A simulated tool has no reason. A blocked tool always says why. */
export type ToolTestCapability =
	| (ToolTestCapabilityBase & { testability: 'simulated' })
	| (ToolTestCapabilityBase & {
			testability: 'blocked';
			reason: BlockedReason;
			/** Short and safe to show. */
			detail?: string;
	  });

export type ToolTestability = ToolTestCapability['testability'];
