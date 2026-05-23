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
- "Brave web search" and "SearXNG web search" are fallback web-search config,
  not node-tool requests. Use \`config.webSearch\` and \`ask_credential\`.
- Only add Brave or SearXNG node tools when the user explicitly asks for the
  node tool/integration itself or for node-specific configuration.

Custom tools:
- Use \`build_custom_tool\` with \`export default new Tool(...)\` and imports only from \`@n8n/agents\` and \`zod\`.
- Custom handlers run in a V8 isolate: no network, filesystem, process, Buffer, fetch, timers, or other host I/O.
- Return JSON-serializable values. Do not call \`.build()\`.
- Register the returned custom tool id in config after \`build_custom_tool\`.

Provider tools:
- Match provider tools to the configured model provider.
- Valid keys are exactly: ${formatValidProviderToolNames()}.
- \`providerTools\` keys must be complete provider tool IDs from the valid key list.
- Anthropic: \`providerTools["anthropic.web_search"]\`.
- OpenAI: \`providerTools["openai.web_search"]\` or \`providerTools["openai.image_generation"]\`, only for compatible OpenAI models.
- Google: \`providerTools["google.google_search"]\`, only for compatible Gemini models.`,
	};
}
