import type { RuntimeSkill } from '@n8n/agents';

import { INITIAL_BUILD_NOTE } from '../prompts/initial-build.prompt';

export function memorySkill(): RuntimeSkill {
	return {
		id: 'agent-builder-memory',
		name: 'Agent Builder Memory',
		description:
			'Use for explicit memory changes: Episodic/long-term/cross-session memory, observer/reflector worker models, threshold/budget tuning, or disabling memory. Not for ordinary fresh-agent creation, which uses the default memory config in Memory Guidance.',
		recommendedTools: [
			'agent_builder_resolve_llm',
			'setup_credentials',
			'agent-context',
			'agent_builder_patch_config',
		],
		allowedTools: [
			'agent_builder_resolve_llm',
			'setup_credentials',
			'agent_builder_ask_questions',
			'agent-context',
			'agent_builder_patch_config',
			'agent_builder_write_config',
		],
		instructions: `\
## Purpose

Tune or disable target agent's memory, or enable Episodic
Memory (long-term, cross-session recall).

## Use when

- User asks to enable, configure, or disable Episodic Memory, long-term
  memory, prior conversations, remembered decisions, exact artifacts, or
  cross-session memory.
- User asks to tune observer/reflector worker models, token
  thresholds, render budgets, or observation log tail limit.
- User asks to disable session memory or observational memory.

## Observational Memory Tuning

- Supported observational memory tuning fields: \`enabled\`, \`observerModel\`, \`reflectorModel\`, \`observerThresholdTokens\`, \`reflectorThresholdTokens\`, \`renderTokenBudget\`, \`observationLogTailLimit\`, and \`lockTtlMs\`.
- Memory worker model fields must use object shape: \`{ "model": "provider/model-name", "credential": "<credentialId>" }\`.
- Only set \`observerModel\`, \`reflectorModel\`, or \`episodicMemory.reflectorModel\` when user explicitly asks to use specific model for memory work.
- Use only credential IDs returned by \`agent_builder_resolve_llm\` or \`setup_credentials(target: "agent")\` for memory worker model fields. Do not invent IDs or copy main-model credential unless one of those tools returned it for that worker model provider.

## Episodic Memory

- Enable \`memory.episodicMemory\` only when user asks for Episodic Memory, long-term memory, prior conversations, remembered decisions, exact artifacts, or cross-session memory.
- Before enabling it, call \`setup_credentials({ target: "agent", credentials: [{ credentialType: "openAiApi", reason: "OpenAI credential for Episodic Memory embeddings", allowManaged: true }] })\`. Without assistant proxy: ${INITIAL_BUILD_NOTE} Leave Episodic Memory disabled, include \`openAiApi\` entry in trailing \`agent_builder_finish_setup\` call, and enable it with returned credential id — draft schema requires credential to enable it.
- On success, set \`memory.episodicMemory = { "enabled": true, "credential": "<credentialId>" }\`, using returned \`credentialId\` value. This can be real credential id or \`"managed"\` when assistant proxy is available. Preserve existing \`topK\` or \`maxEntriesPerRun\`.
- \`memory.episodicMemory.credential\` is only for OpenAI embeddings. It is separate from optional \`reflectorModel\` worker credential.
- If credential selection is skipped, do not enable Episodic Memory; explain it needs OpenAI credential for embeddings.
- Do not add instructions saying agent should remember, store, save, or decide what context matters. Runtime handles memory extraction and indexing.
- If instructions mention Episodic Memory, phrase it as retrieval/use only, e.g. "Use recalled prior context when relevant to the user's request."
- Do not invent Episodic Memory credential IDs or reuse main model credential unless \`setup_credentials(target: "agent")\` with \`allowManaged: true\` returned it for this purpose.

## Gotchas

- Session memory and Episodic Memory are different features; do not use one as substitute for other.
- Observational memory is runtime-managed session memory behavior; do not add target-agent instructions telling it how to save observations.

## Verify

- Episodic Memory has OpenAI credential or \`"managed"\` returned by \`setup_credentials(target: "agent")\` with \`allowManaged: true\`.
- Existing memory tuning is preserved unless user asked to change it.`,
	};
}
