export function getLlmSelectionPrompt(modelRecommendationsSection: string | null): string {
	const recommendationGuidance = modelRecommendationsSection
		? `\n\n${modelRecommendationsSection}`
		: '\n\nNo Recommended LLM models section is available; do not recommend or name current, best, latest, or fallback model IDs from memory. Call ask_llm when the user needs model guidance or choice.';

	return `\
## LLM Selection Guidance

### Purpose

Use this to resolve the target agent's main \`model\` and \`credential\`.

### Workflow

1. Use \`resolve_llm\` before \`ask_llm\` when the request contains enough provider/model detail.
2. If \`resolve_llm\` succeeds, persist \`model = "{provider}/{model}"\` and \`credential = credentialId\`.
3. If the user asks to pick, change, confirm, or configure a model or main credential, call \`ask_llm\`; do not ask in prose.
4. If \`resolve_llm\` reports missing or ambiguous credentials/provider, call \`ask_llm\`.
5. If \`resolve_llm\` reports \`unknown_model\`, retry with a plausible returned model value or call \`ask_llm\`.

### Rules

- Fresh agents need a resolved \`model\` and \`credential\` before config is written.
- Explicit provider/model requests go to \`resolve_llm\` first.
- If the user asks to pick, change, confirm, or configure a model or main credential, call \`ask_llm\`; do not ask in prose.
- If \`resolve_llm\` succeeds, persist \`model = "{provider}/{model}"\` and \`credential = credentialId\`.
- Only OpenAI and Anthropic models support native web search. Use native web
  search by default for those providers only, and only for
  fresh agents or agents with no existing \`config.webSearch\`. Persist
  \`config.webSearch = { "enabled": true, "provider": "native" }\` unless the
  user asks to disable web search. Do not write native \`providerTools\`; the
  write path derives them.
- When changing models, preserve existing Brave or SearXNG
  \`config.webSearch\` unchanged, including its credential, even if the new
  model supports native search. Switch fallback search to native only when the
  user explicitly asks for native/provider web search.
- For every provider other than OpenAI or Anthropic, web search requires
  fallback search: call \`ask_credential\`, then use \`provider: "brave"\` or
  \`provider: "searxng"\`.
- If the user explicitly asks for Brave or SearXNG, keep that provider even
  when the selected model also supports native search.
- If \`resolve_llm\` reports missing or ambiguous credentials/provider, call \`ask_llm\`.
- If it reports \`unknown_model\`, retry with a plausible returned model value or call \`ask_llm\`.
- For "Anthropic via OpenRouter", pass \`provider: "openrouter"\`; if the user names a routed model, pass the routed id without adding another provider prefix.
- Prefer a provider the user already has credentials for when choosing from recommendations.
- Never copy main LLM credential IDs from \`list_credentials\`.

### Gotchas

- Use \`resolve_llm\` or \`ask_llm\` only for the target agent's main model credential.
- Use \`ask_credential\` for node tools, integrations, and Episodic Memory.
- For OpenRouter, \`provider\` is \`"openrouter"\`; the model can be a routed id such as \`anthropic/...\`.
- Model changes must not silently replace existing Brave or SearXNG web search with native search.
- Do not recommend current, best, latest, or fallback model IDs from memory when the recommendation catalog is unavailable.

### Verify

- The persisted \`model\` is in \`provider/model\` form.
- The persisted \`credential\` came from \`resolve_llm\` or \`ask_llm\`.
- Existing Brave or SearXNG \`config.webSearch\` is preserved on model changes unless the user explicitly requested a web-search method change.${recommendationGuidance}`;
}
