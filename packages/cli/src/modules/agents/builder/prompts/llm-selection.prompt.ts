export function getLlmSelectionPrompt(modelRecommendationsSection: string | null): string {
	const recommendationGuidance = modelRecommendationsSection
		? `\n\n${modelRecommendationsSection}`
		: '\n\nNo Recommended LLM models section is available; do not recommend or name current, best, latest, or fallback model IDs from memory. Ask via `ask_questions` when the user needs model guidance or choice.';

	return `\
## LLM Selection Guidance

### Purpose

Use this to resolve the target agent's main \`model\` and \`credential\`.

### Workflow

1. For fresh agents, call \`resolve_llm\` once, silently, before the first config write — with provider/model when the user named them, otherwise with no arguments.
2. If \`resolve_llm\` succeeds, persist \`model = "{provider}/{model}"\` and \`credential = credentialId\`. If the result has \`claimedFreeOpenAiCredits: true\`, tell the user you set them up with free OpenAI credits. If it has \`autoPicked: true\`, tell the user which provider and model you picked and that they can ask to change it — do not ask for confirmation and do not raise a trailing model question.
3. If the user asks to pick, change, confirm, or configure a model or main credential, ask via \`ask_questions\`; do not ask in prose.
4. During an initial build, if \`resolve_llm\` reports missing or ambiguous credentials/provider, do not ask: mark the model task \`blocked\`, keep building with \`model: ""\` and no \`credential\`, and include the model choice as a question in the trailing \`finish_setup\` call — for ambiguity between multiple credentials of one provider, use the credential names from the resolve_llm result as the question's options — when it resolves, call \`resolve_llm\` with the answer (pass \`credentialId\` when the user picked a specific credential) and patch \`/model\` and \`/credential\` — after \`read_config\`, since the user may have already set the model in the panel. For a model change on an existing agent, ask immediately instead, and never write \`model: ""\` over an existing model — keep the current model and credential until the new one is resolved.
5. If \`resolve_llm\` reports \`unknown_model\`, retry with a plausible returned model value or ask via \`ask_questions\`.
6. If the model is still unresolved when the user asks to run or publish the agent, leave the draft with \`model: ""\`, do not guess a model, and tell the user the agent needs a model and credential first — in the panel or here in chat. If they dismiss a model-change question on an existing agent, keep the current model and credential unchanged.

### Rules

- Do not enable \`config.webSearch\` before the model is resolved; set it in
  the same mutation that writes the resolved model.
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
- For "Anthropic via OpenRouter", pass \`provider: "openrouter"\`; if the user names a routed model, pass the routed id without adding another provider prefix.
- Prefer a provider the user already has credentials for when choosing from recommendations.
- Never copy main LLM credential IDs from \`list_credentials\`.

### Gotchas

- Use \`resolve_llm\` only for the target agent's main model credential.
- Use \`ask_credential\` for node tools, MCP servers, and fallback web-search credentials.
  Never use it for chat-channel credentials. For Episodic Memory, load
  \`agent-builder-memory\` and use \`ask_embedding_credential\` instead.
- For OpenRouter, \`provider\` is \`"openrouter"\`; the model can be a routed id such as \`anthropic/...\`.
- Do not recommend current, best, latest, or fallback model IDs from memory when the recommendation catalog is unavailable.

### Verify

- The persisted \`model\` is in \`provider/model\` form.
- The persisted \`credential\` came from \`resolve_llm\`.
- Existing Brave or SearXNG \`config.webSearch\` is preserved on model changes unless the user explicitly requested a web-search method change.${recommendationGuidance}`;
}
