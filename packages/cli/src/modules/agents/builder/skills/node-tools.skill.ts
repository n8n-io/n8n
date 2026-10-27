import type { RuntimeSkill } from '@n8n/agents';
import { ASK_QUESTIONS_TOOL_NAME } from '@n8n/api-types';

import { INITIAL_BUILD_NOTE } from '../prompts/initial-build.prompt';

export function nodeToolsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-node-tools',
		name: 'Agent Builder Node Tools',
		description:
			'Use whenever adding, removing, or updating n8n node-backed tool, including search_nodes/get_node_types discovery, nodeParameters, node credential slots, $fromAI usage, n8n expressions, and HTTP Request Tool configuration.',
		recommendedTools: [
			'agent-context',
			'search_nodes',
			'get_node_types',
			'setup_credentials',
			'agent_builder_patch_config',
		],
		allowedTools: [
			'agent-context',
			'search_nodes',
			'get_node_types',
			'setup_credentials',
			'get_node_parameter_options',
			'agent_builder_ask_questions',
			'agent_builder_patch_config',
			'agent_builder_write_config',
			'load_skill',
		],
		instructions: `\
## Purpose

Discover, configure, and wire node tools into target agent's
\`tools[]\`, including \`nodeParameters\`, credentials, and n8n expressions.

## Web Search vs Direct HTTP Requests

Generic web search, browsing, research, current-information, and source-finding
requests must use \`config.webSearch\` according to \`agent-builder-config\` skill's
web-search rules. Do not search integrations or nodes for
these requests.

Never add retired \`@n8n/n8n-nodes-langchain.toolHttpRequest\`. When
user explicitly requests HTTP Request Tool or direct HTTP, API, or
specific-page fetching, use only \`n8n-nodes-base.httpRequestTool\`.

### Mandatory HTTP Request URL Gate

Use only exact URL explicitly supplied by user for
\`n8n-nodes-base.httpRequestTool\`. If user has not supplied one, you MUST
ask which URL tool should fetch. During initial build, add this to
pending setup and include URL question in single trailing \`agent_builder_finish_setup\`
call; add tool with returned URL after user answers. On later
turns, call \`${ASK_QUESTIONS_TOOL_NAME}\` and wait for answer before
mutating config. Do not search for, derive, infer, guess, or invent URL
from service name, requested action, documentation, or common API
conventions. Never add incomplete tool or use placeholder URL.

## Workflow

- For generic external-service request, call \`agent-context\` with
  \`type: "integrations"\` and \`queries\` before node discovery unless
  integration search result is already available.
- If it returns \`kind: "mcp"\`, load \`agent-builder-external-services\`,
  follow its MCP Servers section, and stop this node-tool workflow.
- If it returns \`kind: "node"\`, use its returned node results and call
  \`get_node_types\`; do not repeat same search with \`search_nodes\`.
- Fetch every node definition build needs in one
  \`get_node_types\` call, with all nodes and operations together.
  Do not fetch one service per call.
- Call \`search_nodes\` (with \`scope: "agent_tool"\`) directly only when user explicitly requests n8n
  node, when refining node results, or when verified MCP server lacks
  requested capability.
- Never guess node type names.
- Use tool node id from discovery, usually ending in \`Tool\`.
- Put fixed values in \`nodeParameters\`; use complete n8n expressions for values agent should decide at runtime:
  \`={{ $fromAI('message', 'The message to send', 'string') }}\`.
- \`n8n-nodes-base.httpRequestTool\` requires fixed \`nodeParameters.url\`; it
  does not work with dynamic or model-selected URL. Never use \`$fromAI\` in
  URL; use it only in other request fields.
- For stable dynamic selectors, load \`agent-builder-resource-locators\` and
  follow it.
- Never write literal \`"$fromAI"\` or bare \`$fromAI\`; node will treat it as actual value.
- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- Gateway credits cover many services, including some community nodes. Adding node tool with credential slot omitted triggers server-side assignment: for covered service server attaches managed \`Gateway credits\` credential (\`{ id: null, name: "Gateway credits", __aiGatewayManaged: true }\`) to each required, eligible slot on write — but only when project has no credential of that type; existing credential of type wins and slot stays empty for normal credential flow below. Add tool with credential slot omitted, then check slot in write result: when server assigned credential, result carries saved \`config\`; when result has no \`config\`, slot stayed empty.
- Exception — when user explicitly asks to run tool on Gateway credits, write \`{ "id": null, "name": "Gateway credits", "__aiGatewayManaged": true }\` into that credential slot yourself: server keeps it when service is covered (even if user has own credential of type) and removes it when not covered — check \`config\` in write result (present when server removed slot) and resolve real credential if it was removed.
- \`Gateway credits\` managed credential IS real, working credential — tool executes through n8n's gateway on Gateway credits, so NO separate API key is needed. It is NOT placeholder and NOT "invalid for the service", even for community node. For slot that config (from \`agent-context({ type: "config" })\` or write result) shows populated with it: slot is fully connected and tool WILL run. Do NOT call \`setup_credentials(target: "agent")\` for it; do NOT include it in \`agent_builder_finish_setup\`; NEVER clear, remove, or replace it via \`agent_builder_patch_config\`; and NEVER seek "real" API key to swap in for it. Report tool as ready, running on Gateway credits — exactly like managed model. Never tell user credential is "not connected"/"not set up" or that tool "won't run until a credential is added".
- Only for required slot still empty after write (service Gateway credits do not cover) do you resolve real credential: call \`setup_credentials(target: "agent")\` once before config mutation for addition to existing agent. ${INITIAL_BUILD_NOTE} Trailing \`agent_builder_finish_setup\` writes resolved credential into every empty node-tool slot of that type, so do not patch it in yourself, unless \`agent_builder_finish_setup\` result lists that slot in \`configApplyErrors\`. In that case write failed, so patch resolved credential into slot yourself. For resource-locator resolution, follow \`agent-builder-resource-locators\` after \`agent_builder_finish_setup\`. On success, result \`credentials\` maps each credential type to \`{ id, name }\`: set \`node.credentials[<credential key>]\` to entry for that type. If skipped, still add tool and omit only that credential slot.
- When agent already has chat channel configured and tool needs same
  credential type, \`setup_credentials(target: "agent")\` reuses channel's credential automatically —
  do not ask user to pick different one.

## n8n Expressions

Node tool parameters inside \`nodeParameters\` can use n8n expressions.
Prefer \`$fromAI\` whenever target agent should decide value at runtime,
except where this skill requires fixed value, especially HTTP Request
Tool URL.
Do not use \`$fromAI\` for stable resource IDs target agent cannot know
at runtime, such as Linear \`teamId\`, project IDs, channel IDs, calendar IDs,
database IDs, table IDs, or other dynamic "Name or ID" selectors. Resolve those
with \`agent-builder-resource-locators\` skill, \`setup_credentials(target: "agent")\`, and
\`get_node_parameter_options\`; write returned \`parameterValue\` into
\`nodeParameters\`.

- \`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('fieldName', 'What value to provide', 'string') }}\`
- \`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('count', 'How many items', 'number') }}\`
- \`={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('enabled', 'Whether to enable this option', 'boolean') }}\`
- \`={{ $now.toISO() }}\` for current date/time.
- \`={{ $today }}\` for start of today.

Always wrap expressions in \`={{ }}\`. Never pipe AI-chosen node-tool fields
through \`$json\`; use \`$fromAI\` for those fields instead.

## Gotchas

- \`$fromAI(...)\` placeholders define node tool input schema; do not add it manually.
- Follow \`agent-builder-resource-locators\` for dynamic selector lookup,
  credentials, and \`parameterValue\` handling.
- Node tools execute inline, so never use waiting operations such as \`sendAndWait\`
  or \`dispatchAndWait\`. When user requests human approval, configure
  intended non-waiting operation and set \`requireApproval: true\` on tool.

## Verify

- Generic external-service requests were routed through \`agent-context\`
  before node setup.
- Node tools use discovered tool node ids and valid node parameters.
- HTTP Request Tools use fixed URL supplied by user.`,
	};
}
