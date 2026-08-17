import type { RuntimeSkill } from '@n8n/agents';
import { ASK_QUESTIONS_TOOL_NAME } from '@n8n/api-types';

import { INITIAL_BUILD_NOTE } from '../prompts/initial-build.prompt';

export function nodeToolsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-node-tools',
		name: 'Agent Builder Node Tools',
		description:
			'Use whenever adding, removing, or updating an n8n node-backed tool, including search_nodes/get_node_types discovery, nodeParameters, node credential slots, $fromAI usage, n8n expressions, and HTTP Request Tool configuration.',
		recommendedTools: [
			'resolve_integration',
			'search_nodes',
			'get_node_types',
			'ask_credential',
			'read_config',
			'patch_config',
		],
		allowedTools: [
			'resolve_integration',
			'search_nodes',
			'get_node_types',
			'ask_credential',
			'get_resource_locator_options',
			'ask_questions',
			'read_config',
			'patch_config',
			'write_config',
			'load_skill',
		],
		instructions: `\
## Purpose

Use this to discover, configure, and wire node tools into the target agent's
\`tools[]\`, including \`nodeParameters\`, credentials, and n8n expressions.

## Web Search vs Direct HTTP Requests

Generic web search, browsing, research, current-information, and source-finding
requests must use \`config.webSearch\` according to the system prompt's
web-search rules. Do not call \`resolve_integration\` or \`search_nodes\` for
these requests.

Never add the retired \`@n8n/n8n-nodes-langchain.toolHttpRequest\`. When the
user explicitly requests the HTTP Request Tool or direct HTTP, API, or
specific-page fetching, use only \`n8n-nodes-base.httpRequestTool\`.

### Mandatory HTTP Request URL Gate

Use only an exact URL explicitly supplied by the user for
\`n8n-nodes-base.httpRequestTool\`. If the user has not supplied one, you MUST
ask which URL the tool should fetch. During an initial build, mark this setup
as blocked and include the URL question in the single trailing \`finish_setup\`
call; add the tool with the returned URL after the user answers. On later
turns, call \`${ASK_QUESTIONS_TOOL_NAME}\` and wait for the answer before
mutating the config. Do not search for, derive, infer, guess, or invent a URL
from a service name, requested action, documentation, or common API
conventions. Never add an incomplete tool or use a placeholder URL.

## Workflow

- For a generic external-service request, call \`resolve_integration\` before
  node discovery unless a resolver result is already available.
- If it returns \`kind: "mcp"\`, load \`agent-builder-external-services\`,
  follow its MCP Servers section, and stop this node-tool workflow.
- If it returns \`kind: "node"\`, use its returned node results and call
  \`get_node_types\`; do not repeat the same search with \`search_nodes\`.
- Call \`search_nodes\` directly only when the user explicitly requests an n8n
  node, when refining node results, or when a verified MCP server lacks the
  requested capability.
- Never guess node type names.
- Use the tool node id from discovery, usually ending in \`Tool\`.
- Put fixed values in \`nodeParameters\`; use complete n8n expressions for values the agent should decide at runtime:
  \`={{ $fromAI('message', 'The message to send', 'string') }}\`.
- \`n8n-nodes-base.httpRequestTool\` requires a fixed \`nodeParameters.url\`; it
  does not work with a dynamic or model-selected URL. Never use \`$fromAI\` in
  the URL; use it only in other request fields.
- For stable dynamic selectors, load \`agent-builder-resource-locators\` and
  follow it.
- Never write literal \`"$fromAI"\` or bare \`$fromAI\`; the node will treat it as the actual value.
- Do not pipe AI-chosen fields through \`$json\`.
- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- n8n Connect (\`n8n credits\`) covers many services, including some community nodes. Adding a node tool with its credential slot omitted triggers server-side assignment: for a covered service the server attaches the managed \`n8n credits\` credential (\`{ id: null, name: "n8n credits", __aiGatewayManaged: true }\`) to each required, eligible slot on write — but only when the project has no credential of that type; an existing credential of the type wins and the slot stays empty for the normal credential flow below. Add the tool with the credential slot omitted, then \`read_config\`.
- Exception — when the user explicitly asks to run a tool on n8n credits, write \`{ "id": null, "name": "n8n credits", "__aiGatewayManaged": true }\` into that credential slot yourself: the server keeps it when the service is covered (even if the user has their own credential of the type) and removes it when not covered — check \`read_config\` after the write and resolve a real credential if it was removed.
- The \`n8n credits\` managed credential IS the real, working credential — the tool executes through n8n's gateway on n8n credits, so NO separate API key is needed. It is NOT a placeholder and NOT "invalid for the service", even for a community node. For a slot \`read_config\` shows populated with it: the slot is fully connected and the tool WILL run. Do NOT call \`ask_credential\` for it; do NOT include it in \`finish_setup\`; NEVER clear, remove, or replace it via \`patch_config\`; and NEVER seek a "real" API key to swap in for it. Report the tool as ready, running on n8n credits — exactly like a managed model. Never tell the user the credential is "not connected"/"not set up" or that the tool "won't run until a credential is added".
- Only for a required slot that \`read_config\` shows still empty after the write (a service n8n Connect does not cover) do you resolve a real credential: call \`ask_credential\` once before the config mutation for an addition to an existing agent. ${INITIAL_BUILD_NOTE} After the trailing \`finish_setup\` resolves the credential, copy the returned credentials into \`node.credentials\` via \`patch_config\`; for resource-locator resolution follow \`agent-builder-resource-locators\` then. Pass the node's credential key as \`credentialSlot\`. On success, copy the returned \`credentials\` object directly to \`node.credentials\`. If skipped, still add the tool and omit only that credential slot.
- When the agent already has a chat channel configured and the tool needs the same
  credential type, \`ask_credential\` reuses the channel's credential automatically —
  do not ask the user to pick a different one.

## n8n Expressions

Node tool parameters inside \`nodeParameters\` can use n8n expressions.
Prefer \`$fromAI\` whenever the target agent should decide a value at runtime,
except where this skill requires a fixed value, especially the HTTP Request
Tool URL.
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

## Gotchas

- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- \`$fromAI(...)\` placeholders define the node tool input schema; do not add it manually.
- Follow \`agent-builder-resource-locators\` for dynamic selector lookup,
  credentials, and \`parameterValue\` handling.
- If a required node-tool credential is skipped, add the tool and omit only that credential slot.
- Node tools execute inline, so never use waiting operations such as \`sendAndWait\`
  or \`dispatchAndWait\`. When the user requests human approval, configure the
  intended non-waiting operation and set \`requireApproval: true\` on the tool.

## Verify

- Generic external-service requests were routed through \`resolve_integration\`
  before node setup.
- Node tools use discovered tool node ids and valid node parameters.
- HTTP Request Tools use a fixed URL supplied by the user.`,
	};
}
