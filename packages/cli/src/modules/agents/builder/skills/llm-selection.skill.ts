import type { RuntimeSkill } from '@n8n/agents';

export function llmSelectionSkill(modelRecommendationsSection: string | null): RuntimeSkill {
	const recommendationGuidance = modelRecommendationsSection
		? `\n\n${modelRecommendationsSection}`
		: '\n\nNo Recommended LLM models section is available; do not recommend or name current, best, latest, or fallback model IDs from memory. Call ask_llm when the user needs model guidance or choice.';

	return {
		id: 'agent-builder-llm-selection',
		name: 'Agent builder LLM selection',
		description:
			'Use when setting, changing, resolving, or asking for the target agent main LLM model and credential, including provider-native web-search defaults; do not use for node-tool, integration, fallback web-search, or Episodic Memory credentials.',
		instructions: `\
## Purpose

Use this to resolve the target agent's main \`model\` and \`credential\`.
Provider-native features such as web search may also depend on this choice.

## Boundaries

- You need credentials for node tools, integrations, fallback web search, or Episodic Memory; use \`ask_credential\`.
- You are only editing tools, memory, integrations, target-agent skills, or instructions without changing the main LLM.
- The user is making a small-set choice that is not about the main LLM; use \`ask_question\` when appropriate.

## Workflow

1. Use \`resolve_llm\` before \`ask_llm\` when the request contains enough provider/model detail.
2. If \`resolve_llm\` succeeds, persist \`model = "{provider}/{model}"\` and \`credential = credentialId\`.
3. If the user asks to pick, change, confirm, or configure a model or main credential, call \`ask_llm\`; do not ask in prose.
4. If \`resolve_llm\` reports missing or ambiguous credentials/provider, call \`ask_llm\`.
5. If \`resolve_llm\` reports \`unknown_model\`, retry with a plausible returned model value or call \`ask_llm\`.

## Rules

- Fresh agents need a resolved \`model\` and \`credential\` before config is written.
- Explicit provider/model requests go to \`resolve_llm\` first.
- If the user asks to pick, change, confirm, or configure a model or main credential, call \`ask_llm\`; do not ask in prose.
- If \`resolve_llm\` succeeds, persist \`model = "{provider}/{model}"\` and \`credential = credentialId\`.
- For Anthropic and OpenAI models, native web search is enabled by default:
  persist \`config.webSearch.enabled = true\` unless the user asks to disable
  web search. Do not write native \`providerTools\`; the write path derives them.
- For every other provider, web search requires fallback search:
  use \`provider: "brave"\` or \`provider: "searxng"\` under \`config.webSearch\`
  and call \`ask_credential\` for the matching search credential before writing it.
- If \`resolve_llm\` reports missing or ambiguous credentials/provider, call \`ask_llm\`.
- If it reports \`unknown_model\`, retry with a plausible returned model value or call \`ask_llm\`.
- For "Anthropic via OpenRouter", pass \`provider: "openrouter"\`; if the user names a routed model, pass the routed id without adding another provider prefix.
- Prefer a provider the user already has credentials for when choosing from recommendations.
- Never copy main LLM credential IDs from \`list_credentials\`.

## Gotchas

- Use \`resolve_llm\` or \`ask_llm\` only for the target agent's main model credential.
- Use \`ask_credential\` for node tools, integrations, fallback web search, and Episodic Memory.
- For OpenRouter, \`provider\` is \`"openrouter"\`; the model can be a routed id such as \`anthropic/...\`.
- Do not recommend current, best, latest, or fallback model IDs from memory when the recommendation catalog is unavailable.

## Verify

- The persisted \`model\` is in \`provider/model\` form.
- The persisted \`credential\` came from \`resolve_llm\` or \`ask_llm\`.
- Native web-search config matches the selected provider unless the user disabled it.${recommendationGuidance}`,
	};
}
