import type { RuntimeSkill } from '@n8n/agents';
import { ASK_QUESTION_TOOL_NAME } from '@n8n/api-types';

export function mcpSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-mcp',
		name: 'Agent builder MCP servers',
		description:
			'Use when adding, removing, or updating MCP (Model Context Protocol) servers on the target agent.',
		instructions: `\
## Purpose

Use this to manage external MCP server connections in the target agent config.
MCP servers expose external tool catalogs to the target agent over HTTP. They
live on the top-level \`mcpServers\` array, and each entry maps 1:1 to a
connected MCP server.

## Boundaries

- Prefer existing n8n workflow or node tools when the integration is already
  available, since they execute inside the n8n runtime with full credential
  handling.
- Use MCP when the user names a specific MCP server (for example "GitHub MCP",
  "Slack MCP", or "Notion MCP"), or when no equivalent workflow or node tool
  exists.

## Workflow

Each \`mcpServers[]\` entry supports:

- \`name\` (required, unique within \`mcpServers\`, 1-64 chars, /^[A-Za-z0-9_-]+$/)
- \`url\` (required)
- \`transport\`: \`"sse"\` | \`"streamableHttp"\` (default \`"streamableHttp"\`)
- \`authentication\`: \`"none"\` | \`"bearerAuth"\` | \`"headerAuth"\` |
  \`"multipleHeadersAuth"\` | \`"mcpOAuth2Api"\` |
  string ending in \`"McpOAuth2Api"\` (default \`"none"\`)
- \`credential\`: required when authentication !== \`"none"\` (must be the id
  returned by \`ask_credential\`)
- \`toolFilter\` (optional): \`{ mode: "allow" | "exclude", tools: string[] }\`,
  matched against original (un-prefixed) tool names
- \`approval\` (optional): \`{ mode: "global" }\` for all tools, or
  \`{ mode: "selected", tools: [...] }\` for specific tools (must be non-empty)
- \`connectionTimeoutMs\` (optional): 1-120000
- \`metadata\` (optional): optional server-generated metadata. Do not use this
  field unless explicitly instructed to do so by instructions

### Credential flow

- For \`bearerAuth\`, call \`ask_credential\` with
  \`credentialType: "httpBearerAuth"\`.
- For \`headerAuth\`, call \`ask_credential\` with
  \`credentialType: "httpHeaderAuth"\`.
- For \`multipleHeadersAuth\`, call \`ask_credential\` with
  \`credentialType: "httpMultipleHeadersAuth"\`.
- For \`mcpOAuth2Api\`, call \`ask_credential\` with
  \`credentialType: "mcpOAuth2Api"\`.
- Never invent credential IDs. If the user declines, omit the server entirely
  rather than persisting a stub.

### Testing the connection

Before writing to config, call \`verify_mcp_server\` with server \`name\`,
\`url\`, \`transport\`, and (if applicable) the credential id from
\`ask_credential\`.

- Success returns \`{ ok: true, tools: [{ name, description }] }\`.
- Use the returned tool list to populate \`toolFilter.tools\` or
  \`approval.tools\` so the user does not need to type tool names manually.
- Failure returns \`{ ok: false, error: "..." }\`.
- If verification fails, explain the error and ask the user to check the URL
  or credentials before proceeding.

### Selecting credentials

When connection testing without credentials fails and you do not know which
credential type to use, ask the user which credential type to use: OAuth2,
Bearer Token, Header Auth, Multiple Headers Auth, or None. Use
\`${ASK_QUESTION_TOOL_NAME}\` to ask. Based on the response, call
\`ask_credential\` with the appropriate credential type.

### Patch pattern

1. Initialize the array if missing:
   \`{ "op": "add", "path": "/mcpServers", "value": [] }\`
2. Append each server:
   \`{ "op": "add", "path": "/mcpServers/-", "value": { ... } }\`

## Gotchas

- Server \`name\` must be unique across \`mcpServers\` within an agent.`,
	};
}
