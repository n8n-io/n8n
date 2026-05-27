export const MEMORY_PROMPT = `\
## Memory Guidance

### Purpose

Use this to configure the target agent's memory behavior.

### Workflow

Fresh agents must include this default memory config unless the user explicitly asks to disable or change memory:
\`\`\`json
{
  "enabled": true,
  "storage": "n8n",
  "lastMessages": 50,
  "observationalMemory": {
    "enabled": true
  }
}
\`\`\`

This is the configurable agent's session memory. The runtime-managed
\`observationalMemory\` settings tune that memory behavior; they are not a
separate user-facing memory product.

### Rules

- When creating a new agent, always write the exact default \`memory\` object above.
- Set \`storage\` to "n8n".
- \`lastMessages\` defaults to 50.
- Set \`observationalMemory.enabled\` to \`true\` for new agents unless the user explicitly asks to disable observational memory.
- Keep the rest of \`observationalMemory\` optional; add tuning fields only for explicit tuning or disabling.
- Supported observational memory tuning fields: \`enabled\`, \`observerThresholdTokens\`, \`reflectorThresholdTokens\`, \`renderTokenBudget\`, \`observationLogTailLimit\`, and \`lockTtlMs\`.

### Episodic Memory

- Enable \`memory.episodicMemory\` only when the user asks for Episodic Memory, long-term memory, prior conversations, remembered decisions, exact artifacts, or cross-session memory.
- Before enabling it, call \`ask_credential({ credentialType: "openAiApi", purpose: "OpenAI credential for Episodic Memory embeddings" })\`.
- On success, set \`memory.episodicMemory = { "enabled": true, "credential": "<credentialId>" }\` and preserve existing \`topK\` or \`maxEntriesPerRun\`.
- If credential selection is skipped, do not enable Episodic Memory; explain that it needs an OpenAI credential for embeddings.
- Do not add instructions saying the agent should remember, store, save, or decide what context matters. The runtime handles memory extraction and indexing.
- If instructions mention Episodic Memory, phrase it as retrieval/use only, e.g. "Use recalled prior context when relevant to the user's request."
- Do not invent Episodic Memory credential IDs or reuse the main model credential unless \`ask_credential\` returned it for this purpose.

### Gotchas

- Session memory and Episodic Memory are different features; do not use one as a substitute for the other.
- Observational memory is runtime-managed session memory behavior; do not add target-agent instructions telling it how to save observations.
- A skipped Episodic Memory credential means Episodic Memory stays disabled.

### Verify

- Fresh runnable agents have enabled n8n memory unless explicitly disabled.
- Fresh runnable agents set \`observationalMemory.enabled\` to \`true\` unless explicitly disabled.
- Episodic Memory has an OpenAI credential returned by \`ask_credential\`.
- Existing memory tuning is preserved unless the user asked to change it.`;
