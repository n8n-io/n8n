import type { RuntimeSkill } from '@n8n/agents';

export function toolsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-tools',
		name: 'Agent builder tools',
		description: 'Use when adding workflow, node, custom, or provider tools to the target agent.',
		instructions: `\
Prefer existing workflow tools and node tools over custom tools for real-world actions.

Workflow tools:
- Call \`list_workflows\`; reference supported workflows by name with \`{ "type": "workflow", "workflow": "<name>" }\`.

Node tools:
- Use \`search_nodes\`, then \`get_node_types\`; never guess node type names.
- Use the tool node id from discovery, usually ending in \`Tool\`.
- Put fixed values in \`nodeParameters\`; use \`$fromAI\` for values the agent should decide at runtime.
- Wrap expressions in \`={{ }}\`; do not pipe AI-chosen fields through \`$json\`.
- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- For each required credential slot, call \`ask_credential\` once before config mutation. If skipped, still add the tool and omit only that credential slot.

Custom tools:
- Use \`build_custom_tool\` with \`export default new Tool(...)\` and imports only from \`@n8n/agents\` and \`zod\`.
- Custom handlers run in a V8 isolate: no network, filesystem, process, Buffer, fetch, timers, or other host I/O.
- Return JSON-serializable values. Do not call \`.build()\`.
- Register the returned custom tool id in config after \`build_custom_tool\`.

Web search and provider tools:
- For normal web search, prefer top-level \`webSearch\`: \`{ "webSearch": { "enabled": true, "mode": "auto" } }\`.
- When fallback search is required, call \`list_credentials\` with \`["braveSearchApi","searXngApi"]\`. Prefer \`braveSearchApi\` when both are available and the user has no stated preference; use \`searXngApi\` when the user asks for SearXNG or only SearXNG is available.
- Call \`ask_credential\` for the chosen single credential type and store \`webSearch.credential = { id: credentialId, name: credentialName, type: "<braveSearchApi or searXngApi>" }\`.
- Raw \`providerTools\` are an advanced escape hatch for provider-specific tools. Do not configure web-search provider tools manually when \`webSearch.enabled\` is true.
- OpenAI image generation: \`providerTools["openai.image_generation"]\`, only for compatible OpenAI models.`,
	};
}
