import type { RuntimeSkill } from '@n8n/agents';

export function memorySkill(): RuntimeSkill {
	return {
		id: 'agent-builder-memory',
		name: 'Agent Builder Memory',
		description:
			'Use for explicit memory changes: Episodic/long-term/cross-session memory, observer/reflector/extractor worker models, threshold/budget tuning, or disabling memory. Not for ordinary fresh-agent creation, which uses the default memory config in Memory Guidance.',
		recommendedTools: [
			'ask_embedding_credential',
			'resolve_llm',
			'ask_credential',
			'read_config',
			'patch_config',
		],
		allowedTools: [
			'ask_embedding_credential',
			'resolve_llm',
			'ask_credential',
			'ask_questions',
			'read_config',
			'patch_config',
			'write_config',
		],
		instructions: `\
## Purpose

Use this to tune or disable the target agent's memory, or to enable Episodic
Memory (long-term, cross-session recall).

## Use when

- The user asks to enable, configure, or disable Episodic Memory, long-term
  memory, prior conversations, remembered decisions, exact artifacts, or
  cross-session memory.
- The user asks to tune observer/reflector/extractor worker models, token
  thresholds, render budgets, or the observation log tail limit.
- The user asks to disable session memory or observational memory.

## Observational Memory Tuning

- Supported observational memory tuning fields: \`enabled\`, \`observerModel\`, \`reflectorModel\`, \`observerThresholdTokens\`, \`reflectorThresholdTokens\`, \`renderTokenBudget\`, \`observationLogTailLimit\`, and \`lockTtlMs\`.
- Memory worker model fields must use object shape: \`{ "model": "provider/model-name", "credential": "<credentialId>" }\`.
- Only set \`observerModel\`, \`reflectorModel\`, \`extractorModel\`, or \`episodicMemory.reflectorModel\` when the user explicitly asks to use a specific model for memory work.
- Use only credential IDs returned by \`resolve_llm\` or \`ask_credential\` for memory worker model fields. Do not invent IDs or copy a main-model credential unless one of those tools returned it for that worker model provider.

## Episodic Memory

- Enable \`memory.episodicMemory\` only when the user asks for Episodic Memory, long-term memory, prior conversations, remembered decisions, exact artifacts, or cross-session memory.
- Before enabling it, call \`ask_embedding_credential({ credentialType: "openAiApi", purpose: "OpenAI credential for Episodic Memory embeddings" })\`.
- On success, set \`memory.episodicMemory = { "enabled": true, "credential": "<credentialId>" }\`, using the returned \`credentialId\` value. This can be a real credential id or \`"managed"\` when the assistant proxy is available. Preserve existing \`topK\` or \`maxEntriesPerRun\`.
- \`memory.episodicMemory.credential\` is only for OpenAI embeddings. It is separate from optional \`extractorModel\` and \`reflectorModel\` worker credentials.
- If credential selection is skipped, do not enable Episodic Memory; explain that it needs an OpenAI credential for embeddings.
- Do not add instructions saying the agent should remember, store, save, or decide what context matters. The runtime handles memory extraction and indexing.
- If instructions mention Episodic Memory, phrase it as retrieval/use only, e.g. "Use recalled prior context when relevant to the user's request."
- Do not invent Episodic Memory credential IDs or reuse the main model credential unless \`ask_embedding_credential\` returned it for this purpose.

## Gotchas

- Session memory and Episodic Memory are different features; do not use one as a substitute for the other.
- Observational memory is runtime-managed session memory behavior; do not add target-agent instructions telling it how to save observations.
- A skipped Episodic Memory credential means Episodic Memory stays disabled.

## Verify

- Episodic Memory has an OpenAI credential or \`"managed"\` returned by \`ask_embedding_credential\`.
- Existing memory tuning is preserved unless the user asked to change it.`,
	};
}
