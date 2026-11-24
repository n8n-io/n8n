# Streaming - TypeScript

## Quick Start

```typescript
const stream = client.messages.stream({
  model: "claude-opus-5-5",
  max_tokens: 64000,
  messages: [{ role: "user", content: "Write a story" }],
});

for await (const event of stream) {
  if (
    event.type === "content_block_delta" &&
    event.delta.type === "text_delta"
  ) {
    process.stdout.write(event.delta.text);
  }
}
```

---

## Handling Different Content Types

> **Fable 5 / Claude Opus 5.5 / Claude Opus 5 / Opus 4.8 / Opus 4.7 / Opus 4.6:** Use `thinking: {type: "adaptive"}`. On Claude Opus 5.5 and Claude Opus 5 adaptive is also what you get by omitting `thinking` entirely (Claude Opus 5.5 accepts no other setting - `disabled` and `budget_tokens` both 400). On older models, use `thinking: {type: "enabled", budget_tokens: N}` instead.

```typescript
const stream = client.messages.stream({
  model: "claude-opus-5-5",
  max_tokens: 64000,
  thinking: { type: "adaptive", display: "summarized" }, // display opt-in: default is omitted (empty thinking text) on Fable 5/5.1, Mythos 5/5.1, Claude Opus 5.5, Claude Opus 5, Opus 4.8/4.7, Claude Sonnet 5.5, and Claude Sonnet 5
  messages: [{ role: "user", content: "Analyze this problem" }],
});

for await (const event of stream) {
  switch (event.type) {
    case "content_block_start":
      switch (event.content_block.type) {
        case "thinking":
          console.log("\n[Thinking...]");
          break;
        case "text":
          console.log("\n[Response:]");
          break;
      }
      break;
    case "content_block_delta":
      switch (event.delta.type) {
        case "thinking_delta":
          process.stdout.write(event.delta.thinking);
          break;
        case "text_delta":
          process.stdout.write(event.delta.text);
          break;
      }
      break;
  }
}
```

---

## Streaming with Tool Use (Tool Runner)

Use the tool runner with `stream: true`. The outer loop iterates over tool runner iterations (messages), the inner loop processes stream events. `betaZodTool()` has no option for `eager_input_streaming`, so spread it onto the returned tool - without it the API buffers each tool-input parameter and `input_json_delta` arrives in one burst at the end (default rule: `shared/tool-use-concepts.md` -> Eager input streaming):

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const client = new Anthropic();

const getWeather = {
  ...betaZodTool({
    name: "get_weather",
    description: "Get current weather for a location",
    inputSchema: z.object({
      location: z.string().describe("City and state, e.g., San Francisco, CA"),
    }),
    run: async ({ location }) => `72°F and sunny in ${location}`,
  }),
  eager_input_streaming: true, // stream tool input as it is generated
};

let runner = client.beta.messages.toolRunner({
  model: "claude-opus-5-5",
  max_tokens: 64000,
  tools: [getWeather],
  messages: [
    { role: "user", content: "What's the weather in Paris and London?" },
  ],
  stream: true,
});

// With eager input streaming the SDK parses each tool input when its block
// closes. The runner validates it against the Zod schema and never calls
// run() on input that fails; JSON it cannot parse at all rejects the
// iteration. Re-issue only for that case - API errors are rethrown - with a
// cap on consecutive failures. A consumed runner cannot be iterated again,
// so the retry builds a new one from runner.params, which holds the
// conversation so far (the failed turn was never appended), so completed
// tool calls are not re-run.
//
// The runner does not apply the stop-reason rules for you: check
// stop_reason after each turn before the runner runs that turn's tools.
class TruncatedToolInput extends Error {}

for (let attempt = 0; ; attempt++) {
  try {
    // Outer loop: each tool runner iteration
    for await (const messageStream of runner) {
      // Inner loop: stream events for this iteration
      for await (const event of messageStream) {
        switch (event.type) {
          case "content_block_delta":
            switch (event.delta.type) {
              case "text_delta":
                process.stdout.write(event.delta.text);
                break;
              case "input_json_delta":
                // Tool input fragment - arrives immediately with eager streaming
                process.stdout.write(event.delta.partial_json);
                break;
            }
            break;
        }
      }
      const message = await messageStream.finalMessage();
      attempt = 0; // the turn completed; the cap is on consecutive failures
      // A truncated tool input can still pass schema validation, so stop
      // before the runner executes it; a refusal can cut a tool_use off
      // mid-input, so never run that turn's tools. pause_turn is not
      // auto-resumed by the runner: see tool-use.md -> Server tools.
      const hasToolUse = message.content.some((b) => b.type === "tool_use");
      if (message.stop_reason === "max_tokens" && hasToolUse) {
        throw new TruncatedToolInput("tool input truncated; retry with a higher max_tokens");
      }
      if (message.stop_reason === "refusal") break;
      // max_tokens on a plain text answer just ends the loop with the
      // truncated text; the runner returns it as the final message.
    }
    break;
  } catch (err) {
    if (err instanceof Anthropic.APIError || err instanceof TruncatedToolInput || attempt >= 2) {
      throw err;
    }
    console.error("tool input was not parseable JSON, re-issuing the turn");
    runner = client.beta.messages.toolRunner({ ...runner.params });
  }
}
```

With `betaZodTool` the runner validates each tool input against the Zod schema before calling `run` (a `betaTool()` JSON-Schema tool is not validated at runtime - validate inside `run`), which catches malformed input (missing or mistyped fields) the tolerant parser let through; JSON it cannot parse at all rejects the `for await` loop, so wrap it, rethrow API errors, and re-issue with a new runner built from `runner.params` and a cap on consecutive failures - the `tool_use` block never completed, so there is no `tool_use_id` to answer with an `is_error` result. The stop-reason rules are yours to apply, not the runner's: check each turn's `stop_reason` after `finalMessage()` - stop on `max_tokens` when the turn carries a `tool_use` (a truncated input can pass schema validation; a truncated text answer is just returned), stop on `refusal`, and resume `pause_turn` yourself (the runner does not; see `tool-use.md` -> Server tools with the tool runner and `shared/tool-use-concepts.md` -> Eager input streaming).

---

## Getting the Final Message

```typescript
const stream = client.messages.stream({
  model: "claude-opus-5-5",
  max_tokens: 64000,
  messages: [{ role: "user", content: "Hello" }],
});

for await (const event of stream) {
  // Process events...
}

const finalMessage = await stream.finalMessage();
console.log(`Tokens used: ${finalMessage.usage.output_tokens}`);
```

---

## Stream Event Types

| Event Type            | Description                 | When it fires                     |
| --------------------- | --------------------------- | --------------------------------- |
| `message_start`       | Contains message metadata   | Once at the beginning             |
| `content_block_start` | New content block beginning | When a text/tool_use block starts |
| `content_block_delta` | Incremental content update  | For each token/chunk              |
| `content_block_stop`  | Content block complete      | When a block finishes             |
| `message_delta`       | Message-level updates       | Contains `stop_reason`, usage     |
| `message_stop`        | Message complete            | Once at the end                   |

## Best Practices

1. **Always flush output** - Use `process.stdout.write()` for immediate display
2. **Handle partial responses** - If the stream is interrupted, you may have incomplete content
3. **Track token usage** - The `message_delta` event contains usage information
4. **Use `finalMessage()`** - Get the complete `Anthropic.Message` object even when streaming. Don't wrap `.on()` events in `new Promise()` - `finalMessage()` handles all completion/error/abort states internally
5. **Buffer for web UIs** - Consider buffering a few tokens before rendering to avoid excessive DOM updates
6. **Use `stream.on("text", ...)` for deltas** - The `text` event provides just the delta string, simpler than manually filtering `content_block_delta` events
7. **For agentic loops with streaming** - See the [Streaming Manual Loop](./tool-use.md#streaming-manual-loop) section in tool-use.md for combining `stream()` + `finalMessage()` with a tool-use loop

## Raw SSE Format

If using raw HTTP (not SDKs), the stream returns Server-Sent Events:

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_...","type":"message",...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":12}}

event: message_stop
data: {"type":"message_stop"}
```
