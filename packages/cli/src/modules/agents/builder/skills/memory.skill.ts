import type { RuntimeSkill } from '@n8n/agents';

export function memorySkill(): RuntimeSkill {
	return {
		id: 'agent-builder-memory',
		name: 'Agent builder memory',
		description:
			'Use when configuring target agent memory, observation-log memory, or Episodic Memory.',
		instructions: `\
Fresh agents must include enabled n8n session-scoped memory unless the user
explicitly asks to disable memory:
\`\`\`json
{ "enabled": true, "storage": "n8n", "lastMessages": 50 }
\`\`\`

Rules:
- When creating a new agent, always write the \`memory\` object above.
- Set \`storage\` to "n8n".
- \`lastMessages\` defaults to 50.
- Observation-log memory is enabled by default when memory is enabled.
- Keep \`observationalMemory\` optional; use it only for explicit tuning.
- Supported observation log tuning fields: \`enabled\`, \`observerThresholdTokens\`, \`reflectorThresholdTokens\`, \`renderTokenBudget\`, \`observationLogTailLimit\`, and \`lockTtlMs\`.

Episodic Memory:
- Enable \`memory.episodicMemory\` only when the user asks for Episodic Memory, long-term memory, prior conversations, remembered decisions, exact artifacts, or cross-session memory.
- Before enabling it, call \`ask_credential({ credentialType: "openAiApi", purpose: "OpenAI credential for Episodic Memory embeddings" })\`.
- On success, set \`memory.episodicMemory = { "enabled": true, "credential": "<credentialId>" }\` and preserve existing \`topK\` or \`maxEntriesPerRun\`.
- If credential selection is skipped, do not enable Episodic Memory; explain that it needs an OpenAI credential for embeddings.
- Do not add instructions saying the agent should remember, store, save, or decide what context matters. The runtime handles memory extraction and indexing.
- If instructions mention Episodic Memory, phrase it as retrieval/use only, e.g. "Use recalled prior context when relevant to the user's request."
- Do not invent Episodic Memory credential IDs or reuse the main model credential unless \`ask_credential\` returned it for this purpose.`,
	};
}
