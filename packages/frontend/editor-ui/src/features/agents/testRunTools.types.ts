/**
 * Testability of each Agent tool in a test run.
 *
 * These types mirror `packages/@n8n/api-types/src/schemas/agent-safe-testing.schema.ts`, which
 * `GET /projects/:projectId/agents/v2/:agentId/test-run/tools` returns. Replace them with the
 * `@n8n/api-types` import once that schema lands.
 */

export type ToolTestability = 'simulated' | 'blocked';

export type ToolTestKind =
	| 'node'
	| 'workflow'
	| 'custom'
	| 'mcp'
	| 'integration'
	| 'web_search'
	| 'other';

export type ToolCallReason =
	| 'served_from_world'
	| 'invented_by_llm'
	| 'unsupported_by_simulator'
	| 'simulator_unavailable'
	| 'not_simulatable';

export interface ToolTestCapability {
	/** The name the model calls. For an MCP server, the server name. */
	toolName: string;
	kind: ToolTestKind;
	testability: ToolTestability;
	/** Explains why the tool is blocked. */
	reason?: ToolCallReason;
	/** Short and safe to show. */
	detail?: string;
}
