import type { RuntimeSkill } from '@n8n/agents';
import { ASK_QUESTIONS_TOOL_NAME, McpServerConfigSchema } from '@n8n/api-types';
import type { JSONSchema7 } from 'json-schema';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { jsonSchemaToCompactText } from '../../json-config/schema-text-serializer';
import { INITIAL_BUILD_NOTE } from '../prompts/initial-build.prompt';

const mcpServerSchemaText = jsonSchemaToCompactText(
	zodToJsonSchema(McpServerConfigSchema) as JSONSchema7,
);

export function externalServicesSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-external-services',
		name: 'Agent Builder External Services',
		description:
			'Use when connecting the target agent to any external product: deciding whether Slack, Linear, Telegram, or another platform is a chat integration/trigger versus an MCP, node, or workflow tool; adding, removing, or updating chat integrations or MCP servers; and wiring n8n node-backed tools (search_nodes/get_node_types discovery, nodeParameters, node credential slots, $fromAI usage, n8n expressions).',
		recommendedTools: [
			'resolve_integration',
			'list_integration_types',
			'configure_channel',
			'search_nodes',
			'get_node_types',
			'ask_credential',
			'verify_mcp_server',
			'read_config',
			'patch_config',
		],
		allowedTools: [
			'resolve_integration',
			'list_integration_types',
			'configure_channel',
			'search_mcp_servers',
			'search_nodes',
			'get_node_types',
			'ask_credential',
			'verify_mcp_server',
			'get_resource_locator_options',
			'ask_questions',
			'read_config',
			'patch_config',
			'write_config',
			'load_skill',
		],
		instructions: `\
## Purpose

Use this to connect the target agent to external products across all three
surfaces: chat integrations (the \`integrations\` array), MCP servers
(\`mcpServers\`), and n8n node tools (entries in \`tools[]\` with
\`nodeParameters\`). Decide the right surface first, then follow that
section.

## Integration vs Callable Tool Decision

Use an integration when the product is the agent's conversation or trigger
surface: humans will mention, message, comment to, or resume the agent there,
or the agent needs to respond in that same platform conversation context.

Use an MCP, node, or workflow tool when the product is only something the agent
operates on: searching records, creating tickets, updating objects, or sending a
business-process notification while the conversation happens elsewhere.

Examples:

- Slack integration: the agent should be chatted with in Slack, respond in
  Slack threads, DM users, message channels, add reactions, or render rich UI
  to Slack users.
- Linear integration: the agent should be triggered from Linear issues/comments,
  understand the current Linear subject, or reply in the same Linear
  conversation.
- Linear callable tools: the agent is triggered from Slack, Preview, a task, or a
  workflow and only needs to search/create/update Linear tickets via MCP or node
  tools.

For callable (non-chat) services, call \`resolve_integration\` separately per
service and follow the returned \`kind\`: \`"mcp"\` -> MCP Servers section
below, \`"node"\` -> Node Tools section below.

## Chat Integrations

The \`integrations\` array controls how the target agent is triggered.

- These are connected external chat platforms, not built-in Preview chat.
- Call \`list_integration_types\` first.
- Read the returned \`capabilities\`, \`useIntegrationWhen\`, and
  \`useNodeToolWhen\` fields before deciding to add an integration.
- Pick one returned \`type\` and pass it to \`configure_channel\` as
  \`integrationType\`. ALWAYS use \`configure_channel\` for chat-channel
  credentials — never \`ask_credential\` or a raw config write. The setup UI it
  shows creates and persists the credential/connection itself; do not follow up
  with \`patch_config\`/\`write_config\` to write the credential.
- ${INITIAL_BUILD_NOTE} Instead of \`configure_channel\`: after
  \`list_integration_types\` returns the matching type, \`read_config()\` then
  \`patch_config\` adding \`{ "type": "<integrationType>", "credentialId": "" }\`
  to \`/integrations/-\` (include a minimal valid draft \`settings\` object for
  telegram) so the channel appears in the agent panel as needing setup. Pass
  the same \`integrationType\` in the trailing \`finish_setup\` call's
  \`channels\` array — its card connects or skips the channel itself; if
  skipped, list it in the closing setup checklist pointing at the channel
  chip in the agent panel. If \`finish_setup\` instead reports the channel as
  \`'blocked'\` (the agent could not be published yet), patch in the
  credentials/model it collected first; if that resolves every reported
  issue, call \`configure_channel\` directly for that channel as a follow-up.
  Otherwise leave it for the closing checklist.
- Preserve existing chat integrations unless the user asked to remove them.
- To remove an existing chat integration, call \`read_config\` and inspect
  \`config.integrations\`.
- If exactly one existing integration matches the requested platform, remove
  that entry with \`patch_config\` by index (or replace \`/integrations\` with a
  filtered array when clearer).
- If multiple existing integrations match the requested platform, ask which one
  to remove before editing \`integrations\`.
- Removing a chat integration means deleting its entry from
  \`integrations[]\`. Do not call \`configure_channel\` to remove a channel.

### Gotchas

- Chat integration types must come from \`list_integration_types\`.
- Do not add a chat integration just because the agent needs CRUD or notifications
  for that product. Resolve the callable capability through \`resolve_integration\`
  unless the product itself is the chat/trigger context.
- For recurring or scheduled runs, create a task (\`create_tasks\`), not an
  integration.
- Omitting \`integrations\` from a config write preserves the current channels.
  To remove one, write an explicit filtered array or remove the exact array
  entry.

## MCP Servers

MCP servers expose external tool catalogs to the target agent over HTTP. They
live on the top-level \`mcpServers\` array, and each entry maps 1:1 to a
connected MCP server. Use this section when \`resolve_integration\` returned
\`kind: "mcp"\`, the user explicitly asks to add or edit an MCP server, or the
user provides or asks to configure a custom MCP server.

### Discovery and setup

For a generic external-service request, \`resolve_integration\` must select the
integration type before MCP setup. If no resolver result is available yet,
call \`resolve_integration\` with queries matching the requested service.
Resolve one requested service per call; use \`queries\` only for alternative
search terms for that service.

- If it returns \`kind: "node"\` for a generic service request, follow the Node
  Tools section with the returned node results. Stop this MCP workflow.
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
    titles and descriptions; never choose by array order. During an initial
    build, do not call \`ask_questions\` for this: pick the best candidate by
    title/description relevance yourself, and list the pick as an assumption
    in your summary. Use the chosen entry as \`selectedResult\`. If
    \`ask_questions\` returns \`{ answered: false }\`, stop MCP setup without
    selecting a server, asking for credentials, verifying a connection, or
    mutating config. Do not re-present the question.
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
   \`mcpServers[]\` using the patch pattern below. When the entry already
   exists and verify returned \`credentialApplied: true\`, skip this step — the
   credential is already persisted.

${INITIAL_BUILD_NOTE} For MCP that means: pick the best candidate as an
assumption (above), then \`read_config()\` and \`patch_config\` a draft
\`/mcpServers/-\` entry using \`name\`, \`url\`, \`transport\`,
\`authentication\`, and \`metadata.nodeTypeName\` from \`selectedResult\` with
\`credential\` omitted, and skip \`verify_mcp_server\` — there is nothing to
authenticate yet. Include the credential in the trailing \`finish_setup\` call;
verify with the returned credential id — on success the tool writes the
credential into the matching entry itself (\`credentialApplied: true\`); no
\`read_config\`/\`patch_config\` follow-up for the credential. Existing-agent
additions keep the immediate ask + verify flow above unchanged.

If verification succeeds but the tools do not cover the requested capability
for a generic service request, switch to the Node Tools section, call
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

- Success returns \`{ ok: true, tools: [{ name, description }] }\`, and when a
  matching \`mcpServers\` entry exists, also \`credentialApplied: true,
  configMutated: true, agentId\` — the credential is written automatically; do
  not follow with \`read_config\`/\`patch_config\` for the credential.
- When verify succeeds but \`credentialApplied: false\` and the entry already
  exists, fall back to \`read_config\` then \`patch_config\` for the credential.
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

### Gotchas

- Server \`name\` must be unique across \`mcpServers\` within an agent.
- Never fabricate \`metadata.nodeTypeName\`.
- When \`selectedResult\` includes \`metadata.nodeTypeName\`, include
  \`metadata: { nodeTypeName: <selectedResult.metadata.nodeTypeName> }\` in the
  entry so the UI can render the correct server form.
- A registry match proves server availability, not support for the requested
  capability; use the verified live tool list for that decision.

## Node Tools

Use this section to discover, configure, and wire node tools into the target
agent's \`tools[]\`, including \`nodeParameters\` and n8n expressions.

### Workflow

- For a generic external-service request, call \`resolve_integration\` before
  node discovery unless a resolver result is already available.
- If it returns \`kind: "mcp"\`, follow the MCP Servers section instead and stop
  this node-tool workflow.
- If it returns \`kind: "node"\`, use its returned node results and call
  \`get_node_types\`; do not repeat the same search with \`search_nodes\`.
- Call \`search_nodes\` directly only when the user explicitly requests an n8n
  node, when refining node results, or when a verified MCP server lacks the
  requested capability.
- Never guess node type names.
- Use the tool node id from discovery, usually ending in \`Tool\`.
- Put fixed values in \`nodeParameters\`; use complete n8n expressions for values the agent should decide at runtime:
  \`={{ $fromAI('url', 'The URL to inspect', 'string') }}\`.
- For stable dynamic selectors, load \`agent-builder-resource-locators\` and
  follow it.
- Never write literal \`"$fromAI"\` or bare \`$fromAI\`; the node will treat it as the actual value.
- Do not pipe AI-chosen fields through \`$json\`.
- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- For each required credential slot, call \`ask_credential\` once before the config mutation for an addition to an existing agent. ${INITIAL_BUILD_NOTE} Add the tool with that credential slot omitted; after the trailing \`finish_setup\` resolves the credential, copy the returned credentials into \`node.credentials\` via \`patch_config\`; for resource-locator resolution follow \`agent-builder-resource-locators\` then. Pass the node's credential key as \`credentialSlot\`. On success, copy the returned \`credentials\` object directly to \`node.credentials\`. If skipped, still add the tool and omit only that credential slot.
- When the agent already has a chat channel configured and the tool needs the same
  credential type, \`ask_credential\` reuses the channel's credential automatically —
  do not ask the user to pick a different one.

### n8n Expressions

Node tool parameters inside \`nodeParameters\` can use n8n expressions.
Prefer \`$fromAI\` whenever the target agent should decide a value at runtime.
Do not use \`$fromAI\` for stable resource IDs that the target agent cannot know
at runtime, such as Linear \`teamId\`, project IDs, channel IDs, calendar IDs,
database IDs, table IDs, or other dynamic "Name or ID" selectors. Resolve those
with the \`agent-builder-resource-locators\` skill, \`ask_credential\`, and
\`get_resource_locator_options\`; write the returned \`parameterValue\` into
\`nodeParameters\`.

- \`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('fieldName', 'What value to provide', 'string') }}\`
- \`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('count', 'How many items', 'number') }}\`
- \`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('enabled', 'Whether to enable this option', 'boolean') }}\`
- \`={{ $now.toISO() }}\` for current date/time.
- \`={{ $today }}\` for the start of today.

Always wrap expressions in \`={{ }}\`. Never pipe AI-chosen node-tool fields
through \`$json\`; use \`$fromAI\` for those fields instead.

### Gotchas

- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- \`$fromAI(...)\` placeholders define the node tool input schema; do not add it manually.
- Follow \`agent-builder-resource-locators\` for dynamic selector lookup,
  credentials, and \`parameterValue\` handling.
- If a required node-tool credential is skipped, add the tool and omit only that credential slot.
- Node tools execute inline, so never use waiting operations such as \`sendAndWait\`
  or \`dispatchAndWait\`. When the user requests human approval, configure the
  intended non-waiting operation and set \`requireApproval: true\` on the tool.

## Verify

- Connected chat integrations were set up through \`configure_channel\`, not
  \`ask_credential\` or a manual config write.
- The chosen integration matches \`useIntegrationWhen\`; otherwise resolve the
  callable capability through \`resolve_integration\` and use MCP, node, or
  workflow tools.
- Generic non-chat external services were routed through \`resolve_integration\`
  before MCP or node setup.
- The final \`integrations\` array keeps unrelated integrations intact and
  removes only the requested channel entries.
- Node tools use discovered tool node ids and valid node parameters.`,
	};
}
