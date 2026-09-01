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
			'Use when connecting the target agent to an external product: deciding whether Slack, Discord, Linear, Telegram, or another platform is a chat integration/trigger versus a callable service, and adding, removing, or updating chat integrations or MCP servers.',
		recommendedTools: [
			'resolve_integration',
			'list_integration_types',
			'configure_channel',
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
			'ask_credential',
			'verify_mcp_server',
			'ask_questions',
			'read_config',
			'patch_config',
			'write_config',
			'report_required_artifact',
			'load_skill',
		],
		instructions: `\
## Purpose

Use this to connect the target agent to external products across chat
integrations (the \`integrations\` array), MCP servers (\`mcpServers\`), and
n8n node tools. Decide the right surface first. For a node tool, load
\`agent-builder-node-tools\` and follow that skill.

## Integration vs Callable Tool Decision

Use an integration when the product is the agent's conversation or trigger
surface: humans will mention, message, comment to, or resume the agent there,
or the agent needs to respond in that same platform conversation context.

Native Agent chat integrations are bidirectional within their conversation
context. The integration both receives the triggering message and delivers the
Agent's replies. Do not add a same-platform node, MCP, or workflow tool merely
so the Agent can reply, send a normal conversational message, or use interaction
features already listed in that integration's capabilities.

Configured integrations also generate their listed context and action tools for
every top-level Agent run, including scheduled tasks. A scheduled task can use
actions such as \`send_dm\` or \`send_channel_message\` without an inbound
message. Being proactive, scheduled, or outside an open conversation is never
by itself a reason to add a same-platform node, MCP, or workflow tool.

Use an MCP, node, or workflow tool when the product is only something the agent
operates on: searching records, creating tickets, updating objects, or sending a
business-process notification while the conversation happens elsewhere.

When building an agent that should interact with Slack, Discord, Telegram, or
Linear, use the matching chat integration instead of an MCP, node, or workflow
tool when the platform is the conversation surface. Add a callable tool only
for an explicitly requested operation that is absent from the selected
integration's returned capabilities. Compare the exact operation; do not infer
that the integration is unavailable merely because the run starts from a task.

Examples:

- Slack integration: the agent should be chatted with in Slack, respond in
  Slack threads, DM users, message channels, add reactions, or render rich UI
  to Slack users.
- Discord integration: the agent should be mentioned or messaged in Discord,
  respond in Discord threads or DMs, or render approval buttons there.
- Telegram integration: the agent should receive or send Telegram messages,
  continue conversations there, render supported interactive messages, or use
  \`send_dm\` to initiate a scheduled message to a known Telegram user ID.
- Linear integration: the agent should be triggered from Linear issues/comments,
  understand the current Linear subject, or reply in the same Linear
  conversation.
- Linear callable tools: the agent is triggered from Slack, Preview, a task, or a
  workflow and only needs to search/create/update Linear tickets via MCP or node
  tools.

If \`list_integration_types\` does not return the requested conversation
platform, do not substitute a platform messaging node as an Agent tool. The
Agent needs an external channel-bridge workflow instead:

1. Finish the Agent without a native integration for that platform.
2. When \`report_required_artifact\` is available, call it once with an
   \`artifact\` whose \`type\` is \`"workflow"\` and \`relationship\` is
   \`"agent-entrypoint"\`. Require the
   platform trigger, Message an Agent using the incoming message and a stable
   platform conversation/sender identifier as its custom session key, and the
   platform send action using the Agent's text response.
3. The bridge invokes the Agent. Never add it to the Agent's \`tools\` array and
   never report it as \`relationship: "agent-tool"\`.
4. If the reporting tool is unavailable, state the same workflow requirement
   clearly in the final reply so the calling surface can create it.

For callable (non-chat) services, call \`resolve_integration\` separately per
service and follow the returned \`kind\`: \`"mcp"\` -> MCP Servers section
below, \`"node"\` -> load \`agent-builder-node-tools\`.

### Correcting a redundant channel tool

If the user questions why a same-platform tool exists, inspect the current
config and the integration's returned capabilities before answering. When the
integration supplies the tool's purpose, remove the redundant node, MCP, or
workflow tool and explain the correction. Do not defend it merely because the
message is proactive, scheduled, or has no current conversation; generated
actions such as \`send_dm\` are available without inbound message context.

## Chat Integrations

The \`integrations\` array controls how the target agent is triggered.

- These are configured external chat platforms, not built-in Preview chat.
- Call \`list_integration_types\` first.
- Read the returned \`capabilities\`, \`useIntegrationWhen\`, and
  \`useNodeToolWhen\` fields before deciding to add an integration.
- Pick one returned \`type\` and pass it to \`configure_channel\` as
  \`integrationType\`. ALWAYS use \`configure_channel\` for chat-channel
  credentials — never \`ask_credential\` or a raw config write. The setup UI it
  shows creates and persists the channel configuration without publishing the
  agent; do not follow up with \`patch_config\`/\`write_config\` to write the
  credential.
- ${INITIAL_BUILD_NOTE} Instead of \`configure_channel\`: after
  \`list_integration_types\` returns the matching type, \`read_config()\` then
  \`patch_config\` adding \`{ "type": "<integrationType>", "credentialId": "" }\`
  to \`/integrations/-\` (include a minimal valid draft \`settings\` object for
  telegram) so the channel appears in the agent panel as needing setup. Pass
  the same \`integrationType\` in the trailing \`finish_setup\` call's
  \`channels\` array — its card configures or skips the channel itself. Do not
  call \`configure_channel\` again after \`finish_setup\` handles the card. If
  skipped, list it in the closing setup checklist pointing at the channel
  chip in the agent panel.
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
- For recurring or scheduled runs, create a task (\`create_tasks\`) for the
  cadence. Keep a requested chat integration, and use its generated action
  tools when the task sends through that same platform.
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

- If it returns \`kind: "node"\` for a generic service request, load
  \`agent-builder-node-tools\` and follow it with the returned node results.
  Stop this MCP workflow.
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
   \`transport\`, \`authentication\`, and optional \`metadata\`, plus the returned
   \`credentialId\` as \`credential\` when authentication is required.
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
for a generic service request, load \`agent-builder-node-tools\`, call
\`search_nodes\` with the same service queries, and follow that skill. Do not
add the MCP server merely because its registry entry matched.

Full schema reference:

${mcpServerSchemaText}

### Tool exposure and approval

- Expose every available MCP tool by default: omit \`toolFilter\` unless the user
  explicitly asks to restrict which tools are exposed. Do not infer an allowlist
  from the requested capability.
- For an explicit filter or selected approval list, use only exact, unprefixed
  \`name\` values from \`selectedResult.tools\` or a successful
  \`verify_mcp_server\` result.
- Never prepend the server name. Never invent MCP tool names. \`toolFilter.tools\`
  and \`approval.tools\` match original MCP names; the SDK adds the server prefix
  only when exposing tools to the model.

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
\`url\`, \`transport\`, optional registry \`metadata\`, and (if applicable) the
credential id from \`ask_credential\`.

- Success returns \`{ ok: true, tools: [{ name, description }] }\`, and when a
  matching \`mcpServers\` entry exists, also \`credentialApplied: true,
  configMutated: true, agentId\` — the credential is written automatically; do
  not follow with \`read_config\`/\`patch_config\` for the credential.
- When verify succeeds but \`credentialApplied: false\` and the entry already
  exists, fall back to \`read_config\` then \`patch_config\` for the credential.
- For an explicitly requested filter or selected approval list, copy exact names
  from the returned tool list following Tool exposure and approval above.
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

## Verify

- Configured chat integrations were set up through \`configure_channel\` or the
  initial-build \`finish_setup\` channel card, not \`ask_credential\` or a manual
  config write.
- The chosen integration matches \`useIntegrationWhen\`; otherwise resolve the
  callable capability through \`resolve_integration\` and use MCP, node, or
  workflow tools.
- No node, MCP, or workflow tool duplicates an action listed by a configured
  chat integration, including for proactive scheduled tasks.
- Generic non-chat external services were routed through \`resolve_integration\`
  before MCP or node setup.
- The final \`integrations\` array keeps unrelated integrations intact and
  removes only the requested channel entries.`,
	};
}
