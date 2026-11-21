# Claude API - PHP

> **Note:** The PHP SDK is the official Anthropic SDK for PHP. A beta tool runner is available via `$client->beta->messages->toolRunner()`. Structured output helpers are supported via `StructuredOutputModel` classes. Agent SDK is not available. Bedrock, Vertex AI, and Foundry clients are supported.

## Installation

```bash
composer require "anthropic-ai/sdk"
```

## Client Initialization

```php
use Anthropic\Client;

// Using API key from environment variable
$client = new Client(apiKey: getenv("ANTHROPIC_API_KEY"));
```

### Amazon Bedrock

```php
use Anthropic\Bedrock\MantleClient;

// Messages-API Bedrock endpoint. Reads AWS credentials from env.
$client = new MantleClient(awsRegion: 'us-east-1');
```

Model IDs on Bedrock take an `anthropic.` prefix - e.g. `model: 'anthropic.claude-opus-5-5'`.

### Google Vertex AI

```php
use Anthropic\Vertex;

// Constructor is private. Parameter is `location`, not `region`.
$client = Vertex\Client::fromEnvironment(
    location: 'us-east5',
    projectId: 'my-project-id',
);
```

### Anthropic Foundry

```php
use Anthropic\Foundry;

// Constructor is private. baseUrl or resource is required.
$client = Foundry\Client::withCredentials(
    apiKey: getenv('ANTHROPIC_FOUNDRY_API_KEY'),
    baseUrl: 'https://<resource>.services.ai.azure.com/anthropic/v1',
);
```

---

## Basic Message Request

```php
$message = $client->messages->create(
    model: 'claude-opus-5-5',
    maxTokens: 16000,
    messages: [
        ['role' => 'user', 'content' => 'What is the capital of France?'],
    ],
);

// content is an array of polymorphic blocks (TextBlock, ToolUseBlock,
// ThinkingBlock). Accessing ->text on content[0] without checking the block
// type will throw if the first block is not a TextBlock (e.g., when extended
// thinking is enabled and a ThinkingBlock comes first). Always guard:
foreach ($message->content as $block) {
    if ($block->type === 'text') {
        echo $block->text;
    }
}
```

If you only want the first text block:

```php
foreach ($message->content as $block) {
    if ($block->type === 'text') {
        echo $block->text;
        break;
    }
}
```

---

## Extended Thinking

**Adaptive thinking is the recommended mode for Claude 4.6+ models.** Claude decides dynamically when and how much to think.

```php
use Anthropic\Messages\ThinkingBlock;

$message = $client->messages->create(
    model: 'claude-opus-5-5',
    maxTokens: 16000,
    thinking: ['type' => 'adaptive', 'display' => 'summarized'], // display opt-in: default is omitted (empty thinking text) on Fable 5/5.1, Mythos 5/5.1, Claude Opus 5.5, Claude Opus 5, Opus 4.8/4.7, Claude Sonnet 5.5, and Claude Sonnet 5
    messages: [
        ['role' => 'user', 'content' => 'Solve: 27 * 453'],
    ],
);

// ThinkingBlock(s) precede TextBlock in content
foreach ($message->content as $block) {
    if ($block instanceof ThinkingBlock) {
        echo "Thinking:\n{$block->thinking}\n\n";
        // $block->signature is an opaque string - preserve verbatim if
        // passing thinking blocks back in multi-turn conversations
    } elseif ($block->type === 'text') {
        echo "Answer: {$block->text}\n";
    }
}
```

> **Fable 5, Claude Opus 5.5, Claude Opus 5, Opus 4.8, Opus 4.7, Opus 4.6, and Sonnet 4.6:** Use adaptive thinking (above). `['type' => 'enabled', 'budgetTokens' => N]` is removed on Fable 5, Claude Opus 5.5, Claude Opus 5, Opus 4.8, and 4.7 (400 if sent); deprecated on Opus 4.6 and Sonnet 4.6.
> **Claude Opus 5.5:** thinking is always on - omit `thinking:` (or send `['type' => 'adaptive']`, which is equivalent); `['type' => 'disabled']` returns a 400 at every effort, as does a thinking budget. Control depth with the `outputConfig:` effort instead - the default is `medium` on this model, where Claude Opus 5 defaults to `high`.
> **Claude Opus 5:** thinking is on by default - omitting `thinking:` runs adaptive (`['type' => 'adaptive']` is equivalent), unlike Opus 4.8/4.7 where omitting it meant no thinking. `['type' => 'disabled']` is accepted only at effort `high` or lower; pairing it with `xhigh`/`max` returns a 400.
> **Older models:** Use `thinking: ['type' => 'enabled', 'budgetTokens' => N]` (budget must be < `maxTokens`, min 1024).

`$block->type === 'thinking'` also works for the check; `instanceof` narrows for PHPStan.

---

## Prompt Caching

`system:` takes an array of text blocks; set `cacheControl` on the last block. Array-shape syntax (camelCase keys) is idiomatic. For placement patterns and the silent-invalidator audit checklist, see `shared/prompt-caching.md`.

```php
$message = $client->messages->create(
    model: 'claude-opus-5-5',
    maxTokens: 16000,
    system: [
        ['type' => 'text', 'text' => $longSystemPrompt, 'cacheControl' => ['type' => 'ephemeral']],
    ],
    messages: [['role' => 'user', 'content' => 'Summarize the key points']],
);
```

For 1-hour TTL: `'cacheControl' => ['type' => 'ephemeral', 'ttl' => '1h']`. There's also a top-level `cacheControl:` on `messages->create(...)` that auto-places on the last cacheable block.

Verify hits via `$message->usage->cacheCreationInputTokens` / `$message->usage->cacheReadInputTokens`.

---

## Stop Details

When `stopReason` is `'refusal'`, the response includes structured `stopDetails`:

```php
if ($message->stopReason === 'refusal' && $message->stopDetails !== null) {
    echo "Category: " . $message->stopDetails->category . "\n";     // e.g. "cyber", "bio", "reasoning_extraction", "frontier_llm", or null - see docs for the full set
    echo "Explanation: " . $message->stopDetails->explanation . "\n";
}
```

**Refusal fallbacks (Claude Fable 5.1) - opt in by default.** Fallbacks are opt-in: without them a refused request simply stops. New `claude-fable-5-1` code should include the server-side `fallbacks` parameter (beta header `server-side-fallback-2026-06-01`, fallback model `claude-opus-4-8`, on the beta messages call) by default. The exact PHP binding (and the client-side middleware for providers without server-side support) is not documented here - WebFetch the PHP SDK repo's `examples/` from `shared/live-sources.md`; full semantics in `shared/model-migration.md` -> Migrating to Claude Fable 5.1 -> `refusal` stop reason.

---

## Error Type

`APIStatusException` exposes a `->type` property for programmatic error classification:

```php
try {
    $client->messages->create(...);
} catch (\Anthropic\Core\Exceptions\APIStatusException $e) {
    echo $e->type?->value;  // "rate_limit_error", "overloaded_error", etc.
}
```
