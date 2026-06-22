import type { RuntimeSkill } from '@n8n/agents';
import { ASK_QUESTION_TOOL_NAME, McpServerConfigSchema } from '@n8n/api-types';
import type { JSONSchema7 } from 'json-schema';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { jsonSchemaToCompactText } from '../../json-config/schema-text-serializer';

const mcpServerSchemaText = jsonSchemaToCompactText(
	zodToJsonSchema(McpServerConfigSchema) as JSONSchema7,
);

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

## Use when:

- The user asks for an external integration and you need to discover/connect an MCP server for it.
- The user asks to edit the target agent's MCP servers.
- The users wants to add a custom MCP server.

## Workflow

### Discovery and setup

Follow these steps in order when adding an MCP server:

1. Search: call \`search_mcp_servers\` with queries matching the requested
   integration (for example \`["github"]\`, \`["slack"]\`).
   The result includes \`name\`, \`url\`, \`transport\`, \`authentication\`,
   \`credentialType\`, \`tools\`, and optional \`metadata\`.
2. Credential: for registry results, call \`ask_credential\` with the returned
   \`credentialType\`. Never invent credential IDs.
3. Verify: call \`verify_mcp_server\` with \`name\`, \`url\`, \`transport\`,
   \`authentication\`, and (if applicable) \`credential\`.
4. Write config: call \`read_config\`, then \`patch_config\` to add the entry
   to \`mcpServers[]\` using the patch pattern below.

If \`search_mcp_servers\` returns no matches and the user provides a custom
server URL, skip the search result mapping and continue with manual
transport/authentication plus credential selection.

Full schema reference:

${mcpServerSchemaText}

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

When using a registry-backed server, always use the \`credentialType\` returned
by \`search_mcp_servers\`.

For custom MCP servers, if credential type is unknown, ask the user which
credential type to use (OAuth2, Bearer Token, Header Auth, Multiple Headers
Auth, or None) via \`${ASK_QUESTION_TOOL_NAME}\`. Then map to:

- \`bearerAuth\` -> \`ask_credential\` with \`credentialType: "httpBearerAuth"\`
- \`headerAuth\` -> \`ask_credential\` with \`credentialType: "httpHeaderAuth"\`
- \`multipleHeadersAuth\` -> \`ask_credential\` with
  \`credentialType: "httpMultipleHeadersAuth"\`
- \`mcpOAuth2Api\` -> \`ask_credential\` with \`credentialType: "mcpOAuth2Api"\`

### Patch pattern

1. Initialize the array if missing:
   \`{ "op": "add", "path": "/mcpServers", "value": [] }\`
2. Append each server:
   \`{ "op": "add", "path": "/mcpServers/-", "value": { ... } }\`

## Gotchas

- Server \`name\` must be unique across \`mcpServers\` within an agent.
- Never invent credential IDs. If the user declines, omit the server entirely.
- Never fabricate \`metadata.nodeTypeName\`.
- When \`search_mcp_servers\` returns \`metadata.nodeTypeName\`, include
  \`metadata: { nodeTypeName: <result.nodeTypeName> }\` in the entry so the UI
  can render the correct server form.`,
	};
}
