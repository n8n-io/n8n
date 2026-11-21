# Streaming - Python

## Quick Start

```python
with client.messages.stream(
    model="claude-opus-5-5",
    max_tokens=64000,
    messages=[{"role": "user", "content": "Write a story"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

### Async

```python
async with async_client.messages.stream(
    model="claude-opus-5-5",
    max_tokens=64000,
    messages=[{"role": "user", "content": "Write a story"}]
) as stream:
    async for text in stream.text_stream:
        print(text, end="", flush=True)
```

### Low-level: `stream=True`

`messages.stream()` (above) is the recommended helper - it accumulates state and exposes `text_stream` / `get_final_message()`. If you only need the raw event iterator and want lower memory use, pass `stream=True` to `messages.create()` instead:

```python
for event in client.messages.create(
    model="claude-opus-5-5",
    max_tokens=64000,
    messages=[{"role": "user", "content": "Write a story"}],
    stream=True,
):
    print(event.type)
```

No final-message accumulation is done for you in this form.

---

## Handling Different Content Types

Claude may return text, thinking blocks, or tool use. Handle each appropriately:

> **Fable 5 / Claude Opus 5.5 / Claude Opus 5 / Opus 4.8 / Opus 4.7 / Opus 4.6:** Use `thinking: {type: "adaptive"}`. On Claude Opus 5.5 and Claude Opus 5 adaptive is also what you get by omitting `thinking` entirely (Claude Opus 5.5 accepts no other setting - `disabled` and `budget_tokens` both 400). On older models, use `thinking: {type: "enabled", budget_tokens: N}` instead.

```python
with client.messages.stream(
    model="claude-opus-5-5",
    max_tokens=64000,
    thinking={"type": "adaptive", "display": "summarized"},  # display opt-in: default is omitted (empty thinking text) on Fable 5/5.1, Mythos 5/5.1, Claude Opus 5.5, Claude Opus 5, Opus 4.8/4.7, Claude Sonnet 5.5, and Claude Sonnet 5
    messages=[{"role": "user", "content": "Analyze this problem"}]
) as stream:
    for event in stream:
        if event.type == "content_block_start":
            if event.content_block.type == "thinking":
                print("\n[Thinking...]")
            elif event.content_block.type == "text":
                print("\n[Response:]")

        elif event.type == "content_block_delta":
            if event.delta.type == "thinking_delta":
                print(event.delta.thinking, end="", flush=True)
            elif event.delta.type == "text_delta":
                print(event.delta.text, end="", flush=True)
```

---

## Streaming with Tool Use

The Python tool runner supports streaming: pass `stream=True` to `client.beta.messages.tool_runner(...)` and each iteration yields a stream you consume event-by-event, with `get_final_message()` for the accumulated message per turn (see `shared/tool-use-concepts.md` -> Tool Runner vs Manual Loop). Declare tool-runner tools with `@beta_tool(eager_input_streaming=True)` so their inputs stream as they are generated (default rule: `shared/tool-use-concepts.md` -> Eager input streaming). The runner never calls your function on unparseable input; the `ValueError` surfaces while you iterate the per-turn stream, so wrap the `for ... in runner` loop and, on failure, restart a new runner from a history you mirror while iterating, in this order for each yielded stream: take `message = stream.get_final_message()`, append it (the assistant turn), then check its `stop_reason` - on `max_tokens` with a `tool_use` present or on `refusal`, stop right there and never call `generate_tool_call_response()` for that turn (it executes the tools) - and only for a turn that continues append `runner.generate_tool_call_response()` (the matching `tool_result` user turn), exactly as `tool-use.md` does to resume `pause_turn`. The Python runner exposes no `params` read, a consumed runner cannot be iterated again, and a history missing the tool-result half of a continued turn is rejected by the API. `pause_turn` you resume yourself; a truncated text answer is simply the final message.

Use the manual-loop pattern below only when you're not using the tool runner and need per-token streaming with tools. Set `eager_input_streaming: True` on each user-defined tool. With eager streaming the server no longer validates the input: the Python SDK's tolerant parser returns a partial object for a truncated input (check `stop_reason == "max_tokens"`) and can return a silently truncated one for malformed JSON (validate the parsed input before running the tool); only JSON it cannot parse at all raises `ValueError` **from the stream iterator**, so that guard wraps the stream, not the final-message read. Schema validation is not path validation: the model-supplied `path` is untrusted output, so confine it to a project root before writing (`shared/tool-use-concepts.md` -> the text-editor security note):

```python
import json
from pathlib import Path

ROOT = Path.cwd().resolve()

tools = [
    {
        "name": "write_file",
        "description": "Write text to a file at the given path",
        "eager_input_streaming": True,  # stream large inputs as generated
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "contents": {"type": "string"},
            },
            "required": ["path", "contents"],
        },
    }
]

messages = [{"role": "user", "content": task}]
json_retries = 0

while True:
    try:
        with client.messages.stream(
            model="claude-opus-5-5",
            max_tokens=64000,
            tools=tools,
            messages=messages,
        ) as stream:
            for event in stream:
                if event.type == "text":
                    print(event.text, end="", flush=True)
                elif event.type == "input_json":
                    # Tool input fragment - arrives immediately with eager streaming
                    print(event.partial_json, end="", flush=True)
            response = stream.get_final_message()
        json_retries = 0  # the cap is on consecutive failures of one turn
    except ValueError:
        # JSON the SDK could not parse at all. It raised before the tool_use
        # block completed, so there is no tool_use_id to answer; re-issue the
        # turn (bounded). API errors are not ValueError and propagate.
        json_retries += 1
        if json_retries > 2:
            raise
        continue

    # Server-side tool hit its iteration limit: append the turn and re-send
    if response.stop_reason == "pause_turn":
        messages.append({"role": "assistant", "content": response.content})
        continue

    tool_uses = [b for b in response.content if b.type == "tool_use"]
    if response.stop_reason == "refusal" or not tool_uses:
        # end_turn, a text-only answer, or a refusal (which can cut a
        # tool_use off mid-input): nothing to run
        break
    if response.stop_reason == "max_tokens":
        # A truncated tool input parses as a valid partial object; don't run it.
        raise RuntimeError("tool input truncated; retry with a higher max_tokens")

    # The SDK's tolerant parser can return a silently truncated or mistyped
    # input (for example at an unescaped inner quote), so validate first.
    tool_results = []
    for block in tool_uses:
        args = block.input
        if not (isinstance(args, dict) and isinstance(args.get("path"), str)
                and isinstance(args.get("contents"), str)):
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "is_error": True,
                                 "content": json.dumps({"INVALID_JSON": json.dumps(args)})})
            continue
        # `path` is untrusted model output: resolve it and reject anything that
        # escapes the project root (`..`, absolute paths, symlinks) before the
        # write - schema validation alone does not check this.
        target = (ROOT / args["path"]).resolve()
        if not target.is_relative_to(ROOT):
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "is_error": True,
                                 "content": "path escapes the project root"})
            continue
        tool_results.append({"type": "tool_result", "tool_use_id": block.id,
                             "content": run_tool(block.name, {**args, "path": str(target)})})
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": tool_results})
```

---

## Getting the Final Message

```python
with client.messages.stream(
    model="claude-opus-5-5",
    max_tokens=64000,
    messages=[{"role": "user", "content": "Hello"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

    # Get full message after streaming
    final_message = stream.get_final_message()
    print(f"\n\nTokens used: {final_message.usage.output_tokens}")
```

---

## Streaming with Progress Updates

```python
def stream_with_progress(client, **kwargs):
    """Stream a response with progress updates."""
    total_tokens = 0
    content_parts = []

    with client.messages.stream(**kwargs) as stream:
        for event in stream:
            if event.type == "content_block_delta":
                if event.delta.type == "text_delta":
                    text = event.delta.text
                    content_parts.append(text)
                    print(text, end="", flush=True)

            elif event.type == "message_delta":
                if event.usage and event.usage.output_tokens is not None:
                    total_tokens = event.usage.output_tokens

        final_message = stream.get_final_message()

    print(f"\n\n[Tokens used: {total_tokens}]")
    return "".join(content_parts)
```

---

## Error Handling in Streams

```python
try:
    with client.messages.stream(
        model="claude-opus-5-5",
        max_tokens=64000,
        messages=[{"role": "user", "content": "Write a story"}]
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
except anthropic.APIConnectionError:
    print("\nConnection lost. Please retry.")
except anthropic.RateLimitError:
    print("\nRate limited. Please wait and retry.")
except anthropic.APIStatusError as e:
    print(f"\nAPI error: {e.status_code}")
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

1. **Always flush output** - Use `flush=True` to show tokens immediately
2. **Handle partial responses** - If the stream is interrupted, you may have incomplete content
3. **Track token usage** - The `message_delta` event contains usage information
4. **Use timeouts** - Set appropriate timeouts for your application
5. **Default to streaming** - Use `.get_final_message()` to get the complete response even when streaming, giving you timeout protection without needing to handle individual events
6. **Large `max_tokens` without streaming raises `ValueError`** - The SDK refuses non-streaming requests it estimates will exceed ~10 minutes (idle connections drop). Pass `stream=True` / use `messages.stream()`, or explicitly override `timeout`, to suppress the guard.
