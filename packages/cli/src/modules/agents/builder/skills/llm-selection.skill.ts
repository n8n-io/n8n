import type { RuntimeSkill } from '@n8n/agents';

export function llmSelectionSkill(modelRecommendationsSection: string | null): RuntimeSkill {
	const recommendationGuidance = modelRecommendationsSection
		? `\n\n${modelRecommendationsSection}`
		: '\n\nNo Recommended LLM models section is available; do not recommend or name current, best, latest, or fallback model IDs from memory. Call ask_llm when the user needs model guidance or choice.';

	return {
		id: 'agent-builder-llm-selection',
		name: 'Agent builder LLM selection',
		description:
			'Use before setting, changing, resolving, or asking for the target agent main model and credential.',
		instructions: `\
Use \`resolve_llm\` before \`ask_llm\` when the request contains enough provider/model detail.

Rules:
- Fresh agents need a resolved \`model\` and \`credential\` before config is written.
- Explicit provider/model requests go to \`resolve_llm\` first.
- If the user asks to pick, change, confirm, or configure a model or main credential, call \`ask_llm\`; do not ask in prose.
- If \`resolve_llm\` succeeds, persist \`model = "{provider}/{model}"\` and \`credential = credentialId\`.
- For Anthropic and OpenAI models, native web search is enabled by default:
  persist \`config.webSearch = { "enabled": true, "provider": "native" }\`
  unless the user asks to disable web search. Do not write native
  \`providerTools\`; the write path derives them.
- For every other provider, web search requires fallback search: call
  \`ask_credential\`, then use \`provider: "brave"\` or \`provider: "searxng"\`.
- If the user explicitly asks for Brave or SearXNG, keep that provider even
  when the selected model also supports native search.
- If \`resolve_llm\` reports missing or ambiguous credentials/provider, call \`ask_llm\`.
- If it reports \`unknown_model\`, retry with a plausible returned model value or call \`ask_llm\`.
- For "Anthropic via OpenRouter", pass \`provider: "openrouter"\`; if the user names a routed model, pass the routed id without adding another provider prefix.
- Prefer a provider the user already has credentials for when choosing from recommendations.
- Never copy main LLM credential IDs from \`list_credentials\`.${recommendationGuidance}`,
	};
}
