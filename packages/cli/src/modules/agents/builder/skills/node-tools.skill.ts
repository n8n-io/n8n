import type { RuntimeSkill } from '@n8n/agents';

export function nodeToolsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-node-tools',
		name: 'Agent Builder Node Tools',
		description:
			'Use when adding, changing, or removing node-backed tools: search_nodes/get_node_types discovery, nodeParameters, node credential slots, $fromAI usage, or other n8n expressions.',
		recommendedTools: [
			'search_nodes',
			'get_node_types',
			'ask_credential',
			'read_config',
			'patch_config',
		],
		allowedTools: [
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
\`tools[]\`, including \`nodeParameters\` and n8n expressions.

## Workflow

- Use \`search_nodes\`, then \`get_node_types\`; never guess node type names.
- Use the tool node id from discovery, usually ending in \`Tool\`.
- Put fixed values in \`nodeParameters\`; use complete n8n expressions for values the agent should decide at runtime:
  \`={{ $fromAI('url', 'The URL to inspect', 'string') }}\`.
- For stable dynamic selectors, load \`agent-builder-resource-locators\` and
  follow it.
- Never write literal \`"$fromAI"\` or bare \`$fromAI\`; the node will treat it as the actual value.
- Do not pipe AI-chosen fields through \`$json\`.
- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- For each required credential slot, call \`ask_credential\` once before config mutation. Pass the node's credential key as \`credentialSlot\`. On success, copy the returned \`credentials\` object directly to \`node.credentials\`. If skipped, still add the tool and omit only that credential slot.

## n8n Expressions

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

## Gotchas

- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- \`$fromAI(...)\` placeholders define the node tool input schema; do not add it manually.
- Follow \`agent-builder-resource-locators\` for dynamic selector lookup,
  credentials, and \`parameterValue\` handling.
- If a required node-tool credential is skipped, add the tool and omit only that credential slot.

## Verify

- Node tools use discovered tool node ids and valid node parameters.`,
	};
}
