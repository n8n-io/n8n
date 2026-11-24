# Prompt Caching - Design & Optimization

This file covers how to design prompt-building code for effective caching. For language-specific syntax, see the `## Prompt Caching` section in each language's README or single-file doc.

## The one invariant everything follows from

**Prompt caching is a prefix match. Any change anywhere in the prefix invalidates everything after it.**

The cache key is derived from the exact bytes of the rendered prompt up to each `cache_control` breakpoint. A single byte difference at position N - a timestamp, a reordered JSON key, a different tool in the list - invalidates the cache for all breakpoints at positions >= N.

Render order is: `tools` -> `system` -> `messages`. A breakpoint on the last system block caches both tools and system together.

Design the prompt-building path around this constraint. Get the ordering right and most caching works for free. Get it wrong and no amount of `cache_control` markers will help.

---

## Workflow for optimizing existing code

When asked to add or optimize caching:

1. **Trace the prompt assembly path.** Find where `system`, `tools`, and `messages` are constructed. Identify every input that flows into them.
2. **Classify each input by stability:**
   - Never changes -> belongs early in the prompt, before any breakpoint
   - Changes per-session -> belongs after the global prefix, cache per-session
   - Changes per-turn -> belongs at the end, after the last breakpoint
   - Changes per-request (timestamps, UUIDs, random IDs) -> **eliminate or move to the very end**
3. **Check rendered order matches stability order.** Stable content must physically precede volatile content. If a timestamp is interpolated into the system prompt header, everything after it is uncacheable regardless of markers.
4. **Place breakpoints at stability boundaries.** See placement patterns below.
5. **Audit for silent invalidators.** See anti-patterns table.

---

## Placement patterns

### Large system prompt shared across many requests

Put a breakpoint on the last system text block. If there are tools, they render before system - the marker on the last system block caches tools + system together.

```json
"system": [
  {"type": "text", "text": "<large shared prompt>", "cache_control": {"type": "ephemeral"}}
]
```

### Multi-turn conversations

Put a breakpoint on the last content block of the most-recently-appended turn. Each subsequent request reuses the entire prior conversation prefix. Earlier breakpoints remain valid read points, so hits accrue incrementally as the conversation grows.

```json
// Last content block of the last user turn
messages[-1].content[-1].cache_control = {"type": "ephemeral"}
```

### Shared prefix, varying suffix

Many requests share a large fixed preamble (few-shot examples, retrieved docs, instructions) but differ in the final question. Put the breakpoint at the end of the **shared** portion, not at the end of the whole prompt - otherwise every request writes a distinct cache entry and nothing is ever read.

```json
"messages": [{"role": "user", "content": [
  {"type": "text", "text": "<shared context>", "cache_control": {"type": "ephemeral"}},
  {"type": "text", "text": "<varying question>"}  // no marker - differs every time
]}]
```

### Mid-conversation system messages

**Claude Opus 5, Claude Opus 5.5, Claude Opus 4.8, Claude Fable 5, Claude Fable 5.1, Claude Mythos 5, Claude Mythos 5.1, and Claude Sonnet 5.5; no beta header. Not available on Claude Sonnet 5** - use top-level `system` there. (Sources conflict on Claude Sonnet 5: the model config marks it supported, but every canonical docs page omits it. Treat it as unsupported and catch the 400.) When an operator instruction arrives mid-conversation - a mode switch, updated context, dynamically injected state - send it as `{"role": "system", "content": "..."}` appended to `messages[]`, rather than editing top-level `system`. Editing top-level `system` changes the prefix ahead of the entire conversation history, so every cached turn is re-processed uncached; a `role: "system"` message sits after the history and leaves the cached prefix intact.

```json
// Top-level system stays byte-identical; new instruction goes after the cached history
"system": [{"type": "text", "text": "<stable core>", "cache_control": {"type": "ephemeral"}}],
"messages": [
  ...history,
  {"role": "user", "content": "..."},
  {"role": "system", "content": "Terse mode enabled - keep responses under 40 words."}
]
```

This is also the prompt-injection-safe replacement for embedding operator instructions as text inside a user turn (the `<system-reminder>` pattern): both have the same caching profile, but `role: "system"` is the non-spoofable operator channel, whereas text inside user/tool content can be forged by anything that writes to user-visible input.

Must follow a `role: "user"` message (or an `assistant` message ending in server-tool use), and must be either the last entry in `messages` or be followed by an `assistant` turn; cannot be `messages[0]` - use top-level `system` for the initial prompt. Content is text-only. Unsupported models return a 400 (`BadRequestError`: `role 'system' is not supported on this model`); catch that error and fall back to putting the instruction in a user-turn `<system-reminder>` block.

**Per-turn reminders in a tool loop: turn-scoped messages, never deleted.** A reminder injected into history and removed on the next request is a history edit - the cache misses from that point and, on Claude Fable 5.1, Claude Opus 5.5, Claude Sonnet 5.5, and Claude Haiku 5.5, every later thinking block is invalidated. Instead give the `role: "system"` message `clear_at: "next_user_message"` (beta `mid-conversation-system-clear-at-2026-08-21`; same models and platforms as mid-conversation system messages): it renders for one turn, then stays in the transcript cleared - costing no input tokens, not cache-eligible (`cache_control` on it is a 400; put the breakpoint on the preceding user turn), and still part of the prefix. Append a fresh copy after each `tool_result` message and leave earlier copies in place; without the beta, a `text` block after the `tool_result` blocks in the same user message, earlier copies kept. Separately, per-message effort (beta `mid-conversation-output-config-2026-07-01`; Claude Fable 5.1, Claude Mythos 5.1, Claude Opus 5, Claude Opus 5.5, Claude Sonnet 5.5, and Claude Haiku 5.5 with thinking on; Claude API and Google Cloud): a `role: "system"` message with `content: []` and `output_config: {effort: ...}` changes effort from the next user turn on **without** the messages-cache invalidation that a top-level `effort` change causes, and is exempt from the placement rules (it can sit anywhere) - see the Invalidation hierarchy below and `shared/model-migration.md` -> Migrating to Claude Fable 5.1 from Claude Fable 5 -> New API features.

### Prompts that change from the beginning every time

Don't cache. If the first 1K tokens differ per request, there is no reusable prefix. Adding `cache_control` only pays the cache-write premium with zero reads. Leave it off.

---

## Architectural guidance

These are the decisions that matter more than marker placement. Fix these first.

**Keep the system prompt frozen.** Don't interpolate "current date: X", "mode: Y", "user name: Z" into the system prompt - those sit at the front of the prefix and invalidate everything downstream. Inject dynamic context later in `messages` instead - as a `{"role": "system", ...}` message where supported (see § Mid-conversation system messages above), or as text in a user message otherwise. A message at turn 5 invalidates nothing before turn 5.

**Don't change tools or model mid-conversation.** Tools render at position 0; adding, removing, or reordering a tool invalidates the entire cache. Same for switching models (caches are model-scoped). If you need "modes", don't swap the tool set - give Claude a tool that records the mode transition, or pass the mode as message content. Serialize tools deterministically (sort by name).

**Fork operations must reuse the parent's exact prefix.** Side computations (summarization, compaction, sub-agents) often spin up a separate API call. If the fork rebuilds `system` / `tools` / `model` with any difference, it misses the parent's cache entirely. Copy the parent's `system`, `tools`, and `model` verbatim, then append fork-specific content at the end.

---

## Silent invalidators

When reviewing code, grep for these inside anything that feeds the prompt prefix:

| Pattern | Why it breaks caching |
|---|---|
| `datetime.now()` / `Date.now()` / `time.time()` in system prompt | Prefix changes every request |
| `uuid4()` / `crypto.randomUUID()` / request IDs early in content | Same - every request is unique |
| `json.dumps(d)` without `sort_keys=True` / iterating a `set` | Non-deterministic serialization -> prefix bytes differ |
| f-string interpolating session/user ID into system prompt | Per-user prefix; no cross-user sharing |
| Conditional system sections (`if flag: system += ...`) | Every flag combination is a distinct prefix |
| `tools=build_tools(user)` where set varies per user | Tools render at position 0; nothing caches across users |

Fix by moving the dynamic piece after the last breakpoint, making it deterministic, or deleting it if it's not load-bearing.

---

## API reference

```json
"cache_control": {"type": "ephemeral"}              // 5-minute TTL (default)
"cache_control": {"type": "ephemeral", "ttl": "1h"} // 1-hour TTL
```

- Max **4** `cache_control` breakpoints per request.
- Goes on any content block: system text blocks, tool definitions, message content blocks (`text`, `image`, `tool_use`, `tool_result`, `document`).
- Top-level `cache_control` on `messages.create()` auto-places on the last cacheable block - simplest option when you don't need fine-grained placement (§ Automatic vs explicit breakpoints).
- Caches are isolated per workspace on the Claude API, Claude Platform on AWS, and Microsoft Foundry (per organization on Amazon Bedrock and Google Cloud), and never shared across organizations. Traffic for the same prompt split across workspaces writes and reads separate entries - check this before blaming a low hit rate on the prompt.
- Minimum cacheable prefix is model-dependent. Shorter prefixes silently won't cache even with a marker - no error, just `cache_creation_input_tokens: 0`:

| Model | Minimum |
|---|---:|
| Claude Opus 5.5, Claude Opus 5, Claude Fable 5, Claude Mythos 5, Claude Fable 5.1, Claude Mythos 5.1, Claude Sonnet 5.5 and Claude Haiku 5.5 (check the prompt caching docs before relying on their values) | 512 tokens |
| Opus 4.8, Claude Sonnet 5, Sonnet 4.6, Sonnet 4.5, Opus 4.1, Opus 4, Sonnet 4 | 1024 tokens |
| Opus 4.7, Mythos Preview, Haiku 3.5 | 2048 tokens |
| Opus 4.6, Opus 4.5, Haiku 4.5 | 4096 tokens |

**The minimum is not monotonic across generations** - 512 on the newest models, but 4096 on Opus 4.6/4.5 and Haiku 4.5. A 3K-token prompt caches on Claude Opus 5, Opus 4.8, and Sonnet 4.5, and silently won't on Opus 4.6 or Haiku 4.5. Claude Opus 5 halves the Opus 4.8 minimum (1024 -> 512), so prompts previously too short to cache now create entries with no code change.

These minimums apply on **every** platform where the model is available - the old Amazon Bedrock override for Claude Fable 5.1 was removed, and no per-platform exception remains.

**Economics:** Cache reads cost ~0.1× base input price - **0.025× on Claude Fable 5.1** ($0.25/MTok, on Claude Mythos 5.1 too) and 0.05× on Claude Opus 5.5 ($0.20/MTok), which moves every break-even below proportionally. Cache writes cost **1.25× for 5-minute TTL, 2× for 1-hour TTL**. Break-even depends on TTL: with 5-minute TTL, two requests break even (1.25× + 0.1× = 1.35× vs 2× uncached); with 1-hour TTL, you need at least three requests (2× + 0.2× = 2.2× vs 3× uncached). The 1-hour TTL keeps entries alive across gaps in bursty traffic, but the doubled write cost means it needs more reads to pay off.

### Choosing the TTL

A cache read refreshes the entry's timer at no additional cost, on either TTL. The lifetime is measured from the **start** of the request that writes or reads the entry - generation time counts against it, so a 4-minute generation leaves about 1 minute for the next request to start before a 5-minute entry expires. Requests that share a prefix and start less than 5 minutes apart keep the 5-minute cache warm indefinitely - the 1-hour TTL buys nothing there except the doubled write price. Choose by the start-to-start gap between requests that share the prefix:

| Start-to-start gap between requests sharing the prefix | TTL |
|---|---|
| Under 5 minutes (continuous traffic; agent loops whose turns generate well under 5 minutes) | 5-minute - every request refreshes it; strictly cheaper |
| 5-60 minutes (a user who replies after 20 minutes; an agentic side-task or a generation that runs past 5 minutes between reads) | 1-hour - the only window where the 2× write pays off |
| Over an hour | Neither helps directly - re-warm on a schedule (§ Pre-warming the cache) or accept the cold miss |

**Claude Fable 5.1 / Claude Mythos 5.1: a keep-alive is usually cheaper than the 1-hour TTL.** With cache reads at 0.025x on Claude Fable 5.1 and Claude Mythos 5.1 (versus 0.05x on Claude Opus 5.5 and 0.1x elsewhere - see Economics above) a miss is much more expensive *relative to a hit*, and a read is nearly free - so for the 5-60 minute gap, instead of paying the 2x write for the 1-hour TTL, stay on the default 5-minute TTL and, while idle, re-send the previous request with `max_tokens: 0` shortly before the entry would expire. That request refreshes the entry's timer and bills only a cheap cache read (no output tokens). At Claude Fable 5.1 prices this beats the 1-hour TTL unless pauses regularly approach an hour. `max_tokens: 0` follows § Pre-warming's rejected combinations; on these models the ones that can arise are `stream: true`, structured outputs, and Batches (forced `tool_choice` and `thinking.type: "enabled"` are already 400s here). Send the keep-alive with `stream` off - streaming is a transport option, not part of the cached prefix, so dropping it for this one request costs nothing - and where the request can't be reshaped that way, with structured outputs (`output_config.format`) or inside a Message Batches request, use the 1-hour TTL instead. The prompt-caching page (`shared/live-sources.md`) has a cost comparison on a sample workload and an example keep-alive request.

On the Claude API, cache reads also do not count toward input-token rate limits on most models (Haiku 3.5 is the documented exception - see the rate-limits doc), so keeping entries alive across gaps can raise effective throughput as well as cut cost.

---

## Automatic vs explicit breakpoints

Automatic caching is a top-level `cache_control` field on the request, not on any content block. The system places the breakpoint on the last cacheable block and moves it forward as the conversation grows; if the last block isn't an eligible target it silently walks backward to the nearest eligible one, and skips caching if none is found. The automatic breakpoint defaults to the 5-minute TTL (the top-level field accepts `ttl: "1h"`) and consumes one of the 4 breakpoint slots. It composes with explicit markers in the same request, with two documented 400s: all 4 slots already taken by explicit markers, and an explicit marker on the last block whose TTL differs from the top-level field's (an explicit marker there with the same TTL makes automatic caching a no-op).

Automatic is the right default for multi-turn conversations - the multi-turn placement pattern above with no marker bookkeeping. Use explicit breakpoints when:

| Situation | Why automatic is the wrong tool |
|---|---|
| The prompt ends in unique per-request content (retrieved rows, per-request context, the one-off question) | The automatic breakpoint lands after the unique tail, so every request pays the write premium on bytes that are never read back - a pure surcharge. The signature: `cache_creation_input_tokens` on every request while `cache_read_input_tokens` never covers the full shared prefix. Put an explicit marker at the end of the shared portion instead (§ Shared prefix, varying suffix). |
| Sections change at different frequencies (tools never, context daily, conversation per-turn) | Automatic places exactly one breakpoint; multiple stability boundaries need explicit markers. |
| One block should be 1-hour TTL and another 5-minute | Per-block TTL requires explicit markers - and entries with the longer TTL must appear before shorter ones (a 1-hour entry must appear before any 5-minute entries). |
| A single turn appends more than 20 positions (consecutive tool_use runs, and tool_result runs, each collapse to one position) | The lookback can miss the previous entry - § 20-block lookback window. |
| A platform or integration without automatic caching (check `shared/platform-availability.md`) | The top-level field is rejected there - use explicit markers only. |

**The robust combination for agent loops:** one explicit breakpoint on the last block of the static system prefix - the expensive shared part gets a guaranteed read point that survives whatever happens later in `messages` - plus top-level automatic caching for the growing conversation tail (where automatic caching is available - `shared/platform-availability.md`). If § Choosing the TTL puts you on the 1-hour TTL, set `ttl: "1h"` on the explicit marker as well as on the top-level field. Both default to 5 minutes, and a 1-hour automatic entry after a 5-minute marker breaks the ordering rule above: longer TTLs must come first. The reverse, a 1-hour marker with a 5-minute tail, is allowed.

---

## Verifying cache hits

The response `usage` object reports cache activity:

| Field | Meaning |
|---|---|
| `cache_creation_input_tokens` | Tokens written to cache this request (you paid the ~1.25× write premium) |
| `cache_read_input_tokens` | Tokens served from cache this request (you paid ~0.1×) |
| `input_tokens` | Tokens processed at full price (not cached) |

If `cache_read_input_tokens` is zero across repeated requests with identical prefixes, a silent invalidator is at work - diff the rendered prompt bytes between two requests to find it.

**`input_tokens` is the uncached remainder only.** Total prompt size = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`. If your agent ran for hours but `input_tokens` shows 4K, the rest was served from cache - check the sum, not the single field.

Language-specific access: `response.usage.cache_read_input_tokens` (Python/TS/Ruby), `$message->usage->cacheReadInputTokens` (PHP), `resp.Usage.CacheReadInputTokens` (Go/C#), `.usage().cacheReadInputTokens()` (Java).

**Verify after every change, not just at setup.** The costliest caching failure in production is silent: requests keep succeeding, the bill is just higher - no error, nothing announces it. The typical shape is a regression, not a bad first implementation: caching works when written, then a later change to prompt assembly (a new dynamic field in the system prompt, a history-rewriting feature, a tool list that stopped being deterministic) misses on every request and goes unnoticed for months. The `usage` fields are the only ground truth that caching is working. Re-check them whenever prompt-assembly code changes, and prefer a standing check - an integration-test assertion that a second identical request shows `cache_read_input_tokens > 0`, or monitoring on the usage fields - over a one-time look.

**The healthy-loop signature.** Writes bill only the delta past the highest cache hit, so in a steady multi-turn loop each request should read everything accumulated so far and write only what the last turn added:

- `cache_read_input_tokens` - the whole prior prefix; grows turn over turn
- `cache_creation_input_tokens` - roughly the previous assistant output plus the newly appended input; small relative to the conversation
- `input_tokens` - just the tail after the last breakpoint

If `cache_creation_input_tokens` is instead near the full conversation size on every request, either the prefix is being rewritten upstream of the breakpoint, or the write is happening for a reason payload diffing and cache diagnostics can't localize - with thinking enabled on a model that strips prior-turn thinking blocks the invalidation is server-side (§ Invalidation hierarchy), and a single turn that appends more than 20 positions (parallel tool-call runs collapse to one position - § 20-block lookback window) pushes the previous entry out of the lookback so every request rewrites the whole conversation with byte-identical payloads (§ 20-block lookback window). Rule both show-nothing cases out first from the model and the turn shape. Reads can only land on positions where a previous request wrote a breakpoint, so the usage fields say *that* the prefix broke (reads collapse, often to zero) but not where - the payload diff or cache diagnostics below localizes the exact point.

**Finding the invalidator.** Log several consecutive request payloads (the full JSON body) and diff adjacent pairs. In a growing conversation, adjacent payloads legitimately differ at the end (the newly appended turn); what must be byte-identical is the overlap - the previous request's prompt should reappear unchanged as a prefix of the next. Strip `cache_control` markers before diffing: the moving marker always differs between adjacent requests and is not an invalidator (previously-marked blocks are still cache hits). The first remaining divergence inside the overlapping region is the invalidation point. This catches the class of bug code review misses - nondeterministic serialization, a library reordering keys or fields, a value that changes between requests but not within one. On the Claude API, cache diagnostics (beta header `cache-diagnosis-2026-04-07`) does this comparison server-side once you opt in: send the header on **every** request - fingerprints are stored only for requests that carried it, so a one-shot retrofit fails with `previous_message_not_found` - then pass the previous response's `id` as `diagnostics.previous_message_id` and the response's `diagnostics` object names where the two requests diverged (model, system, tools, or message history). No payload logging needed. Availability: `shared/platform-availability.md`.

**Unexplained writes:** `usage.cache_creation` breaks `cache_creation_input_tokens` down by TTL (`ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens`). Server tools such as web search automatically insert a 5-minute cache write after tool results when the request already uses caching - writes at a position you didn't mark; expected behavior, not an invalidator.

---

## Invalidation hierarchy

Not every parameter change invalidates everything. The API has three cache tiers, and changes only invalidate their own tier and below:

| Change | Tools cache | System cache | Messages cache |
|---|:---:|:---:|:---:|
| Tool definitions (add/remove/reorder) | No | No | No |
| Model switch | No | No | No |
| `speed`, web-search, citations toggle | Yes | No | No |
| System prompt content | Yes | No | No |
| `tool_choice`, images | Yes | Yes | No |
| `thinking` or `effort` change | model-specific | model-specific | No |
| Message content | Yes | Yes | No |

Implication: you can change `tool_choice` per-request without losing the tools+system cache, and message-content changes never touch it. Thinking and `effort` changes always invalidate the messages cache, and on models that render the thinking configuration ahead of tools and system they invalidate those caches too - pin thinking and effort settings per route rather than varying them per request. Only tool-definition and model changes force a full rebuild on every model.

**Three of these rows have a cache-preserving escape hatch** - the tools row, the system-prompt row, and (on Claude Fable 5.1 / Claude Mythos 5.1 / Claude Opus 5.5 / Claude Opus 5) the `effort` row - each by moving the change out of the top-level request and into a system message inside `messages[]`, after the cached prefix. The inject-then-delete reminder pattern has its own hatch: a text block appended after the `tool_result` blocks in the user message, never deleted. **Availability differs per row** - they are not gated together:

| Top-level change that invalidates | Cache-preserving form | Available on |
|---|---|---|
| Tool definitions (add/remove) | `tool_addition` / `tool_removal` blocks - see `shared/tool-use-concepts.md` § Mid-conversation tool changes | Claude Opus 5, Claude Opus 5.5, Claude Opus 4.8, Claude Fable 5, Claude Fable 5.1, Claude Mythos 5, Claude Mythos 5.1, Claude Sonnet 5.5 (not Claude Sonnet 5), behind `mid-conversation-tool-changes-2026-07-01` |
| System prompt content | A `{"role": "system", "content": "..."}` message - see § Mid-conversation system messages above | Claude Opus 5, Claude Opus 5.5, Claude Opus 4.8, Claude Fable 5, Claude Fable 5.1, Claude Mythos 5, Claude Mythos 5.1 - **already available today** (Claude Sonnet 5.5 at launch), no beta header |
| Per-turn reminder (inject, then delete next request) | A turn-scoped `clear_at: "next_user_message"` system message, left in the transcript - see § Mid-conversation system messages above (without the beta: a text block after the `tool_result` blocks, earlier copies kept) | Same models as mid-conversation system messages, behind `mid-conversation-system-clear-at-2026-08-21` |
| `effort` change | A `{"role": "system", "content": [], "output_config": {"effort": ...}}` message - see `shared/model-migration.md` -> Migrating to Claude Fable 5.1 from Claude Fable 5 | Claude Fable 5.1, Claude Mythos 5.1, Claude Opus 5.5, Claude Opus 5, Claude Sonnet 5.5 and Claude Haiku 5.5 (thinking on only), behind `mid-conversation-output-config-2026-07-01` |
| Dropped thinking blocks (a Claude Fable 5.1 / Claude Mythos 5.1 / Claude Opus 5.5 / Claude Sonnet 5.5 block replayed to a model that can't read it - only Claude Fable 5.1 / Claude Mythos 5.1 on the Claude API read Claude Opus 5.5's, and no other model reads Claude Sonnet 5.5's - or a history-editing-check `drop_block`) | None - the API drops the block on that request and the messages cache changes from its position onward; tools and system caches are intact. Blocks the receiving model can read, passed back unchanged, keep the cache intact | - |

Model switch has no escape hatch: caches are model-scoped. Keep the main loop on one model and spawn a subagent for cheaper sub-tasks (see `agent-design.md` § Caching for Agents).

**Thinking blocks and the messages cache (model-specific).** On Claude Fable 5, Claude Fable 5.1, Claude Mythos 5, Claude Mythos 5.1, Mythos Preview, Opus 4.5 and later (Claude Opus 5.5 included), Sonnet 4.6 and later, and Claude Haiku 5.5, previous-turn thinking blocks are preserved by default, so passing a regular (non-tool-result) user message with thinking enabled leaves the messages cache valid. On earlier Opus and Sonnet models and Haiku models through Haiku 4.5, that same request strips previously-cached thinking blocks from context, and every message after the first stripped block falls out of cache - in an agent loop this shows up as a `cache_creation_input_tokens` spike on turns where a plain user message follows tool use. (Toggling thinking on/off between requests is a separate, all-models invalidator of the messages cache - see the hierarchy table above. Changing `output_config.effort` behaves the same as changing thinking parameters; setting the model's default effort explicitly is equivalent to omitting it, so pinning the default costs nothing.)

---

## 20-block lookback window

Each breakpoint walks backward **at most 20 positions** to find a prior cache entry. On the Claude API a run of consecutive `tool_use` blocks counts as one position, and so does a run of consecutive `tool_result` blocks, so a turn with many *parallel* tool calls doesn't push the previous request's entry out of the window; a turn that adds more than 20 positions of other content (long sequential tool loops, many text/image blocks) still can - the next request's breakpoint won't find the previous cache and silently misses.

Fix: place an intermediate breakpoint every ~15 positions in long turns, or put the marker on a block that's within 20 positions of the previous turn's last cached block.

---

## Concurrent-request timing

A cache entry becomes readable only after the first response **begins streaming**. N parallel requests with identical prefixes all pay full price - none can read what the others are still writing.

For fan-out patterns: send 1 request, await the first streamed token (not the full response), then fire the remaining N-1. They'll read the cache the first one just wrote.

The same arithmetic shapes multi-agent designs: N parallel workers each assembling a slightly different prompt over the same context write N separate cache entries and read none of each other's. When input cost dominates, fewer lanes over a byte-identical shared prefix - or one worker making N sequential passes - turn those writes into reads.

## Pre-warming the cache

To eliminate the cache-miss latency on the *first* real request, send a **`max_tokens: 0`** request at startup (or on an interval). The API runs prefill - writing the cache at your `cache_control` breakpoint - and returns immediately with `content: []`, `stop_reason: "max_tokens"`, and a populated `usage` block (zero output tokens billed; normal cache-write charge on `cache_creation_input_tokens`).

**When to pre-warm** - pre-warming trades a cache-write charge *now* for lower TTFT on the *next* real request. It's worth it when all three hold: (a) first-request latency is user-visible (chat/voice/interactive - not background jobs), (b) the shared prefix is large enough that a cold write is noticeably slow, and (c) there's a moment *before* traffic to fire it - app startup, worker boot, post-deploy, start of a scheduled window.

| Skip pre-warming when... | Because |
|---|---|
| Traffic is continuous (requests <= TTL apart) | The first real request warms the cache and every subsequent one hits it; a separate warm call is a pure extra write |
| The prefix is small or below the cacheable minimum | The cold-write penalty is negligible |
| The prefix varies per request/user | Nothing shared to pre-warm |
| You'd pre-warm many distinct prefixes speculatively | Each is a ~1.25× write; cost can exceed the latency you save |

**Scheduled re-warms:** only needed when traffic has gaps longer than the TTL. If real requests arrive more often than every 5 minutes, they keep the cache warm on their own - don't add an interval re-warm. For bursty traffic with long idle gaps, either re-warm just under the TTL or switch to `ttl: "1h"` and re-warm less often.

```python
client.messages.create(
    model="claude-opus-5-5",
    max_tokens=0,
    # Example values - send the same thinking and effort settings as your real traffic (see below)
    thinking={"type": "adaptive"},
    output_config={"effort": "high"},
    system=[{
        "type": "text",
        "text": SYSTEM_PROMPT,
        "cache_control": {"type": "ephemeral"},
    }],
    messages=[{"role": "user", "content": "warmup"}],
)
```

**Breakpoint placement:** put `cache_control` on the **last block shared with the real request** (the system prompt or tool definitions) - **not** on the placeholder user message, and **not** via top-level automatic caching (which would key the cache to the placeholder). The placeholder can be any non-whitespace string; it's read during prefill but never answered.

**Match the real traffic's thinking and effort settings.** Both are rendered into the prompt (see § Invalidation hierarchy), so a pre-warm with different settings can write a cache entry your real traffic never hits. For adaptive-thinking traffic, send the same `thinking` and `effort` values in the pre-warm. Traffic that uses extended thinking (`thinking.type: "enabled"`, accepted only on Claude 4.6 and earlier models and on Claude Mythos Preview) can't be matched, because `max_tokens: 0` rejects that setting (see Rejected combinations below). Whether a pre-warm still helps that traffic depends on where the model renders the thinking configuration, which the docs don't state per model - check `cache_read_input_tokens` on the first real request.

**Rejected combinations:** `max_tokens: 0` is an `invalid_request_error` with `stream: true`, `thinking.type: "enabled"`, `output_config.format`, `tool_choice` of `{"type":"tool"}` or `{"type":"any"}`, or inside a Message Batches request.

**TTL still applies** - re-warm at least every 5 minutes for the default cache, or use the 1-hour TTL. This replaces the older `max_tokens: 1` workaround (no single-token reply to discard, no output tokens billed, intent is unambiguous).
