import type { RuntimeSkill } from '@n8n/agents';
import { ASK_QUESTION_TOOL_NAME } from '@n8n/api-types';

export function mcpSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-mcp',
		name: 'Agent builder MCP servers',
		description:
			'Use when adding, removing, or updating MCP (Model Context Protocol) servers on the target agent.',
		instructions: `\
MCP servers expose external tool catalogs to the target agent over HTTP. They
live on the top-level \`mcpServers\` array. Each entry
maps 1:1 to a connected MCP server.

When to use MCP vs n8n tools:
- Prefer existing n8n workflow / node tools when the integration is already
  available — they execute inside the n8n runtime with full credential handling.
- Use MCP when the user names a specific MCP server (e.g. "GitHub MCP",
  "Slack MCP", "Notion MCP") or when no equivalent workflow/node tool exists.

Each mcpServers[] entry has the following properties:
- \`name\` (required, unique within mcpServers, 1-64 chars, /^[A-Za-z0-9_-]+$/)
- \`url\` (required)
- \`transport\`: \`"sse"\` | \`"streamableHttp"\` (default \`"streamableHttp"\`)
- \`authentication\`: \`"none"\` | \`"bearerAuth"\` | \`"headerAuth"\` |
  \`"multipleHeadersAuth"\` | \`"mcpOAuth2Api"\` (default \`"none"\`)
- \`credential\`: required when authentication !== \`"none"\` — the id returned
  by \`ask_credential\`
- \`toolFilter\` (optional): \`{ mode: "allow" | "exclude", tools: string[] }\`
  matched against original (un-prefixed) tool names.
- \`approval\` (optional): \`{ mode: "global" }\` for all tools, or
  \`{ mode: "selected", tools: [...] }\` for specific tools (must be non-empty)
- \`connectionTimeoutMs\` (optional): 1–120000

Credential flow:
- For \`bearerAuth\` -> \`ask_credential\` with \`credentialType: "httpBearerAuth"\`.
- For \`headerAuth\` -> \`ask_credential\` with \`credentialType: "httpHeaderAuth"\`.
- For \`multipleHeadersAuth\` -> \`ask_credential\` with
  \`credentialType: "httpMultipleHeadersAuth"\`.
- For \`mcpOAuth2Api\` -> \`ask_credential\` with \`credentialType: "mcpOAuth2Api"\`.
- Never invent credential IDs. If the user declines, omit the server entirely
  rather than persisting a stub.

Testing the connection:
Before writing to config, call \`verify_mcp_server\` with the server name, URL,
transport, and (if applicable) the credential id from \`ask_credential\`. On
success it returns \`{ ok: true, tools: [{ name, description }] }\` — the tool
list can be used to populate \`toolFilter.tools\` or \`approval.tools\` without
the user having to type tool names by hand. On failure it returns
\`{ ok: false, error: "..." }\`. If verification fails, explain the error and
ask the user to check the URL or credentials before proceeding.

Selecting credentials:
When connection test without credentials fails and you don't know which credential to use, ask the user which credential type to use: OAuth2, Bearer Token, Header Auth, Multiple Headers Auth, or None. 
Use \`${ASK_QUESTION_TOOL_NAME}\` for asking the question. Based on response, call \`ask_credential\` with the appropriate credential type.

Patch pattern (two-step):
1. Initialize the array if missing:
   \`{ "op": "add", "path": "/mcpServers", "value": [] }\`
2. Append each server:
   \`{ "op": "add", "path": "/mcpServers/-", "value": { ... } }\`

Constraints:
- Server \`name\` must be unique across \`mcpServers\` within an agent.`,
	};
}
