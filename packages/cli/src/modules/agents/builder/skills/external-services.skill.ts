import type { RuntimeSkill } from '@n8n/agents';
import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { ASK_QUESTIONS_TOOL_NAME, McpServerConfigSchema } from '@n8n/api-types';

import { jsonSchemaToCompactText } from '../../json-config/schema-text-serializer';
import { INITIAL_BUILD_NOTE } from '../prompts/initial-build.prompt';

const mcpServerSchemaText = jsonSchemaToCompactText(zodSchemaToJsonSchema(McpServerConfigSchema));

export function externalServicesSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-external-services',
		name: 'Agent Builder External Services',
		description:
			'Use when connecting target agent to external product: deciding whether Slack, Discord, Linear, Telegram, or other platform is chat integration/trigger versus callable service, and adding, removing, or updating chat integrations or MCP servers.',
		recommendedTools: [
			'agent-context',
			'agent_builder_configure_channel',
			'setup_credentials',
			'agent_builder_verify_mcp_server',
			'agent_builder_patch_config',
		],
		allowedTools: [
			'agent-context',
			'agent_builder_configure_channel',
			'setup_credentials',
			'agent_builder_verify_mcp_server',
			'agent_builder_ask_questions',
			'agent_builder_patch_config',
			'agent_builder_write_config',
			'report_required_artifact',
			'load_skill',
		],
		instructions: `\
## Purpose

Connect target agent to external products across chat integrations (\`integrations\`
array), MCP servers (\`mcpServers\`), and n8n node tools. Decide right surface
first. For node tool, load \`agent-builder-node-tools\` and follow that skill.

## Integration vs Callable Tool Decision

Use integration when product is agent's conversation or trigger surface: humans
mention, message, comment to, or resume agent there, or agent must respond in
that same platform conversation context.

Native Agent chat integrations are bidirectional within their conversation
context. Integration both receives triggering message and delivers Agent's
replies. Do not add same-platform node, MCP, or workflow tool merely so Agent can
reply, send normal conversational message, or use interaction features already
listed in integration's capabilities.

Configured integrations also generate their listed context and action tools for
every top-level Agent run, including scheduled tasks. Scheduled task can use
actions such as \`send_dm\` or \`send_channel_message\` without inbound message.
Being proactive, scheduled, or outside open conversation is never by itself
reason to add same-platform node, MCP, or workflow tool.

Use MCP, node, or workflow tool when product is only something agent operates
on: searching records, creating tickets, updating objects, or sending
business-process notification while conversation happens elsewhere.

For agent that should interact with Slack, Discord, Telegram, or Linear, use
matching chat integration instead of MCP, node, or workflow tool when platform
is conversation surface. Add callable tool only for explicitly requested
operation absent from selected integration's returned capabilities. Compare
exact operation; do not infer integration is unavailable merely because run
starts from task.

Examples:

- Slack integration: agent chatted with in Slack, responds in Slack threads, DMs
  users, messages channels, adds reactions, or renders rich UI to Slack users.
- Discord integration: agent mentioned or messaged in Discord, responds in
  Discord threads or DMs, or renders approval buttons there.
- Telegram integration: agent receives or sends Telegram messages, continues
  conversations there, renders supported interactive messages, or uses
  \`send_dm\` to initiate scheduled message to known Telegram user ID. Native
  integration sends incoming photos to Agent and provides \`chat_id\` and
  attachment \`file_id\` values in message context. Do not create
  agent-entrypoint workflow only to access these values.
- Linear integration: agent triggered from Linear issues/comments, understands
  current Linear subject, or replies in same Linear conversation.
- Linear callable tools: agent triggered from Slack, Preview, task, or workflow
  and only needs to search/create/update Linear tickets via MCP or node tools.

If \`agent-context({ type: "integrations" })\` does not return requested
conversation platform, do not substitute platform messaging node as Agent tool.
Agent needs external channel-bridge workflow instead:

1. Finish Agent without native integration for that platform.
2. When \`report_required_artifact\` is available, call it once with an
   \`artifact\` whose \`type\` is \`"workflow"\` and \`relationship\` is
   \`"agent-entrypoint"\`. Require
   platform trigger, Message an Agent using incoming message and stable
   platform conversation/sender identifier as its custom session key, and
   platform send action using Agent's text response.
3. Bridge invokes Agent. Never add it to Agent's \`tools\` array and
   never report it as \`relationship: "agent-tool"\`.
4. If reporting tool unavailable, state same workflow requirement clearly in
   final reply so calling surface can create it.

For callable (non-chat) services, call \`agent-context\` with
\`type: "integrations"\` and \`queries\` separately per service. Read \`kind\`
from its \`context\` data: \`"mcp"\` -> MCP Servers section
below, \`"node"\` -> load \`agent-builder-node-tools\`.

### Correcting a redundant channel tool

If user questions why same-platform tool exists, inspect current config and
integration's returned capabilities before answering. When integration supplies
tool's purpose, remove redundant node, MCP, or workflow tool and explain
correction. Do not defend it merely because message is proactive, scheduled, or
has no current conversation; generated actions such as \`send_dm\` are available
without inbound message context.

## Chat Integrations

\`integrations\` array controls how target agent is triggered.

- These are configured external chat platforms, not built-in Preview chat.
- Call \`agent-context({ type: "integrations" })\` first.
- Read returned \`capabilities\`, \`useIntegrationWhen\`, and
  \`useNodeToolWhen\` fields before deciding to add integration.
- Pick one returned \`type\` and pass it to \`agent_builder_configure_channel\` as
  \`integrationType\`. ALWAYS use \`agent_builder_configure_channel\` for chat-channel
  credentials — never \`setup_credentials(target: "agent")\` or raw config write. Setup UI it
  shows creates and persists channel configuration without publishing
  agent; do not follow up with \`agent_builder_patch_config\`/\`agent_builder_write_config\` to write
  credential.
- ${INITIAL_BUILD_NOTE} Instead of \`agent_builder_configure_channel\`: after
  \`agent-context({ type: "integrations" })\` returns matching type, add
  \`{ "type": "<integrationType>", "credentialId": "" }\` to \`integrations\`
  in your single initial config write (include minimal valid draft
  \`settings\` object for telegram) so channel appears in agent panel
  as needing setup. If config already written, \`agent_builder_patch_config\` (with
  \`configHash\` from your latest config read or write) adding it to
  \`/integrations/-\` instead. Pass
  same \`integrationType\` in trailing \`agent_builder_finish_setup\` call's
  \`channels\` array — its card configures or skips channel itself. Do not
  call \`agent_builder_configure_channel\` again after \`agent_builder_finish_setup\` handles card. If
  skipped, list it in closing setup checklist pointing at channel
  chip in agent panel.
- Preserve existing chat integrations unless user asked to remove them.
- To remove existing chat integration, call \`agent-context({ type: "config" })\` and inspect
  \`config.integrations\`.
- If exactly one existing integration matches requested platform, remove
  that entry with \`agent_builder_patch_config\` by index (or replace \`/integrations\` with
  filtered array when clearer).
- If multiple existing integrations match requested platform, ask which one
  to remove before editing \`integrations\`.
- Removing chat integration means deleting its entry from
  \`integrations[]\`. Do not call \`agent_builder_configure_channel\` to remove channel.

### Gotchas

- Chat integration types must come from \`agent-context({ type: "integrations" })\`. Channel
  absent from its result is unsupported for agents — never invent type, never
  draft or configure it, and never substitute workflow node (e.g.
  Twilio node) to fake unsupported chat channel. Instead, explain
  channel is unsupported, offer supported alternatives tool
  returned with their \`capabilities\`, and ask which to use (or whether
  user wants workflow path after limitation is stated).
- Do not add chat integration just because agent needs CRUD or notifications
  for that product. Resolve callable capability through \`agent-context\`
  unless product itself is chat/trigger context.
- For recurring or scheduled runs, create task (\`agent_builder_create_tasks\`) for
  cadence. Keep requested chat integration, and use its generated action
  tools when task sends through that same platform.
- Omitting \`integrations\` from config write preserves current channels.
  To remove one, write explicit filtered array or remove exact array
  entry.

## MCP Servers

MCP servers expose external tool catalogs to target agent over HTTP. They
live on top-level \`mcpServers\` array, and each entry maps 1:1 to
connected MCP server. Use this section when \`agent-context\` returned
\`kind: "mcp"\`, user explicitly asks to add or edit MCP server, or
user provides or asks to configure custom MCP server.

### Discovery and setup

For generic external-service request, search integrations before MCP setup.
If no result is available yet, call \`agent-context\` with
\`type: "integrations"\` and queries matching requested service.
Resolve one requested service per call; use \`queries\` only for alternative
search terms for that service.

- If it returns \`kind: "node"\` for generic service request, load
  \`agent-builder-node-tools\` and follow it with returned node results.
  Stop this MCP workflow.
- If it returns \`kind: "node"\` but user explicitly requested MCP server,
  do not silently substitute node tool. Continue with manual MCP setup by
  asking for URL and transport/authentication decision through
  \`${ASK_QUESTIONS_TOOL_NAME}\`.
- For MCP matches, \`context\` data contains
  \`{ kind: "mcp", results: [...] }\`. Select result first:
  - If \`results[]\` contains one entry, use it as \`selectedResult\`.
  - If request uniquely identifies one entry by \`name\` or \`title\`, use
    that entry as \`selectedResult\`.
  - If multiple candidates remain, call \`agent_builder_ask_questions\` with candidate
    titles and descriptions; never choose by array order. During initial
    build, do not call \`agent_builder_ask_questions\` for this: pick best candidate by
    title/description relevance yourself, and list pick as assumption
    in your summary. Use chosen entry as \`selectedResult\`. If
    \`agent_builder_ask_questions\` returns \`{ answered: false }\`, stop MCP setup without
    selecting server, asking for credentials, verifying connection, or
    mutating config. Do not re-present question.
- Use \`name\`, \`url\`, \`transport\`, \`authentication\`, \`credentialType\`,
  \`tools\`, and optional \`metadata\` and \`credential\` only from \`selectedResult\`.
- When \`selectedResult.credential\` is set, server runs on Gateway credits and
  needs no credential: skip credential step, and use that \`credential\` unchanged
  in \`agent_builder_verify_mcp_server\` and in \`mcpServers\` entry.
- When \`selectedResult.aiGatewayCredential\` is set, server can also run on Gateway
  credits. Use them when user asks for Gateway credits, or when
  \`agent_builder_list_credentials\` with \`types: [selectedResult.credentialType]\` returns
  none: set \`authentication\` to \`"none"\` and \`credential\` to
  \`selectedResult.aiGatewayCredential\`, and skip credential step. Otherwise follow
  steps below.

Follow these steps for selected MCP result:

1. Credential: call
   \`setup_credentials({ target: "agent", credentials: [{ credentialType: selectedResult.credentialType, reason: "<short reason>" }] })\`.
   Never invent credential IDs.
2. Verify: call \`agent_builder_verify_mcp_server\` with selected result's \`name\`, \`url\`,
   \`transport\`, \`authentication\`, and optional \`metadata\`, plus returned
   \`credentials[selectedResult.credentialType].id\` as \`credential\` when authentication is required.
3. Capability check: confirm verified tool names and descriptions cover
   capability user requested.
4. Write config: call \`agent-context({ type: "config" })\`, then \`agent_builder_patch_config\` to add entry to
   \`mcpServers[]\` using patch pattern below. When entry already
   exists and verify returned \`credentialApplied: true\`, skip this step —
   credential is already persisted.

${INITIAL_BUILD_NOTE} For MCP that means: pick best candidate as
assumption (above), then add draft \`mcpServers\` entry to your single
initial config write (or \`agent_builder_patch_config\` it to \`/mcpServers/-\`, with
\`configHash\` from your latest config read or write, if config is
already written) using \`name\`, \`url\`, \`transport\`,
\`authentication\`, and \`metadata.nodeTypeName\` from \`selectedResult\` with
\`credential\` omitted, and skip \`agent_builder_verify_mcp_server\` — nothing to
authenticate yet. Include credential in trailing \`agent_builder_finish_setup\` call;
verify with returned credential id — on success tool writes
credential into matching entry itself (\`credentialApplied: true\`); no
\`agent-context({ type: "config" })\`/\`agent_builder_patch_config\` follow-up for credential. Existing-agent
additions keep immediate ask + verify flow above unchanged.

If verification succeeds but tools do not cover requested capability
for generic service request, load \`agent-builder-node-tools\`, call
\`search_nodes\` (with \`scope: "agent_tool"\`) with same service queries, and follow that skill. Do not
add MCP server merely because its registry entry matched.

Full schema reference:

${mcpServerSchemaText}

### Tool exposure and approval

- Omit \`toolPermissions\` unless the user explicitly asks to require approval,
  block a tool or category, or restrict which tools are exposed. Omission
  allows all MCP tools without approval.
- Treat requests to expose or allow only named tools as an allowlist. Set both
  \`toolPermissions.categories.read\` and
  \`toolPermissions.categories.write\` to \`"blocked"\`, then add each selected
  tool to \`toolPermissions.tools\` as an \`"always_allow"\` override.
- For other permission controls, set both
  \`toolPermissions.categories.read\` and
  \`toolPermissions.categories.write\`. Use \`"always_allow"\` for categories
  user did not restrict.
- Use \`"require_approval"\` when user asks to approve category or tool
  before execution. Use \`"blocked"\` when user asks to hide or disable it.
- Use category policies for broad read/write rules. Add \`toolPermissions.tools\`
  overrides only for exceptions to those category rules.
- For exact tool override, use only unprefixed \`name\` from
  \`selectedResult.tools\` or successful
  \`agent_builder_verify_mcp_server\` result. Never
  prepend server name and never invent MCP tool names.

### Credential flow

Call \`setup_credentials({ target: "agent", credentials: [{ credentialType, reason }] })\`
with \`credentialType\` for authentication:

- For \`bearerAuth\`, use \`credentialType: "httpBearerAuth"\`.
- For \`headerAuth\`, use \`credentialType: "httpHeaderAuth"\`.
- For \`multipleHeadersAuth\`, use \`credentialType: "httpMultipleHeadersAuth"\`.
- For \`mcpOAuth2Api\`, use \`credentialType: "mcpOAuth2Api"\`.

### Testing the connection

Before writing to config, call \`agent_builder_verify_mcp_server\` with server \`name\`,
\`url\`, \`transport\`, optional registry \`metadata\`, and (if applicable)
credential id from \`setup_credentials(target: "agent")\` (\`credentials[<credentialType>].id\`).

- Success returns \`{ ok: true, tools: [{ name, description }] }\`, and when
  matching \`mcpServers\` entry exists, also \`credentialApplied: true,
  configMutated: true, agentId\` — credential is written automatically; do
  not follow with \`agent-context({ type: "config" })\`/\`agent_builder_patch_config\` for credential.
- When verify succeeds but \`credentialApplied: false\` and entry already
  exists, fall back to \`agent-context({ type: "config" })\` then \`agent_builder_patch_config\` for credential.
- For explicitly requested filter or selected approval list, copy exact names
  from returned tool list following Tool exposure and approval above.
- Failure returns \`{ ok: false, error: "..." }\`.
- If verification fails, explain error and ask user to check URL
  or credentials before proceeding.

### Incomplete setup

User can skip credential prompt, URL question, or both. Never
invent credential ID or placeholder URL to fill gap, and never abort
server addition — always persist what is known and let user finish
setup later:

- Credential skipped (\`setup_credentials(target: "agent")\` result lists type in \`skipped\`): omit
  only \`credential\` field.
- URL skipped: persist \`url: ""\`.
- Either case: skip \`agent_builder_verify_mcp_server\` (nothing to authenticate or
  connect to), then \`agent-context({ type: "config" })\` and \`agent_builder_patch_config\` entry, preserving
  every other known field — \`name\`, \`transport\`, \`authentication\`,
  already-selected credential, registry \`metadata\`, and any explicitly
  configured \`toolPermissions\`.

### Selecting credentials

When using registry-backed server, always use \`credentialType\` returned
by \`selectedResult\`.

For custom MCP servers, if credential type unknown, ask user which
credential type to use (OAuth2, Bearer Token, Header Auth, Multiple Headers
Auth, or None) via \`${ASK_QUESTIONS_TOOL_NAME}\`. Then map to:

- \`bearerAuth\` -> \`setup_credentials(target: "agent")\` with \`credentialType: "httpBearerAuth"\`
- \`headerAuth\` -> \`setup_credentials(target: "agent")\` with \`credentialType: "httpHeaderAuth"\`
- \`multipleHeadersAuth\` -> \`setup_credentials(target: "agent")\` with
  \`credentialType: "httpMultipleHeadersAuth"\`
- \`mcpOAuth2Api\` -> \`setup_credentials(target: "agent")\` with \`credentialType: "mcpOAuth2Api"\`

### Patch pattern

1. Initialize array if missing:
   \`{ "op": "add", "path": "/mcpServers", "value": [] }\`
2. Append each server:
   \`{ "op": "add", "path": "/mcpServers/-", "value": { ... } }\`

### Gotchas

- Server \`name\` must be unique across \`mcpServers\` within agent.
- Never fabricate \`metadata.nodeTypeName\`.
- When \`selectedResult\` includes \`metadata.nodeTypeName\`, include
  \`metadata: { nodeTypeName: <selectedResult.metadata.nodeTypeName> }\` in
  entry so UI can render correct server form.
- Registry match proves server availability, not support for requested
  capability; use verified live tool list for that decision.
- Describe MCP server only by its name, or by text user or registry
  gave. If you cannot identify it, do not state what it does.

## Verify

- Configured chat integrations were set up through \`agent_builder_configure_channel\` or
  initial-build \`agent_builder_finish_setup\` channel card, not \`setup_credentials(target: "agent")\` or manual
  config write.
- Chosen integration matches \`useIntegrationWhen\`; otherwise resolve
  callable capability through \`agent-context\` and use MCP, node, or
  workflow tools.
- No node, MCP, or workflow tool duplicates action listed by configured
  chat integration, including for proactive scheduled tasks.
- Generic non-chat external services were routed through \`agent-context\`
  before MCP or node setup.
- Final \`integrations\` array keeps unrelated integrations intact and
  removes only requested channel entries.`,
	};
}
