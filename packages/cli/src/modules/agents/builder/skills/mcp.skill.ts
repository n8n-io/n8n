import type { RuntimeSkill } from '@n8n/agents';
import { ASK_QUESTIONS_TOOL_NAME, McpServerConfigSchema } from '@n8n/api-types';
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
		recommendedTools: [
			'resolve_integration',
			'ask_questions',
			'ask_credential',
			'verify_mcp_server',
			'read_config',
			'patch_config',
		],
		allowedTools: [
			'resolve_integration',
			'search_mcp_servers',
			'search_nodes',
			'get_node_types',
			'ask_credential',
			'verify_mcp_server',
			'ask_questions',
			'read_config',
			'patch_config',
			'write_config',
			'load_skill',
		],
		instructions: `\
## Purpose

Use this to manage external MCP server connections in the target agent config.
MCP servers expose external tool catalogs to the target agent over HTTP. They
live on the top-level \`mcpServers\` array, and each entry maps 1:1 to a
connected MCP server.

## Use when:

- \`resolve_integration\` returned \`kind: "mcp"\`.
- The user explicitly asks to add or edit an MCP server.
- The user provides or asks to configure a custom MCP server.

## Workflow

### Discovery and setup

For a generic external-service request, \`resolve_integration\` must select the
integration type before this skill is loaded. If no resolver result is
available yet, call \`resolve_integration\` with queries matching the requested
service. Resolve one requested service per call; use \`queries\` only for
alternative search terms for that service.

- If it returns \`kind: "node"\` for a generic service request, load
  \`agent-builder-node-tools\` and continue with the returned node results. Stop
  this MCP workflow.
- If it returns \`kind: "node"\` but the user explicitly requested an MCP server,
  do not silently substitute a node tool. Continue with manual MCP setup by
  asking for the URL and transport/authentication decision through
  \`${ASK_QUESTIONS_TOOL_NAME}\`.
- \`resolve_integration\` returns \`{ kind: "mcp", results: [...] }\` for MCP
  matches. Never read server fields from the wrapper; select a result first:
  - If \`results[]\` contains one entry, use it as \`selectedResult\`.
  - If the request uniquely identifies one entry by \`name\` or \`title\`, use
    that entry as \`selectedResult\`.
  - If multiple candidates remain, call \`ask_questions\` with the candidate
    titles and descriptions; never choose by array order. Use the chosen entry
    as \`selectedResult\`. If \`ask_questions\` returns \`{ answered: false }\`,
    stop MCP setup without selecting a server, asking for credentials, verifying
    a connection, or mutating config. Do not re-present the question.
- Use \`name\`, \`url\`, \`transport\`, \`authentication\`, \`credentialType\`,
  \`tools\`, and optional \`metadata\` only from \`selectedResult\`.

Follow these steps for the selected MCP result:

1. Credential: call \`ask_credential\` with a short \`purpose\`, using
   \`selectedResult.credentialType\` as \`credentialType\`. Never invent
   credential IDs.
2. Verify: call \`verify_mcp_server\` with the selected result's \`name\`, \`url\`,
   \`transport\`, and \`authentication\`, plus the returned \`credentialId\` as
   \`credential\` when authentication is required.
3. Capability check: confirm the verified tool names and descriptions cover the
   capability the user requested.
4. Write config: call \`read_config\`, then \`patch_config\` to add the entry to
   \`mcpServers[]\` using the patch pattern below.

If verification succeeds but the tools do not cover the requested capability
for a generic service request, load \`agent-builder-node-tools\`, call
\`search_nodes\` with the same service queries, and continue with node setup. Do
not add the MCP server merely because its registry entry matched.

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

### Incomplete setup

The user can skip the credential prompt, the URL question, or both. Never
invent a credential ID or a placeholder URL to fill the gap, and never abort
the server addition — always persist what is known and let the user finish
setup later:

- Credential skipped (\`ask_credential\` returned \`{ skipped: true }\`): omit
  only the \`credential\` field.
- URL skipped: persist \`url: ""\`.
- Either case: skip \`verify_mcp_server\` (there is nothing to authenticate or
  connect to), then \`read_config\` and \`patch_config\` the entry, preserving
  every other known field — \`name\`, \`transport\`, \`authentication\`, an
  already-selected credential, and registry \`metadata\`.

### Selecting credentials

When using a registry-backed server, always use the \`credentialType\` returned
by \`selectedResult\`.

For custom MCP servers, if credential type is unknown, ask the user which
credential type to use (OAuth2, Bearer Token, Header Auth, Multiple Headers
Auth, or None) via \`${ASK_QUESTIONS_TOOL_NAME}\`. Then map to:

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
- Never fabricate \`metadata.nodeTypeName\`.
- When \`selectedResult\` includes \`metadata.nodeTypeName\`, include
  \`metadata: { nodeTypeName: <selectedResult.metadata.nodeTypeName> }\` in the
  entry so the UI can render the correct server form.
- A registry match proves server availability, not support for the requested
  capability; use the verified live tool list for that decision.`,
	};
}
