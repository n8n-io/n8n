import type { FetchFn } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { jsonParse } from 'n8n-workflow';

import { buildDateAnchors } from './date-anchors';
import { generateJson, resolveUrl } from './mock-utils';

// ---------------------------------------------------------------------------
// Mock MCP server, served straight through the agent runtime's injectable MCP
// fetch. Speaks enough of the streamable-HTTP JSON-RPC protocol to satisfy the
// official @modelcontextprotocol/sdk client (initialize handshake, 202 for
// notifications, 405 for the optional GET SSE stream), answers `tools/list`
// with an LLM-designed catalog (stable per server per run) and `tools/call`
// with LLM-generated results steered by the scenario — the MCP counterpart of
// the HTTP mock handler.
// ---------------------------------------------------------------------------

export interface McpMockServerInfo {
	/** Config server name — also the tool-name prefix the SDK client applies. */
	name: string;
	url: string;
	description?: string;
}

export interface McpMockToolCall {
	serverName: string;
	/** Un-prefixed tool name as the server exposes it. */
	toolName: string;
	args: unknown;
	result: unknown;
}

export interface McpMockCanonicalTool {
	name: string;
	description: string;
}

export interface McpMockFetchOptions {
	servers: McpMockServerInfo[];
	agentInstructions: string;
	scenarioHints?: string;
	globalContext?: string;
	/** Per-server data hints from the scenario seed, keyed by server name. */
	serverHints?: Record<string, string>;
	/**
	 * Canonical tool catalogs keyed by server name (e.g. from the MCP
	 * registry). When present, the mock exposes EXACTLY these tools — the LLM
	 * only designs their input schemas — so the mock matches the server as the
	 * builder set it up instead of inventing a catalog.
	 */
	knownToolsByServer?: Record<string, McpMockCanonicalTool[]>;
	onToolCall: (call: McpMockToolCall) => void;
	logger: Logger;
}

interface McpMockTool {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

const MAX_PRIOR_CALL_CONTEXT_CHARS = 2_000;
const MOCK_SESSION_ID = 'eval-mock-session';

const TOOLS_LIST_PROMPT = `You design the tool catalog a mocked MCP server exposes during an automated eval run. An AI agent (whose instructions you are given) will connect to this server and call its tools; an API mock will answer those calls later.

RULES:
1. Expose 1-4 tools — exactly the capabilities the agent's instructions expect from THIS server, nothing speculative.
2. Tool names: short snake_case, WITHOUT any server-name prefix (the client adds it).
3. Each tool needs a one-sentence description and an "inputSchema": a JSON Schema object with "type": "object", simple "properties" (string/number/boolean), and a "required" array. Keep schemas minimal — 1-3 properties.
4. If a "Server data hint" or "Test Scenario" is provided, the catalog must make that scenario playable (e.g. a lookup scenario needs a lookup tool).
5. **When a "## Canonical tools" section is provided, the catalog is FIXED**: return exactly those tool names with those descriptions, in that order — your job is ONLY to design each tool's inputSchema.
6. Return ONLY valid JSON: { "tools": [ { "name", "description", "inputSchema" } ] }`;

const TOOL_CALL_PROMPT = `You simulate ONE tool invocation on a mocked MCP server during an automated eval run. Given the tool, its arguments, and the scenario context, produce the exact result the real server would return.

RULES:
1. **The Test Scenario and Server data hint are authoritative.** Honor their exact names, values, counts, and error conditions. When they mandate an error for this request, return { "isError": true, "text": "<the error>" }.
2. Return realistic, concrete content — the actual data a real server would produce, not a description of it. Small result sets (1-3 items) unless the scenario demands otherwise.
3. Stay consistent with the Global context and with the PRIOR CALLS listed (same entities, ids, and dates across calls).
4. Every date you emit derives from the "## Date anchors" block, never from training data.
5. Return ONLY valid JSON: { "text": "<the tool result as the server would render it>" } or { "isError": true, "text": "<error message>" }.`;

function validateToolsList(parsed: unknown): McpMockTool[] | undefined {
	if (parsed === null || typeof parsed !== 'object') return undefined;
	const tools = (parsed as Record<string, unknown>).tools;
	if (!Array.isArray(tools) || tools.length === 0) return undefined;
	const valid: McpMockTool[] = [];
	for (const entry of tools) {
		if (entry === null || typeof entry !== 'object') continue;
		const tool = entry as Record<string, unknown>;
		if (typeof tool.name !== 'string' || tool.name.length === 0) continue;
		// Providers reject tool schemas whose top level isn't `type: object` —
		// fall back to a permissive one rather than breaking the model turn.
		const generatedSchema =
			tool.inputSchema !== null &&
			typeof tool.inputSchema === 'object' &&
			(tool.inputSchema as Record<string, unknown>).type === 'object'
				? (tool.inputSchema as Record<string, unknown>)
				: { type: 'object', properties: {} };
		valid.push({
			name: tool.name,
			description: typeof tool.description === 'string' ? tool.description : tool.name,
			inputSchema: generatedSchema,
		});
	}
	return valid.length > 0 ? valid : undefined;
}

function validateToolResult(parsed: unknown): { text: string; isError: boolean } | undefined {
	if (parsed === null || typeof parsed !== 'object') return undefined;
	const record = parsed as Record<string, unknown>;
	if (typeof record.text !== 'string' || record.text.length === 0) return undefined;
	return { text: record.text, isError: record.isError === true };
}

function jsonRpcResponse(id: unknown, result: unknown, headers?: Record<string, string>): Response {
	return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
		status: 200,
		headers: { 'content-type': 'application/json', ...headers },
	});
}

function jsonRpcError(id: unknown, code: number, message: string): Response {
	return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
}

export function createMcpMockFetch(options: McpMockFetchOptions): FetchFn {
	const { logger } = options;
	const toolsByServer = new Map<string, Promise<McpMockTool[]>>();
	const resultCache = new Map<string, Promise<{ text: string; isError: boolean }>>();
	// Rolling record of prior calls per server, fed back for cross-call consistency.
	const priorCallsByServer = new Map<string, string[]>();

	function resolveServer(url: string): McpMockServerInfo {
		// Require a path boundary after the prefix so one server's URL can't
		// swallow another's (…/mcp vs …/mcp-two).
		const match = options.servers.find(
			(server) => url === server.url || url.startsWith(`${server.url.replace(/\/+$/, '')}/`),
		);
		if (match) return match;
		try {
			return { name: new URL(url).hostname, url };
		} catch {
			return { name: 'unknown-mcp-server', url };
		}
	}

	function scenarioSections(server: McpMockServerInfo): string[] {
		const sections: string[] = [];
		const hint = options.serverHints?.[server.name];
		if (hint) sections.push('', '## Server data hint', '', hint);
		if (options.globalContext) sections.push('', '## Global context', '', options.globalContext);
		if (options.scenarioHints) sections.push('', '## Test Scenario', '', options.scenarioHints);
		return sections;
	}

	/** Force the generated catalog onto the canonical names when they're known. */
	function coerceToCanonical(
		generated: McpMockTool[] | undefined,
		canonical: McpMockCanonicalTool[],
	): McpMockTool[] {
		const schemasByName = new Map((generated ?? []).map((tool) => [tool.name, tool.inputSchema]));
		return canonical.map((tool) => ({
			name: tool.name,
			description: tool.description,
			inputSchema: schemasByName.get(tool.name) ?? { type: 'object', properties: {} },
		}));
	}

	async function getTools(server: McpMockServerInfo): Promise<McpMockTool[]> {
		let cached = toolsByServer.get(server.name);
		if (!cached) {
			cached = (async () => {
				const canonical = options.knownToolsByServer?.[server.name];
				const sections = [
					`Design the tool catalog for the MCP server "${server.name}"${server.description ? ` (${server.description})` : ''} at ${server.url}.`,
					'',
					'## Agent instructions (what the agent expects from this server)',
					'',
					options.agentInstructions.slice(0, 3_000),
					...(canonical && canonical.length > 0
						? [
								'',
								'## Canonical tools (the catalog is FIXED to exactly these)',
								'',
								...canonical.map((tool) => `- ${tool.name}: ${tool.description}`),
							]
						: []),
					...scenarioSections(server),
				];
				const tools = await generateJson(
					'eval-mcp-tools-list',
					TOOLS_LIST_PROMPT,
					sections.join('\n'),
					validateToolsList,
					logger,
				);
				// Canonical catalogs (from the MCP registry) are authoritative: the
				// real server exposes these names, so the mock must too, whatever
				// the generator returned.
				if (canonical && canonical.length > 0) {
					const coerced = coerceToCanonical(tools, canonical);
					logger.debug(
						`[EvalMcpMock] ${server.name} exposes canonical catalog: ${coerced.map((tool) => tool.name).join(', ')}`,
					);
					return coerced;
				}
				if (tools) {
					logger.debug(
						`[EvalMcpMock] ${server.name} exposes: ${tools.map((tool) => tool.name).join(', ')}`,
					);
					return tools;
				}
				// A degenerate-but-valid catalog keeps the run alive; the verifier
				// sees the generic calls and can attribute oddities to the mock.
				logger.warn(
					`[EvalMcpMock] Tool catalog generation failed for ${server.name} — using a generic fallback tool`,
				);
				return [
					{
						name: 'query',
						description: `Query the ${server.name} server`,
						inputSchema: {
							type: 'object',
							properties: { query: { type: 'string', description: 'The query' } },
							required: ['query'],
						},
					},
				];
			})();
			toolsByServer.set(server.name, cached);
		}
		return await cached;
	}

	async function callTool(
		server: McpMockServerInfo,
		toolName: string,
		args: unknown,
	): Promise<{ text: string; isError: boolean }> {
		const cacheKey = `${server.name}:${toolName}:${JSON.stringify(args ?? {})}`;
		let cached = resultCache.get(cacheKey);
		if (!cached) {
			cached = (async () => {
				const tools = await getTools(server);
				const tool = tools.find((entry) => entry.name === toolName);
				const prior = priorCallsByServer.get(server.name) ?? [];
				const sections = [
					`Simulate the MCP tool "${toolName}" on server "${server.name}".`,
					'',
					'## Tool',
					'',
					JSON.stringify(tool ?? { name: toolName }, null, 1),
					'',
					'## Arguments',
					'',
					JSON.stringify(args ?? {}, null, 1),
					...scenarioSections(server),
					...(prior.length > 0
						? ['', '## Prior calls this run (stay consistent with these)', '', ...prior]
						: []),
					'',
					'## Date anchors',
					buildDateAnchors(new Date()),
				];
				const generated = await generateJson(
					'eval-mcp-tool-call',
					TOOL_CALL_PROMPT,
					sections.join('\n'),
					validateToolResult,
					logger,
				);
				return (
					generated ?? {
						text: `Mock generation failed for MCP tool "${toolName}" — treat this scenario failure as a framework issue, not agent behaviour.`,
						isError: true,
					}
				);
			})();
			resultCache.set(cacheKey, cached);
		}
		const result = await cached;
		const priorEntries = priorCallsByServer.get(server.name) ?? [];
		const entry = `- ${toolName}(${JSON.stringify(args ?? {}).slice(0, 300)}) -> ${result.text.slice(0, 300)}`;
		// Repeat (cache-hit) calls add no new information — don't duplicate them.
		if (
			!priorEntries.includes(entry) &&
			priorEntries.join('\n').length < MAX_PRIOR_CALL_CONTEXT_CHARS
		) {
			priorEntries.push(entry);
			priorCallsByServer.set(server.name, priorEntries);
		}
		return result;
	}

	return async (input, init) => {
		const url = resolveUrl(input);
		const method = (init?.method ?? 'GET').toUpperCase();
		const server = resolveServer(url);

		// The client MAY open a standalone SSE stream with GET — 405 is the
		// spec-blessed "not supported" answer, handled cleanly by the SDK.
		if (method === 'GET') return new Response(null, { status: 405 });
		if (method === 'DELETE') return new Response(null, { status: 200 });
		if (method !== 'POST') return new Response(null, { status: 405 });

		const rawBody = typeof init?.body === 'string' ? init.body : '';
		const message = jsonParse<Record<string, unknown> | null>(rawBody, { fallbackValue: null });
		if (message === null || typeof message !== 'object') {
			return jsonRpcError(null, -32700, 'Parse error');
		}
		const { id, method: rpcMethod, params } = message;

		// Notifications (no id) get 202 Accepted with no body.
		if (id === undefined || id === null) return new Response(null, { status: 202 });

		try {
			switch (rpcMethod) {
				case 'initialize': {
					const requested =
						params !== null &&
						typeof params === 'object' &&
						typeof (params as Record<string, unknown>).protocolVersion === 'string'
							? ((params as Record<string, unknown>).protocolVersion as string)
							: '2025-06-18';
					return jsonRpcResponse(
						id,
						{
							protocolVersion: requested,
							capabilities: { tools: { listChanged: false } },
							serverInfo: { name: server.name, version: '1.0.0-eval-mock' },
						},
						{ 'mcp-session-id': MOCK_SESSION_ID },
					);
				}
				case 'ping':
					return jsonRpcResponse(id, {});
				case 'tools/list':
					return jsonRpcResponse(id, { tools: await getTools(server) });
				case 'tools/call': {
					const callParams =
						params !== null && typeof params === 'object'
							? (params as Record<string, unknown>)
							: {};
					const toolName = typeof callParams.name === 'string' ? callParams.name : 'unknown';
					const args = callParams.arguments ?? {};
					const result = await callTool(server, toolName, args);
					options.onToolCall({ serverName: server.name, toolName, args, result });
					return jsonRpcResponse(id, {
						content: [{ type: 'text', text: result.text }],
						...(result.isError ? { isError: true } : {}),
					});
				}
				case 'resources/list':
					return jsonRpcResponse(id, { resources: [] });
				case 'resources/templates/list':
					return jsonRpcResponse(id, { resourceTemplates: [] });
				case 'prompts/list':
					return jsonRpcResponse(id, { prompts: [] });
				default:
					return jsonRpcError(id, -32601, `Method not found: ${String(rpcMethod)}`);
			}
		} catch (error) {
			const messageText = error instanceof Error ? error.message : String(error);
			logger.warn(`[EvalMcpMock] ${server.name} ${String(rpcMethod)} failed: ${messageText}`);
			return jsonRpcError(id, -32603, messageText);
		}
	};
}
