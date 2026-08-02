# Prompt caching

`Agent.promptCaching()` generates provider-specific `providerOptions` for
Anthropic and OpenAI so callers don't have to hand-write the Vercel AI SDK's
raw `cacheControl` / `promptCacheKey` shapes. It layers on top of the existing
`providerOptions` escape hatch — nothing here is required, and anything set
explicitly (via `.instructions(text, { providerOptions })`, call-level
`providerOptions`, or `Tool.providerOptions(...)`) always wins on conflicts.

```typescript
// Defaults tuned for agent workloads: Anthropic gets a 1h instruction
// breakpoint, OpenAI gets 24h retention plus an auto-generated cache key.
new Agent('assistant').model('anthropic/claude-sonnet-4-5').promptCaching().instructions(LONG_SYSTEM_PROMPT);

// Override a field, or disable a provider entirely.
new Agent('assistant')
  .model('anthropic/claude-sonnet-4-5')
  .promptCaching({ anthropic: { ttl: '5m' } })
  .instructions(LONG_SYSTEM_PROMPT);

new Agent('assistant')
  .model('openai/gpt-5.1')
  .promptCaching({ openai: { promptCacheKey: 'assistant-v1' } })
  .instructions(LONG_SYSTEM_PROMPT);
```

## The n8n Agent JSON config is a mandatory, simplified surface

The richer SDK shape above (OpenAI key/retention overrides) is for direct SDK
callers. The n8n Agent product (JSON config / builder UI) exposes
`config.promptCaching: { enabled: boolean; anthropic?: { ttl?: '5m' | '1h' } }`
and maps it straight to `agent.promptCaching(config.promptCaching)`. Two
differences from the general SDK usage worth knowing:

- **Mandatory, not opt-in or opt-out.** For OpenAI and Anthropic agents, the
  config is always force-written with `{ enabled: true, ... }` — by the
  builder agent's write-path normalizer and the model picker — regardless of
  what the LLM or a prior config said; there is no user-facing way to disable
  it. Every other provider never gets the field at all. As with the SDK, a
  missing `promptCaching` field is still just "disabled" at runtime — the
  mandatory-on behavior lives in the config producers (builder tools, model
  picker), not in the runtime default.
- **TTL is Anthropic-only and defaults to `1h`.** The Advanced panel renders
  a Cache duration dropdown (`5m` / `1h`) only for Anthropic agents; OpenAI
  has no sub-config or UI (its caching is fully automatic server-side). The
  TTL is preserved across a switch between Anthropic and another supported
  provider and back.

## Prefix stability (always on, both providers)

Unlike everything else in this doc, this part is not gated by
`.promptCaching()` — it's baseline hygiene that keeps the system-instructions
prefix byte-stable, which both OpenAI's automatic caching and Anthropic's
`cacheControl` breakpoint depend on regardless of whether the SDK feature is
enabled.

Tools can attach a `systemInstruction` fragment (`Tool.systemInstruction(...)`)
that gets merged into the system prompt. Deferred tools loaded mid-conversation
via `load_tool` are a special case: if a newly loaded tool has a
`systemInstruction`, merging it into the same cached instructions string the
moment it loads would change that string's bytes — a full-prefix cache miss
for OpenAI, and an invalidated breakpoint for Anthropic, for the rest of the
conversation.

`RuntimeContextBuilder.composeEffectiveInstructions()` avoids this by
splitting fragments by stability:

- **Stable** (base tools, the deferred-tool controllers `search_tools` /
  `load_tool`, the episodic-recall tool) stay in the cached instructions
  message — this set never changes for the life of a run.
- **Volatile** (tools loaded via `load_tool` during the conversation) are
  routed into the same uncached second system message that observation-log
  memory uses (see `buildSystemMessages`), not dropped — the model still
  sees the instruction the moment the tool loads, just outside the cached
  prefix.

Other prefix-stability hygiene, already true or verified: tool ordering is
append-only (`getCurrentTools()` only ever appends), and none of the current
built-in `systemInstruction` sources (`delegate_subagent`, `write_todos`,
`recall_memory`) interpolate timestamps, run IDs, or other per-request
nondeterminism into their text. Hosts can rename the delegate tool and replace
its description / system instruction (`createDelegateSubAgentTool({ name,
description, systemInstruction })`, mirrored into `write_todos` via
`createWriteTodosTool({ delegateToolName })`), but those values are fixed at
tool-build time, so the instructions prefix stays byte-stable for the life of
a run.

## Anthropic: instruction-level cache breakpoint

`.promptCaching()` attaches `providerOptions.anthropic.cacheControl` to the
agent's system instructions (`buildSystemMessages()` already splits static
instructions from observation-log memory into separate system messages, so
the cache breakpoint on instructions survives append-only memory growth).

- **`ttl: '1h'` (default).** Anthropic's default cache TTL is 5 minutes, and
  the API silently reverted to that default in early 2026. Agent workloads
  that pause — HITL tool approval, multi-step tool loops, eval waves — often
  go longer than 5 minutes between calls, so a `1h` breakpoint fails cheaper
  than repeatedly missing a `5m` one. `1h` writes cost 2x base input;
  `5m` writes cost 1.25x. Reads are always ~0.1x.
- **`ttl: '5m'`.** Use this for continuously warm chat loops (steady traffic,
  no multi-minute gaps) to avoid the larger `1h` write premium.
- Anthropic requires a minimum prompt length to cache at all (roughly 1,024
  tokens for the Sonnet family, 4,096 tokens for Opus 4.5 / Haiku 4.5).
  Below that, the request still succeeds — it's just never cached.
- Only Anthropic models get this option; it's a no-op for other providers.

## Anthropic: runtime breakpoints (conversation history + tools)

On top of the instruction breakpoint above, every model call for an Anthropic
agent with `.promptCaching()` enabled adds up to two more breakpoints,
applied only to the per-call AI SDK `messages` / tool set (never persisted
back to memory, checkpoints, or `AgentMessageList`):

- **Conversation-history breakpoint.** A single moving `cacheControl` marker
  on the last message of the call. Because Anthropic matches cached content
  by byte-exact prefix, and the conversation only ever grows by appending
  new messages, this lets multi-step tool loops and multi-turn conversations
  read the cached prefix instead of reprocessing the whole transcript on
  every call.
- **Tool-definitions breakpoint.** A `cacheControl` marker on the last tool
  definition, added only when the tool set is **static** for the run — i.e. no
  deferred/loaded tools are configured. A large, stable tool block then stays
  cached independently of the conversation prefix, so it survives even if the
  history breakpoint above gets invalidated (e.g. by a burst of unrelated
  system-message churn). Deferred / MCP-loaded tool sets are skipped — the
  tool list can change mid-conversation via `load_tool`, and caching a block
  that gets invalidated would just pay the write premium for no read. The
  episodic-recall tool does **not** disqualify this breakpoint: its definition
  is static and calling it only appends tool output to the conversation, never
  changing the tool set.

Both markers reuse the configured Anthropic TTL (`getAnthropicCacheTtl`).

**4-breakpoint budget.** Anthropic hard-errors past 4 `cacheControl`
breakpoints per request. Before adding either runtime breakpoint, the
runtime counts every existing marker (system instructions, caller-supplied
markers via `.instructions(text, { providerOptions })` or
`Tool.providerOptions(...)`, and any already present on tools/messages) and
only adds a runtime breakpoint while the running total stays `<= 4`. Caller
breakpoints are counted first and are never evicted; when the budget is
already exhausted (e.g. 4 caller-supplied markers), neither runtime
breakpoint is added. When exactly one slot remains, the conversation-history
breakpoint takes priority over the tool breakpoint — it recurs every turn,
while a static tool block is already covered as part of the history
breakpoint's prefix.

## OpenAI: cache key + retention

`.promptCaching()` attaches `providerOptions.openai.promptCacheKey` and
`promptCacheRetention` as call-level options. OpenAI's own prompt caching is
automatic for prefixes ≥1024 tokens — there is no `cacheControl` to set —
these two options only influence routing and retention.

- **`promptCacheKey` (auto-generated by default).** A routing hint combined
  with OpenAI's own prefix hash to keep requests sharing a prefix on the same
  inference machine. The auto-generated key is a hash of the agent name,
  model id, and base instructions — stable across runs of the same "agent
  version", and never contains raw instruction text, user input, thread ids,
  or tenant/user identifiers. Set it explicitly for per-tenant routing, but
  keep each unique prefix + key combination under roughly 15 requests/minute
  or the excess traffic overflows to additional machines (each a cache miss).
- **`promptCacheRetention: '24h'` (default).** Extends retention beyond the
  default ~5–10 minute in-memory window. It's free on `gpt-4.1`, `gpt-5`, and
  `gpt-5.1`; on `gpt-5.5` and later, `'24h'` is the only supported value.
  Pass `'in_memory'` explicitly to opt back into the short-lived default.

## Reading cache usage and cost

`TokenUsage.inputTokenDetails` reports `noCache`, `cacheRead`, and
`cacheWrite` token counts whenever the provider supplies enough information
(OpenAI's `cachedPromptTokens` is normalized into the same shape as
Anthropic's native cache breakdown). A healthy Anthropic
`cacheRead : cacheWrite` ratio is above roughly 10:1 — a lower ratio usually
means the TTL is too short for the traffic pattern, or the cached prefix
isn't byte-stable across calls.

`GenerateResult.usage.cost` / the `finish` chunk's `usage.cost` factor in the
model catalog's cache rates when available. One known approximation: the
catalog's `cacheWrite` rate reflects Anthropic's 5-minute write premium
(1.25x base input); when the effective TTL is `1h` the runtime scales that
rate by ~1.6x (2x/1.25x) to approximate the 1h premium, rather than looking
up a separate 1h rate from the catalog. This 1h scaling only applies when
`.promptCaching()` is enabled for an Anthropic model — cache writes from a
manual, caller-supplied `cacheControl` marker (without `.promptCaching()`)
are billed at the catalog's 5-minute rate.

## What this does not do

- The tool-definitions breakpoint only ever covers a **single, static**
  snapshot of the tool set (see above) — deferred/loaded tool sets get no
  automatic tool caching in v1 (the episodic-recall tool is fine, since it is
  static within a run). Mark deferred tools explicitly with
  `Tool.providerOptions({ anthropic: { cacheControl: { type: 'ephemeral' } } })`
  if needed.
- Only one moving conversation-history breakpoint is added per call — there
  is no second/dual breakpoint for splitting "older, stable" history from
  "recent, volatile" history.
- Provider-defined tools (e.g. Anthropic's built-in `web_search`) are never
  automatically marked.
- OpenAI has no equivalent runtime breakpoints — its caching is fully
  automatic server-side prefix matching, so `.promptCaching()` only ever
  affects the call-level `promptCacheKey` / `promptCacheRetention` options
  described above.
- Once a deferred tool is loaded, its `systemInstruction` fragment stays in
  the volatile (uncached) message for the rest of that conversation,
  including future turns — it's never "promoted" back into the cached
  instructions message. This repeats a small, fixed string on every call
  rather than growing it, so it doesn't affect cache stability.
