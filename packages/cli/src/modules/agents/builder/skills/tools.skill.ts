import type { RuntimeSkill } from '@n8n/agents';
import { getValidProviderToolNames } from '@n8n/api-types';

function formatValidProviderToolNames(): string {
	return getValidProviderToolNames()
		.map((toolName) => `\`${toolName}\``)
		.join(', ');
}

export function toolsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-tools',
		name: 'Agent builder tools',
		description:
			'Use when adding or changing target-agent workflow, node, custom, or provider tools, or deciding whether a capability belongs in tools[], providerTools, or config.webSearch; generic web search belongs in config unless the user explicitly asks for a node.',
		instructions: `\
## Purpose

Use this to give the target agent callable capabilities through workflows,
nodes, custom code tools, or provider tools.

## Boundaries

- The request is generic web search, Brave web search, or SearXNG web search; use \`config.webSearch\` unless the user explicitly asks for a node tool.
- The user only needs model, memory, integration, or target-skill guidance.
- You are researching an unfamiliar external API before choosing the tool shape.

## Workflow

Prefer existing workflow tools and node tools over custom tools for real-world actions.
Custom tools are for pure computation, validation, formatting, or planning logic;
they cannot perform live network, filesystem, process, timer, or host I/O.

### Workflow tools

- Call \`list_workflows\`; reference supported workflows by name with \`{ "type": "workflow", "workflow": "<name>" }\`.

### Node tools

- Use \`search_nodes\`, then \`get_node_types\`; never guess node type names.
- Use the tool node id from discovery, usually ending in \`Tool\`.
- Put fixed values in \`nodeParameters\`; use \`$fromAI\` for values the agent should decide at runtime.
- Wrap expressions in \`={{ }}\`; do not pipe AI-chosen fields through \`$json\`.
- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- For each required credential slot, call \`ask_credential\` once before config mutation. If skipped, still add the tool and omit only that credential slot.
- "Brave web search" and "SearXNG web search" are fallback web-search config,
  not node-tool requests. Use \`config.webSearch\` and \`ask_credential\`.
- Only add Brave or SearXNG node tools when the user explicitly asks for the
  node tool/integration itself or for node-specific configuration.

### Custom tools

- Use \`build_custom_tool\` with \`export default new Tool(...)\` and imports only from \`@n8n/agents\` and \`zod\`.
- Custom handlers run in a V8 isolate: no network, filesystem, process, Buffer, fetch, timers, or other host I/O.
- Do not use custom tools for live website crawling, HTTP fetching, API calls, SEO crawlers, or scraping. Use workflow or node tools for those.
- Return JSON-serializable values. Do not call \`.build()\`.
- Register the returned custom tool id in config after \`build_custom_tool\`.

### Provider tools

- Match provider tools to the configured model provider.
- Valid keys are exactly: ${formatValidProviderToolNames()}.
- Never use provider namespace keys such as \`anthropic\`, \`openai\`, or
  \`google\` in \`providerTools\`.
- Anthropic: \`providerTools["anthropic.web_search"]\`.
- OpenAI: \`providerTools["openai.web_search"]\` or \`providerTools["openai.image_generation"]\`, only for compatible OpenAI models.
- Google: \`providerTools["google.google_search"]\`, only for compatible Gemini models.

## Gotchas

- Web-search fallback services are config, not node tools, unless the user explicitly asks for a node integration.
- Live crawling, fetching, and API integrations need workflow or node tools, not custom tools.
- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- Do not invent node type names, workflow names, credential ids, or provider tool keys.
- If a required node-tool credential is skipped, add the tool and omit only that credential slot.
- \`build_custom_tool\` stores code only; the config still needs a \`{ "type": "custom", "id": "<returned id>" }\` tool ref.

## Verify

- Workflow tools reference discovered workflow names.
- Node tools use discovered tool node ids and valid node parameters.
- Custom tools return a stored custom tool id that is registered in config.
- Provider tool keys match the configured model provider and the valid key list.`,
	};
}
