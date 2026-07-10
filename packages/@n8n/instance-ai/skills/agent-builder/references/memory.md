# Agent Memory

Load this reference before changing any Agent memory setting. Session memory,
observational memory, and Episodic Memory are first-class Agent configuration,
authored through the typed workflow SDK `.memory(...)` method.

## Default memory

For a new Agent, include this exact source block unless the user explicitly asks
to disable or change memory:

```typescript
.memory({
  enabled: true,
  storage: 'n8n',
  observationalMemory: { enabled: true },
})
```

Observational memory is runtime-managed session memory. Do not add target-Agent
instructions telling it to decide what to save or how to maintain observations.

## Episodic Memory

Episodic Memory provides cross-session recall of prior conversations, decisions,
and artifacts. Enable it only when the user asks for Episodic Memory, long-term
memory, remembered prior conversations, or cross-session memory.

1. Call `agent_builder({ action: "resolve_episodic_memory_credential" })` before
   editing source.
2. On `ok: true`, copy the returned `episodicMemory` block into `.memory(...)`.
   Its `credential` can be a real OpenAI credential id or `"managed"`; use
   `"managed"` only when this action returns it.
3. On `reason: "ambiguous_credential"`, ask the user to choose among the
   returned credential names, then use that option's id.
4. On `reason: "missing_credential"`, call
   `credentials({ action: "setup", credentials: [{ credentialType:
   "openAiApi", reason: "Episodic Memory embeddings" }] })` and use the
   returned `credentials.openAiApi` id. If setup is deferred or needs browser
   setup, leave Episodic Memory disabled.
5. Preserve the existing memory block and tuning. Add or replace only
   `episodicMemory` unless the user requested other changes.

```typescript
.memory({
  enabled: true,
  storage: 'n8n',
  observationalMemory: { enabled: true },
  episodicMemory: {
    enabled: true,
    credential: 'credential-id-or-managed',
  },
})
```

The embedding credential is always an `openAiApi` credential resolved for this
purpose. Do not copy the main model credential or invent a credential id.

Optional Episodic Memory fields:

```typescript
episodicMemory: {
  enabled: true,
  credential: 'credential-id-or-managed',
  extractorModel: {
    model: 'provider/model-name',
    credential: 'worker-model-credential-id',
  },
  reflectorModel: {
    model: 'provider/model-name',
    credential: 'worker-model-credential-id',
  },
  topK: 10,              // integer, 1-100
  maxEntriesPerRun: 5,   // integer, 1-50
}
```

Add worker models only when the user explicitly requests specific memory-worker
models. Their credentials are separate from the embedding credential.

To disable Episodic Memory while preserving session memory, write
`episodicMemory: { enabled: false }`. To disable all memory, use
`.memory({ enabled: false, storage: 'n8n' })`.

After editing, call `build_agent` once. Its host validation is authoritative;
do not run a separate verifier.
