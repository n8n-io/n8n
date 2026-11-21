# Claude API - Ruby

> **Note:** The Ruby SDK supports the Claude API. A tool runner is available in beta via `client.beta.messages.tool_runner()`. Agent SDK is not yet available for Ruby.

## Installation

```bash
gem install anthropic
```

## Client Initialization

```ruby
require "anthropic"

# Default (uses ANTHROPIC_API_KEY env var)
client = Anthropic::Client.new

# Explicit API key
client = Anthropic::Client.new(api_key: "your-api-key")
```

---

## Basic Message Request

```ruby
message = client.messages.create(
  model: :"claude-opus-5-5",
  max_tokens: 16000,
  messages: [
    { role: "user", content: "What is the capital of France?" }
  ]
)
# content is an array of polymorphic block objects (TextBlock, ThinkingBlock,
# ToolUseBlock, ...). .type is a Symbol - compare with :text, not "text".
# .text raises NoMethodError on non-TextBlock entries.
message.content.each do |block|
  puts block.text if block.type == :text
end
```

---

## Extended Thinking

> **Fable 5, Claude Opus 5.5, Claude Opus 5, Opus 4.8, Opus 4.7, Opus 4.6, and Sonnet 4.6:** Use adaptive thinking. `budget_tokens` is removed on Fable 5, Claude Opus 5.5, Claude Opus 5, Opus 4.8, and 4.7 (400 if sent); deprecated on Opus 4.6 and Sonnet 4.6.
> **Claude Opus 5.5:** thinking is always on - omit `thinking` (or send `{ type: "adaptive" }`, which is equivalent); `{ type: "disabled" }` returns a 400 at every effort, as does a thinking budget. Control depth with `output_config.effort` instead - the default is `medium` on this model, where Claude Opus 5 defaults to `high`.
> **Claude Opus 5:** thinking is on by default - omitting `thinking:` runs adaptive (`{ type: "adaptive" }` is equivalent), unlike Opus 4.8/4.7 where omitting it meant no thinking. `{ type: "disabled" }` is accepted only at effort `high` or lower; pairing it with `xhigh`/`max` returns a 400.
> **Older models:** Use `thinking: { type: "enabled", budget_tokens: N }` (must be < `max_tokens`, min 1024).

```ruby
message = client.messages.create(
  model: :"claude-opus-5-5",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  messages: [{ role: "user", content: "Solve: 27 * 453" }]
)

message.content.each do |block|
  case block.type
  when :thinking then puts "Thinking: #{block.thinking}"
  when :text then puts "Response: #{block.text}"
  end
end
```

---

## Prompt Caching

`system_:` (trailing underscore - avoids shadowing `Kernel#system`) takes an array of text blocks; set `cache_control` on the last block. Plain hashes work via the `OrHash` type alias. For placement patterns and the silent-invalidator audit checklist, see `shared/prompt-caching.md`.

```ruby
message = client.messages.create(
  model: :"claude-opus-5-5",
  max_tokens: 16000,
  system_: [
    { type: "text", text: long_system_prompt, cache_control: { type: "ephemeral" } }
  ],
  messages: [{ role: "user", content: "Summarize the key points" }]
)
```

For 1-hour TTL: `cache_control: { type: "ephemeral", ttl: "1h" }`. There's also a top-level `cache_control:` on `messages.create` that auto-places on the last cacheable block.

Verify hits via `message.usage.cache_creation_input_tokens` / `message.usage.cache_read_input_tokens`.

---

## Stop Details

When `stop_reason` is `:refusal`, the response includes structured `stop_details`:

```ruby
if message.stop_reason == :refusal && message.stop_details
  puts "Category: #{message.stop_details.category}"     # e.g. :cyber, :bio, :reasoning_extraction, :frontier_llm, or nil - see docs for the full set
  puts "Explanation: #{message.stop_details.explanation}"
end
```

**Refusal fallbacks (Claude Fable 5.1) - opt in by default.** Fallbacks are opt-in: without them a refused request simply stops. New `claude-fable-5-1` code should include the server-side `fallbacks` parameter (beta header `server-side-fallback-2026-06-01`, `fallbacks: [{model: "claude-opus-4-8"}]` on the beta messages call) by default. The exact Ruby binding (and the client-side middleware for providers without server-side support) is not documented here - WebFetch the Ruby SDK repo's `examples/` from `shared/live-sources.md`; full semantics in `shared/model-migration.md` -> Migrating to Claude Fable 5.1 -> `refusal` stop reason.

---

## Beta Features

`betas:` is only valid on `client.beta.messages.create`, not the non-beta path.

### Task budgets

```ruby
response = client.beta.messages.create(
  model: :"claude-opus-5-5",
  max_tokens: 16000,
  output_config: { task_budget: { type: :tokens, total: 64_000 } },
  tools: [...],
  messages: [...],
  betas: ["task-budgets-2026-03-13"]
)
```

---

## Error Type

`APIStatusError` exposes a `.type` field for programmatic error classification:

```ruby
begin
  client.messages.create(...)
rescue Anthropic::Errors::APIStatusError => e
  puts e.type  # :rate_limit_error, :overloaded_error, etc.
end
```
