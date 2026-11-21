# Claude API - Python

## Installation

```bash
pip install anthropic
```

## Client Initialization

```python
import anthropic

# Default - resolves credentials from the environment:
# ANTHROPIC_API_KEY, or ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile.
# Prefer this for local dev; don't hardcode a key.
client = anthropic.Anthropic()

# Explicit API key (only when you must inject a specific key)
client = anthropic.Anthropic(api_key="your-api-key")

# Async client
async_client = anthropic.AsyncAnthropic()
```

---

## Client Configuration

### Per-request overrides

Use `with_options()` to override client settings for a single call without mutating the client:

```python
client.with_options(timeout=5.0, max_retries=5).messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
```

### Timeouts

Default request timeout is 10 minutes. Pass a float (seconds) or an `anthropic.Timeout` for granular control. On timeout the SDK raises `anthropic.APITimeoutError` (and retries per `max_retries`).

```python
client = anthropic.Anthropic(timeout=20.0)
client = anthropic.Anthropic(
    timeout=anthropic.Timeout(60.0, read=5.0, write=10.0, connect=2.0),
)
```

`anthropic` 1.x is built on [`httpx2`](https://pypi.org/project/httpx2/), not `httpx`. `anthropic.Timeout` is `httpx2.Timeout`; if you import the HTTP library yourself, write `import httpx2 as httpx` - an object from the `httpx` package (`httpx.Timeout`, `httpx.Client`, transports, limits) is rejected or fails at request time. Existing `httpx`-era code is covered by the [v1 migration guide](https://github.com/anthropics/anthropic-sdk-python/blob/main/MIGRATION.md) and `/claude-api upgrade python`.

### Retries

The SDK auto-retries connection errors, 408, 409, 429, and >=500 with exponential backoff (default 2 retries). Set `max_retries` on the client or via `with_options()`; `max_retries=0` disables.

### Async performance (aiohttp backend)

For high-concurrency async workloads, install `anthropic[aiohttp]` and pass `DefaultAioHttpClient` instead of the default httpx2 backend:

```python
from anthropic import AsyncAnthropic, DefaultAioHttpClient

async with AsyncAnthropic(http_client=DefaultAioHttpClient()) as client:
    ...
```

### Custom HTTP client (proxy, base URL)

Use `DefaultHttpxClient` / `DefaultAsyncHttpxClient` - not a raw `httpx2.Client` (and never a client from the `httpx` package) - so the SDK's default timeouts and connection limits are preserved:

```python
from anthropic import Anthropic, DefaultHttpxClient

client = Anthropic(
    base_url="http://my.test.server.example.com:8083",  # or ANTHROPIC_BASE_URL env var
    http_client=DefaultHttpxClient(proxy="http://my.test.proxy.example.com"),
)
```

### Logging

Set `ANTHROPIC_LOG=debug` (or `info`) to enable SDK logging via the standard `logging` module.

---

## Basic Message Request

```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    messages=[
        {"role": "user", "content": "What is the capital of France?"}
    ]
)
# response.content is a list of content block objects (TextBlock, ThinkingBlock,
# ToolUseBlock, ...). Check .type before accessing .text.
for block in response.content:
    if block.type == "text":
        print(block.text)
```

---

## System Prompts

```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    system="You are a helpful coding assistant. Always provide examples in Python.",
    messages=[{"role": "user", "content": "How do I read a JSON file?"}]
)
```

### Mid-conversation system messages (model-gated)

For operator instructions that arrive mid-conversation (mode switches, injected state), append `{"role": "system", ...}` to `messages` instead of editing top-level `system` - this preserves the cached prefix and carries operator authority. Must follow a user message (or an `assistant` message ending in server-tool use), and must be either the last entry in `messages` or be followed by an `assistant` turn; cannot be `messages[0]`. Unsupported models return a 400 (`role 'system' is not supported on this model`). See `shared/prompt-caching.md` for when to use this vs. top-level `system`.

```python
response = client.messages.create(
    model=MODEL_ID,  # must support mid-conversation system messages
    max_tokens=16000,
    system=[{"type": "text", "text": STABLE_SYSTEM, "cache_control": {"type": "ephemeral"}}],
    messages=history + [
        {"role": "user", "content": user_message},
        {"role": "system", "content": "Terse mode enabled - keep responses under 40 words."},
    ],
)  # No beta header needed - use regular client.messages.create
```

---

## Vision (Images)

### Base64

```python
import base64

with open("image.png", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": image_data
                }
            },
            {"type": "text", "text": "What's in this image?"}
        ]
    }]
)
```

### URL

```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "url",
                    "url": "https://example.com/image.png"
                }
            },
            {"type": "text", "text": "Describe this image"}
        ]
    }]
)
```

---

## Prompt Caching

Cache large context to reduce costs (up to 90% savings). **Caching is a prefix match** - any byte change anywhere in the prefix invalidates everything after it. For placement patterns, architectural guidance (frozen system prompt, deterministic tool order, where to put volatile content), and the silent-invalidator audit checklist, read `shared/prompt-caching.md`.

### Automatic Caching (Recommended)

Use top-level `cache_control` to automatically cache the last cacheable block in the request - no need to annotate individual content blocks:

```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    cache_control={"type": "ephemeral"},  # auto-caches the last cacheable block
    system="You are an expert on this large document...",
    messages=[{"role": "user", "content": "Summarize the key points"}]
)
```

### Manual Cache Control

For fine-grained control, add `cache_control` to specific content blocks:

```python
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    system=[{
        "type": "text",
        "text": "You are an expert on this large document...",
        "cache_control": {"type": "ephemeral"}  # default TTL is 5 minutes
    }],
    messages=[{"role": "user", "content": "Summarize the key points"}]
)

# With explicit TTL (time-to-live)
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    system=[{
        "type": "text",
        "text": "You are an expert on this large document...",
        "cache_control": {"type": "ephemeral", "ttl": "1h"}  # 1 hour TTL
    }],
    messages=[{"role": "user", "content": "Summarize the key points"}]
)
```

### Verifying Cache Hits

```python
print(response.usage.cache_creation_input_tokens)  # tokens written to cache (~1.25x cost)
print(response.usage.cache_read_input_tokens)      # tokens served from cache (~0.1x cost)
print(response.usage.input_tokens)                 # uncached tokens (full cost)
```

If `cache_read_input_tokens` is zero across repeated identical-prefix requests, a silent invalidator is at work - `datetime.now()` or a UUID in the system prompt, unsorted `json.dumps()`, or a varying tool set. See `shared/prompt-caching.md` for the full audit table.

---

## Extended Thinking

> **Fable 5, Claude Opus 5.5, Claude Opus 5, Opus 4.8, Opus 4.7, Opus 4.6, and Sonnet 4.6:** Use adaptive thinking. `budget_tokens` is removed on Fable 5, Claude Opus 5.5, Claude Opus 5, Opus 4.8, and 4.7 (400 if sent); deprecated on Opus 4.6 and Sonnet 4.6.
> **Claude Opus 5.5:** thinking is always on - omit `thinking` (or send `{"type": "adaptive"}`, which is equivalent); `{"type": "disabled"}` returns a 400 at every effort, as does a thinking budget. Control depth with `output_config.effort` instead - the default is `medium` on this model, where Claude Opus 5 defaults to `high`.
> **Claude Opus 5:** thinking is on by default - omitting `thinking` runs adaptive (`{"type": "adaptive"}` is equivalent), unlike Opus 4.8/4.7 where omitting it meant no thinking. `{"type": "disabled"}` is accepted only at effort `high` or lower; pairing it with `xhigh`/`max` returns a 400.
> **Claude Haiku 5.5:** adaptive thinking only, on by default; `budget_tokens` returns a 400.
> **Older models:** Use `thinking: {type: "enabled", budget_tokens: N}` (must be < `max_tokens`, min 1024).

```python
# Fable 5 / Claude Opus 5.5 / Claude Opus 5 / Opus 4.8 / 4.7 / 4.6: adaptive thinking (recommended)
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive", "display": "summarized"},  # display opt-in: default is omitted (empty thinking text) on Fable 5/5.1, Mythos 5/5.1, Claude Opus 5.5, Claude Opus 5, Opus 4.8/4.7, Claude Sonnet 5.5, and Claude Sonnet 5
    output_config={"effort": "high"},  # low | medium | high | xhigh | max
    messages=[{"role": "user", "content": "Solve this step by step..."}]
)

# Access thinking and response
for block in response.content:
    if block.type == "thinking":
        print(f"Thinking: {block.thinking}")
    elif block.type == "text":
        print(f"Response: {block.text}")
```

---

## Error Handling

```python
import anthropic

try:
    response = client.messages.create(...)
except anthropic.BadRequestError as e:
    print(f"Bad request: {e.message}")
except anthropic.AuthenticationError:
    print("Invalid API key")
except anthropic.PermissionDeniedError:
    print("API key lacks required permissions")
except anthropic.NotFoundError:
    print("Invalid model or endpoint")
except anthropic.RateLimitError as e:
    retry_after = int(e.response.headers.get("retry-after", "60"))
    print(f"Rate limited. Retry after {retry_after}s.")
except anthropic.APIStatusError as e:
    if e.status_code >= 500:
        print(f"Server error ({e.status_code}). Retry later.")
    else:
        print(f"API error: {e.message}")
except anthropic.APIConnectionError:
    print("Network error. Check internet connection.")
```

---

## Response Helpers

Every response object exposes `_request_id` (populated from the `request-id` header) - log it when reporting failures to Anthropic. Despite the underscore prefix, this property is public.

```python
message = client.messages.create(...)
print(message._request_id)       # req_018EeWyXxfu5pfWkrYcMdjWG
print(message.to_json())          # serialize the Pydantic model
print(message.to_dict())          # plain dict
```

To access raw headers or other response metadata, use `.with_raw_response`:

```python
raw = client.messages.with_raw_response.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
print(raw.headers.get("request-id"))
message = raw.parse()  # the Message object messages.create() would have returned
```

---

## Multi-Turn Conversations

The API is stateless - send the full conversation history each time.

```python
class ConversationManager:
    """Manage multi-turn conversations with the Claude API."""

    def __init__(self, client: anthropic.Anthropic, model: str, system: str = None):
        self.client = client
        self.model = model
        self.system = system
        self.messages = []

    def send(self, user_message: str, **kwargs) -> str:
        """Send a message and get a response."""
        self.messages.append({"role": "user", "content": user_message})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=kwargs.get("max_tokens", 16000),
            system=self.system,
            messages=self.messages,
            **kwargs
        )

        assistant_message = next(
            (b.text for b in response.content if b.type == "text"), ""
        )
        self.messages.append({"role": "assistant", "content": assistant_message})

        return assistant_message

# Usage
conversation = ConversationManager(
    client=anthropic.Anthropic(),
    model="claude-opus-5-5",
    system="You are a helpful assistant."
)

response1 = conversation.send("My name is Alice.")
response2 = conversation.send("What's my name?")  # Claude remembers "Alice"
```

**Rules:**

- Consecutive same-role messages are allowed - the API combines them into a single turn
- First message must be `user`
- `role: "system"` messages are allowed mid-conversation on supporting models (no beta header needed) - see § Mid-conversation system messages above

---

### Compaction (long conversations)

> **Beta, Fable 5, Claude Opus 5.5, Claude Opus 5, Opus 4.8, Opus 4.7, Opus 4.6, and Sonnet 4.6.** When conversations approach the 200K context window, compaction automatically summarizes earlier context server-side. The API returns a `compaction` block; you must pass it back on subsequent requests - append `response.content`, not just the text.

```python
import anthropic

client = anthropic.Anthropic()
messages = []

def chat(user_message: str) -> str:
    messages.append({"role": "user", "content": user_message})

    response = client.beta.messages.create(
        betas=["compact-2026-01-12"],
        model="claude-opus-5-5",
        max_tokens=16000,
        messages=messages,
        context_management={
            "edits": [{"type": "compact_20260112"}]
        }
    )

    # Append full content - compaction blocks must be preserved
    messages.append({"role": "assistant", "content": response.content})

    return next(block.text for block in response.content if block.type == "text")

# Compaction triggers automatically when context grows large
print(chat("Help me build a Python web scraper"))
print(chat("Add support for JavaScript-rendered pages"))
print(chat("Now add rate limiting and error handling"))
```

---

## Stop Reasons

The `stop_reason` field in the response indicates why the model stopped generating:

| Value | Meaning |
|-------|---------|
| `end_turn` | Claude finished its response naturally |
| `max_tokens` | Hit the `max_tokens` limit - increase it or use streaming |
| `stop_sequence` | Hit a custom stop sequence |
| `tool_use` | Claude wants to call a tool - execute it and continue |
| `pause_turn` | Model paused and can be resumed (agentic flows) |
| `refusal` | Claude refused for safety reasons - check `stop_details` |

### Structured Stop Details

When `stop_reason` is `"refusal"`, the response includes a `stop_details` object with structured information about the refusal:

```python
if response.stop_reason == "refusal" and response.stop_details:
    print(f"Category: {response.stop_details.category}")   # e.g. "cyber", "bio", "reasoning_extraction", "frontier_llm", or None - see docs for the full set
    print(f"Explanation: {response.stop_details.explanation}")
```

### Refusal Fallbacks (Claude Fable 5.1) - opt in by default

Fallbacks are **opt-in**: without them a refused request simply stops. Include the server-side `fallbacks` parameter in `claude-fable-5-1` code by default - on a policy decline the API re-runs the same request on the fallback model inside the same call. A mid-stream decline is billed at normal rates, and the rescue bills at the fallback model's own rates, with cache repricing applied automatically; for a decline before any output, see [How refusals are billed](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback#how-refusals-are-billed).

```python
response = client.beta.messages.create(
    model="claude-fable-5-1",
    max_tokens=16000,
    betas=["server-side-fallback-2026-06-01"],
    fallbacks=[{"model": "claude-opus-4-8"}],
    messages=[{"role": "user", "content": "..."}],
)

# Switch points: one fallback block per model that ran and declined this turn
for block in response.content:
    if block.type == "fallback":
        print(f"{block.from_.model} declined; {block.to.model} continued")

# Served-by signal - covers sticky turns, which carry no fallback block.
# Pair with stop_reason: the fallback model can itself refuse.
fallback_ran = any(
    entry.type == "fallback_message" for entry in response.usage.iterations or []
)
if fallback_ran and response.stop_reason != "refusal":
    print(f"Served by {response.model}")
```

A `stop_reason: "refusal"` on the final response means the whole chain refused. The header must be exactly `server-side-fallback-2026-06-01` **for this array form**; the newer `fallbacks: "default"` scalar form uses `server-side-fallback-2026-07-01` instead (see `shared/model-migration.md` -> Migrating to Claude Opus 5 -> New API features), and pairing either header with the other form returns a 400. The parameter is rejected on the Batches API and unavailable on Amazon Bedrock, Vertex AI, and Microsoft Foundry - register the client-side `BetaRefusalFallbackMiddleware` on the client there instead. Full semantics (sticky routing, billing, streaming, echoing fallback turns back): `shared/model-migration.md` -> Migrating to Claude Fable 5.1 -> `refusal` stop reason.

---

## Cost Optimization Strategies

### 1. Use Prompt Caching for Repeated Context

```python
# Automatic caching (simplest - caches the last cacheable block)
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    cache_control={"type": "ephemeral"},
    system=large_document_text,  # e.g., 50KB of context
    messages=[{"role": "user", "content": "Summarize the key points"}]
)

# First request: full cost
# Subsequent requests: ~90% cheaper for cached portion
```

### 2. Choose the Right Model

```python
# Default to Opus for most tasks
response = client.messages.create(
    model="claude-opus-5-5",  # $4.00/$20.00 per 1M tokens
    max_tokens=16000,
    messages=[{"role": "user", "content": "Explain quantum computing"}]
)

# Use Sonnet for high-volume production workloads
standard_response = client.messages.create(
    model="claude-sonnet-5-5",  # $2.00/$10.00 per 1M tokens
    max_tokens=16000,
    messages=[{"role": "user", "content": "Summarize this document"}]
)

# Use Haiku only for simple, speed-critical tasks
simple_response = client.messages.create(
    model="claude-haiku-5-5",  # $0.10/$0.50 per 1M tokens
    max_tokens=1024,
    output_config={"effort": "low"},
    messages=[{"role": "user", "content": "Classify this as positive or negative"}]
)
```

### 3. Use Token Counting Before Requests

```python
count_response = client.messages.count_tokens(
    model="claude-opus-5-5",
    messages=messages,
    system=system
)

estimated_input_cost = count_response.input_tokens * 0.000004  # $4/1M tokens
print(f"Estimated input cost: ${estimated_input_cost:.4f}")
```

---

## Retry with Exponential Backoff

> **Note:** The Anthropic SDK automatically retries rate limit (429) and server errors (5xx) with exponential backoff. You can configure this with `max_retries` (default: 2). Only implement custom retry logic if you need behavior beyond what the SDK provides.

```python
import time
import random
import anthropic

def call_with_retry(
    client: anthropic.Anthropic,
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    **kwargs
):
    """Call the API with exponential backoff retry."""
    last_exception = None

    for attempt in range(max_retries):
        try:
            return client.messages.create(**kwargs)
        except anthropic.RateLimitError as e:
            last_exception = e
        except anthropic.APIStatusError as e:
            if e.status_code >= 500:
                last_exception = e
            else:
                raise  # Client errors (4xx except 429) should not be retried

        delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
        print(f"Retry {attempt + 1}/{max_retries} after {delay:.1f}s")
        time.sleep(delay)

    raise last_exception
```
