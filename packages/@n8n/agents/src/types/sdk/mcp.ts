export type McpVerifyResult =
	| { ok: true; servers: Array<{ name: string; tools: number }> }
	| { ok: false; errors: Array<{ server: string; error: string }> };

export interface McpServerConfig {
	/** Display name used as a tool name prefix. Must be unique across all `.mcp()` calls. */
	name: string;

	// URL-based transports (exactly one of url or command must be provided)
	/** Server endpoint URL for SSE or Streamable HTTP transport. */
	url?: string;
	/** Transport type for URL-based servers. Defaults to 'sse'. */
	transport?: 'sse' | 'streamableHttp';

	// Stdio transport
	/** Command to spawn for stdio transport. */
	command?: string;
	args?: string[];
	env?: Record<string, string>;

	/** Optional auth headers for URL-based transports. */
	headers?: Record<string, string>;

	/**
	 * Maximum time in milliseconds to wait for this server connection (transport
	 * start and MCP initialize). When omitted, the MCP SDK default applies for
	 * the initialize request (60s); the transport layer has no explicit cap.
	 */
	connectionTimeoutMs?: number;

	/**
	 * Require human-in-the-loop approval for tool calls from this server.
	 *
	 * - `true` — every tool from this server requires approval before execution.
	 * - `string[]` — only the listed tools (by their original, un-prefixed names)
	 *   require approval; all other tools from the server run without interruption.
	 * - `false` / omitted — no approval requirement.
	 */
	requireApproval?: string[] | boolean;

	/**
	 * Custom fetch implementation used by URL-based transports (SSE,
	 * StreamableHTTP).
	 * Ignored for stdio transport. When omitted, the SDK transports fall back
	 * to the global `fetch`.
	 */
	fetch?: typeof fetch;

	/**
	 * Restrict which tools from this server are surfaced to the agent.
	 *
	 * Tools are matched by their original (un-prefixed) name.
	 *
	 * - `{ mode: 'allow', tools: [...] }` — only the listed tools are surfaced.
	 * - `{ mode: 'exclude', tools: [...] }` — every tool except the listed ones
	 *   is surfaced.
	 * - omitted — every tool the server advertises is surfaced.
	 *
	 * An empty `tools` array is a no-op for both modes — i.e. an empty allow
	 * list does not hide everything, and an empty exclude list does not hide
	 * anything. This matches the JSON-config semantics ("no filter applied"
	 * is expressed by omitting the field).
	 */
	toolFilter?: { mode: 'allow' | 'exclude'; tools: string[] };
}
