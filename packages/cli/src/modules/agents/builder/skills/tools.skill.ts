import type { RuntimeSkill } from '@n8n/agents';

export function toolsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-tools',
		name: 'Agent builder tools',
		description:
			'Use before adding, changing, or attaching any tool to the target agent, before looking up node definitions for a node tool, or when deciding whether a capability belongs in tools[], providerTools, or config.webSearch.',
		instructions: `\
Load this skill before calling \`search_nodes\`, \`get_node_types\`, \`build_custom_tool\`,
or adding, changing, or removing entries in \`tools[]\` / \`providerTools\`.

Prefer existing workflow tools and node tools over custom tools for real-world actions.

Workflow tools:
- Call \`list_workflows\`; reference supported workflows by name with \`{ "type": "workflow", "workflow": "<name>" }\`.

Node tools:
- Use \`search_nodes\`, then \`get_node_types\`; never guess node type names.
- Use the tool node id from discovery, usually ending in \`Tool\`.
- Put fixed values in \`nodeParameters\`; use complete n8n expressions for values the agent should decide at runtime:
  \`={{ $fromAI('url', 'The URL to inspect', 'string') }}\`.
- Never write literal \`"$fromAI"\` or bare \`$fromAI\`; the node will treat it as the actual value.
- Do not pipe AI-chosen fields through \`$json\`.
- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- For each required credential slot, call \`ask_credential\` once before config mutation. If skipped, still add the tool and omit only that credential slot.

Custom tools:
- Use \`build_custom_tool\` with \`export default new Tool(...)\` and imports only from \`@n8n/agents\` and \`zod\`.
- Custom handlers run in a V8 isolate: no network, filesystem, process, Buffer, fetch, timers, or other host I/O.
- Do not use custom tools for live website crawling, HTTP fetching, API calls, SEO crawlers, or scraping. Use workflow or node tools for those.
- Return JSON-serializable values. Do not call \`.build()\`.
- Register the returned custom tool id in config after \`build_custom_tool\`.

Provider tools:
- Match provider tools to the configured model provider.
- Anthropic: \`providerTools["anthropic.web_search"]\`.
- OpenAI: \`providerTools["openai.web_search"]\` or \`providerTools["openai.image_generation"]\`, only for compatible OpenAI models.

Gotchas:
- Web-search fallback services are config, not node tools, unless the user explicitly asks for a node integration.
- \`$fromAI(...)\` placeholders define the node tool input schema; do not add it manually.
- Do not invent node type names, workflow names, credential ids, or provider tool keys.
- \`build_custom_tool\` stores code only; the config still needs a \`{ "type": "custom", "id": "<returned id>" }\` tool ref.`,
	};
}
