# Prompt caching

`Agent.promptCaching()` generates provider-specific `providerOptions` for
Anthropic, Claude on OpenRouter and Vertex, and OpenAI. Callers do not have to
write the AI SDK's raw `cacheControl` / `promptCacheKey` shapes. It uses the existing
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
and passes explicit settings to `agent.promptCaching(config.promptCaching)`.

- **Mandatory in the builder.** For OpenAI, Anthropic, and Claude on OpenRouter
  or Vertex, the config is always force-written with `{ enabled: true, ... }` by the
  builder agent's write-path normalizer and the model picker — regardless of
  what the LLM or a prior config said; there is no user-facing way to disable
  it. Other models do not get the field.
- **Existing routed Claude agents get the default on their next run.** When a
  saved `openrouter/anthropic/claude-*` or `google-vertex/claude-*` agent has no
  cache config, the JSON loader supplies `{ enabled: true }`. This does not
  change the saved config. Explicit settings, including `enabled: false`, pass
  through unchanged. Standalone SDK use stays opt-in.
- **Claude cache duration defaults to `1h`.** The Advanced panel renders
  a Cache duration dropdown (`5m` / `1h`) for Anthropic and routed Claude agents.
  OpenAI has no sub-config or UI (its caching is fully automatic server-side).
  The TTL is preserved when switching between the supported Claude routes.

## Prefix stability (always on)

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
  `load_tool`, the episodic-memory tools) stay in the cached instructions
  message — this set never changes for the life of a run.
- **Volatile** (tools loaded via `load_tool` during the conversation) are
  routed into the same uncached second system message that observation-log
  memory uses (see `buildSystemMessages`), not dropped — the model still
  sees the instruction the moment the tool loads, just outside the cached
  prefix.

Runtime skills follow the same principle. `ActiveSkills.modelMessages()`
appends the current skill body to the tool result that activated it: a
`load_skill` call, or any tool that calls `ctx.loadSkill`. Recorded `load_skill`
results are collapsed to `{ skillId, active }` first, so an obsolete persisted
body is never replayed. A programmatic activation stamps its tool call with the
skill id, so the skill re-anchors to the same result on later turns. The
top-level system prompt does not mention an anchored skill, so activating and
carrying a skill never rewrites the cached prefix. The `<active_skills>` block
is a recovery path. `instructions()` moves a skill into it only when no
visible, successfully resolved tool result can carry it: observational memory
masked the result, the activating call failed, or no record of the activation
exists.

The block is not part of the base instructions. `buildSystemMessages` sends it
as its own system message, after the base instructions and before the volatile
message. The tools and base instructions in front of it stay byte-identical, so
they stay cached when a skill moves into the block. On the native Anthropic API,
the block reuses the instruction cache options. It gets its own breakpoint and
stays cached when memory compacts again later.
`buildSkillInstructionCacheOptions` drops that breakpoint when it would leave
no slot for the conversation breakpoint next to caller breakpoints on tools,
history messages, and their content parts.
Providers without split system messages get the block merged after the base
instructions, as before.

Tools that a registered skill lists in `dependencies.tools` are active for the
whole run. `AgentRuntime` moves them out of the deferred set at construction.
If they loaded only when the skill activated, the tool list would change
mid-conversation. Anthropic renders tools first, so that change invalidates the
whole cached prefix.

Other prefix-stability hygiene, already true or verified: tool ordering is
append-only (`getCurrentTools()` only ever appends), and none of the current
built-in `systemInstruction` sources (`delegate_subagent`, `write_todos`,
`recall_memory`, `flag_memory`) interpolate timestamps, run IDs, or other
per-request nondeterminism into their text. Hosts can rename the delegate tool
and replace its description / system instruction
(`createDelegateSubAgentTool({ name, description, systemInstruction })`,
mirrored into `write_todos` via `createWriteTodosTool({ delegateToolName })`),
but those values are fixed at tool-build time, so the instructions prefix stays
byte-stable for the life of a run.

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
- Direct Anthropic and Claude on Vertex use this path. OpenRouter uses the
  separate path below.

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
  episodic-memory tools do **not** disqualify this breakpoint. Their definitions
  are static. Calling them only appends tool output to the conversation and
  never changes the tool set.

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

## OpenRouter: Claude instructions and automatic conversation caching

For `openrouter/anthropic/claude-*`, `.promptCaching()` adds two controls:

- An explicit `cache_control` on the stable system instructions.
- A top-level `cache_control` for automatic conversation caching. OpenRouter
  moves this breakpoint as the conversation grows.

Both use `anthropic.ttl` from the existing config. The default is `1h`.
The runtime adds these controls after it assembles the prompt for each call.
It does not change stored messages or tool definitions.

The four-breakpoint limit includes automatic caching. Caller controls take
priority, then stable instructions, then automatic caching. The runtime counts
both `anthropic` and `openrouter` options and both cache-control key spellings.
A message marker on grouped tool results counts once for each result because
the adapter copies it to every tool message. Generated controls are omitted
when no slot remains or when they would put a longer TTL after a shorter one.
An explicit marker on the final block also suppresses generated automatic
caching, which can otherwise conflict with that marker's TTL.

The OpenRouter adapter does not forward cache markers on tool definitions.
The runtime adds no such markers, and it adds no markers to tool results or
recovered-skill system messages. Stable tool definitions are still part of the
cached prefix before the instruction breakpoint.

Generic `.reasoning()` settings map to `openrouter.reasoning.effort`.
Explicit `openrouter.reasoning` options take precedence, including token
budgets. The adapter retains reasoning details through tool calls.

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

For OpenRouter, the runtime removes cache-write tokens from the adapter's
uncached-input count in both generated and streamed responses. Each input
token belongs to one cost bucket. Raw provider usage remains unchanged.

`GenerateResult.usage.cost` / the `finish` chunk's `usage.cost` factor in the
model catalog's cache rates when available. One known approximation: the
catalog's `cacheWrite` rate reflects Anthropic's 5-minute write premium
(1.25x base input); when the effective TTL is `1h` the runtime scales that
rate by ~1.6x (2x/1.25x) to approximate the 1h premium, rather than looking
up a separate 1h rate from the catalog. This 1h scaling only applies when
`.promptCaching()` is enabled for an Anthropic model, including Claude on
OpenRouter and Vertex. Cache writes from a manual, caller-supplied
`cacheControl` marker (without `.promptCaching()`) use the catalog's 5-minute
rate in the estimate.

## What this does not do

- The tool-definitions breakpoint only ever covers a **single, static**
  snapshot of the tool set (see above) — deferred/loaded tool sets get no
  automatic tool caching in v1 (the episodic-memory tools are static within a
  run). Mark deferred tools explicitly with
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
