# HTTP Error Codes Reference

This file documents HTTP error codes returned by the Claude API, their common causes, and how to handle them. For language-specific error handling examples, see the `python/` or `typescript/` folders.

## Error Code Summary

| Code | Error Type              | Retryable | Common Cause                         |
| ---- | ----------------------- | --------- | ------------------------------------ |
| 400  | `invalid_request_error` | No        | Invalid request format or parameters |
| 401  | `authentication_error`  | No        | Invalid or missing API key           |
| 402  | `billing_error`         | No        | Billing or payment problem           |
| 403  | `permission_error`      | No        | Not allowed for this credential      |
| 404  | `not_found_error`       | No        | Unknown endpoint, or model not found or not available to your org |
| 413  | `request_too_large`     | No        | Request exceeds size limits          |
| 429  | `rate_limit_error`      | Yes       | Too many requests                    |
| 500  | `api_error`             | Yes       | Anthropic service issue              |
| 529  | `overloaded_error`      | Yes       | API is temporarily overloaded        |

## Detailed Error Information

### 400 Bad Request

**Causes:**

- Malformed JSON in request body
- Missing required parameters (`model`, `max_tokens`, `messages`)
- Invalid parameter types (e.g., string where integer expected)
- Empty messages array
- Messages not alternating user/assistant
- An `anthropic-beta` value that does not exist or is not enabled for your organization. Both cases return the same message: ``Unexpected value(s) `<value>` for the `anthropic-beta` header.``

**Example error:**

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "messages: roles must alternate between \"user\" and \"assistant\""
  },
  "request_id": "req_011CSHoEeqs5C35K2UUqR7Fy"
}
```

**Fix:** Validate request structure before sending. Check that:

- `model` is a valid model ID
- `max_tokens` is a positive integer
- `messages` array is non-empty and alternates correctly

---

### 401 Unauthorized

**Causes:**

- Missing `x-api-key` header or `Authorization` header
- Invalid API key format
- Revoked or deleted API key
- OAuth bearer token sent via `x-api-key` instead of `Authorization: Bearer`
- Both `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` set - the SDK sends both headers and the API rejects the request

**Fix:** Set `ANTHROPIC_API_KEY`, or run `ant auth login` and leave the client constructor empty. For raw HTTP with an OAuth token, use `Authorization: Bearer <token>` (not `x-api-key:`).

---

### 403 Forbidden

**Causes:**

- The credential's organization or workspace is not allowed to perform this operation.
- The request was blocked by an access requirement, such as a region restriction or identity verification, for a model your organization can otherwise use. The message says what to do.
- Rarely, the model server denies a request that passed the API's access check. The message is `Access to this model requires an access grant your request does not have.`

A model your organization cannot use is normally a 404, not a 403 (see below). A beta header your organization is not enabled for is a 400.

**Fix:** Check your organization's access and workspace settings in the Console.

---

### 404 Not Found

**Causes:**

- Typo in model ID (e.g., `claude-sonnet-4.6` instead of `claude-sonnet-4-6`)
- Using deprecated model ID
- A model ID that exists but is not available to your organization
- Invalid API endpoint

A model that does not exist and a model your organization cannot use return the same response, `not_found_error` with a message that starts with `model: <id>`. The API does not reveal whether a model exists to callers who cannot use it.

**Fix:** Use exact model IDs from the models documentation. You can use aliases (e.g., `claude-opus-5-5`). To see which models your organization can use, call `GET /v1/models`.

---

### 413 Request Too Large

**Causes:**

- Request body exceeds maximum size
- Too many tokens in input
- Image data too large

**Fix:** Reduce input size - truncate conversation history, compress/resize images, or split large documents into chunks.

---

### 400 Validation Errors

Some 400 errors are specifically related to parameter validation:

- `max_tokens` exceeds model's limit
- Invalid `temperature` value (must be 0.0-1.0)
- `budget_tokens` >= `max_tokens` in extended thinking
- Invalid tool definition schema

**Model-specific 400s on Claude Opus 5.5 / Claude Opus 5 / Fable 5/5.1 / Opus 4.8 / 4.7:**

- `temperature`, `top_p`, `top_k` are removed - sending any of them returns 400. Delete the parameter; see `shared/model-migration.md` -> Per-SDK Syntax Reference.
- `thinking: {type: "enabled", budget_tokens: N}` is removed - sending it returns 400. Use `thinking: {type: "adaptive"}` instead.
- **Claude Opus 5:** `thinking: {type: "disabled"}` returns 400 when `effort` is `xhigh` or `max` - it is accepted at `high` or below. Thinking is on by default, so omitting the param runs adaptive rather than disabling it.
- **Fable 5/5.1 only:** an explicit `thinking: {type: "disabled"}` returns 400 at any effort (it is accepted on Opus 4.8/4.7). Omit the `thinking` param entirely instead.
- **Fable 5/5.1, Mythos 5/5.1:** if the organization or workspace is set to zero data retention (ZDR) - or any retention below the required 30 days - then **all** requests to these models return `400 invalid_request_error` ("In order to access this model, your organization or workspace must have data retention enabled."), even with a perfectly valid payload; ZDR only if expressly authorized by Anthropic. Check the retention configuration before debugging the request body.
- **Claude Opus 5.5:** `thinking: {type: "disabled"}` or `{type: "enabled", budget_tokens: N}` returns 400 `"thinking.type.disabled" is not supported for this model. Use "thinking.type.adaptive" and "output_config.effort" to control thinking behavior.` (`"thinking.type.enabled"` for the budget form) at every effort level - omit `thinking` and lower `output_config.effort` instead. A `tools` entry of type `computer_20251124` returns 400 `'claude-opus-5-5' does not support tool types: computer_20251124.` followed by `Did you mean one of` and the accepted types - declare `{type: "computer_toolset_20260801"}` instead (no beta header, no `name` / display size). See `shared/model-migration.md` -> Migrating to Claude Opus 5.5.
- **Claude Haiku 5.5:** `thinking: {type: "enabled", budget_tokens: N}`, a non-default `temperature` / `top_p` (and any `top_k`), and an assistant prefill each return 400 (all three are accepted on Claude Haiku 4.5); a `fallbacks` list returns 400 (no server-side fallback); `thinking: {type: "disabled"}` returns 400 when `effort` is `xhigh` or `max` - it is accepted at `high` or below - and a per-message effort change with thinking off returns 400; on the Claude API and Google Cloud a `tools` entry of type `computer_20250124` returns 400 - send `computer_toolset_20260801`. See `shared/model-migration.md` -> Migrating to Claude Haiku 5.5.
- **Claude Fable 5.1 / Claude Mythos 5.1 / Claude Opus 5.5 / Claude Sonnet 5.5:** `tool_choice: {type: "any"}` or `{type: "tool", name: ...}` returns 400 `tool_choice: type "tool" and "any" are not supported for this model.` - also on `count_tokens` and Batches. Use `{type: "auto"}` plus a prompt instruction (`strict: true` for schema-valid arguments), or structured outputs.
- **Claude Sonnet 5.5:** `thinking: {type: "disabled"}` returns 400 `"thinking.type.disabled" is not supported for this model. Use "thinking.type.between_tools" for the lowest thinking setting, or "thinking.type.adaptive" and "output_config.effort" to control thinking behavior.` - send `{type: "between_tools"}` to turn thinking off, or leave thinking on at a lower effort. `between_tools` has its own 400s: at effort `xhigh` / `max` (`output_config.effort 'xhigh' is not supported when thinking is disabled on this model. Use effort 'high' or below, or enable thinking.`), with `display`, `budget_tokens`, or `block_binding` beside it, on a per-message effort change (`messages.N: output_config.effort 'low' differs from the 'high' in effect before it; ...`), and on any other model (`"thinking.type.between_tools" is not supported for this model.`). On the Claude API and Google Cloud a `computer_20251124` tool returns 400 `'claude-sonnet-5-5' does not support tool types: computer_20251124.` - declare `{type: "computer_toolset_20260801"}` (Amazon Bedrock still accepts the earlier tool). An advisor tool `model` of Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, Claude Sonnet 5, or Sonnet 4.6 returns 400 with a Claude Sonnet 5.5 executor. The history-editing check in the next bullet also applies to Claude Sonnet 5.5 thinking blocks - enforced by default for new accounts on the Claude API and Amazon Bedrock - and `block_binding` is accepted only with thinking on. See `shared/model-migration.md` -> Migrating to Claude Sonnet 5.5.
- **Claude Fable 5.1 / Claude Opus 5.5 - preserved thinking / history-editing check (new accounts created on/after 2026-08-31 on every platform, or any request that sets `prefix_mismatch_behavior`; Claude Mythos 5.1 doesn't run it):** ``messages.N.content.M: Invalid `signature` in `thinking` block. The block is bound to a different conversation. Remove the block, or set `thinking.block_binding.prefix_mismatch_behavior` to "drop_block".`` (plus a sentence naming the beta header when it wasn't sent, and optionally one naming the first message that changed) means the system prompt, tool list, or an earlier message changed since that thinking block was produced. Retrying the same body never clears it; `count_tokens` returns the same 400. (In the Message Batches API the *unset* default drops the failing blocks instead of failing the item - a Batches item fails as `errored` only with `prefix_mismatch_behavior: "error"` set.) Strip the named block and every thinking block after it and retry once, or resend with `thinking.block_binding.prefix_mismatch_behavior: "drop_block"` under beta `thinking-binding-controls-2026-08-01` (the beta is available on the Claude API, Claude Platform on AWS, Bedrock, and Vertex; Foundry unconfirmed - `shared/platform-availability.md`; without the header that field is a 400 ending `block_binding: Extra inputs are not permitted`); then fix the harness so it stops editing history (see `shared/model-migration.md` -> Migrating to Claude Fable 5.1 from Claude Fable 5). The same leading clause with *no* "bound to a different conversation" sentence is a tampered signature - always a 400, regardless of the setting.

**Common mistake with extended thinking on older models (Opus 4.6 and earlier):**

```
# Wrong: budget_tokens must be < max_tokens
thinking: budget_tokens=10000, max_tokens=1000  -> Error!

# Correct
thinking: budget_tokens=10000, max_tokens=16000
```

---

### 429 Rate Limited

**Causes:**

- Exceeded requests per minute (RPM)
- Exceeded tokens per minute (TPM)
- Exceeded tokens per day (TPD)

**Headers to check:**

- `retry-after`: Seconds to wait before retrying
- `x-ratelimit-limit-*`: Your limits
- `x-ratelimit-remaining-*`: Remaining quota

**Fix:** The Anthropic SDKs automatically retry 429 and 5xx errors with exponential backoff (default: `max_retries=2`). For custom retry behavior, see the language-specific error handling examples.

---

### 500 Internal Server Error

**Causes:**

- Temporary Anthropic service issue
- Bug in API processing

**Fix:** Retry with exponential backoff. If persistent, check [status.anthropic.com](https://status.anthropic.com).

---

### 529 Overloaded

**Causes:**

- High API demand
- Service capacity reached

**Fix:** Retry with exponential backoff. Consider using a different model (Haiku is often less loaded), spreading requests over time, or implementing request queuing.

---

## Common Mistakes and Fixes

| Mistake                         | Error            | Fix                                                     |
| ------------------------------- | ---------------- | ------------------------------------------------------- |
| `temperature`/`top_p`/`top_k` on Claude Opus 5.5 / Claude Opus 5 / Fable 5/5.1 / Opus 4.8 / 4.7 | 400 | Remove the parameter (see `shared/model-migration.md`)  |
| `budget_tokens` on Claude Opus 5.5 / Claude Opus 5 / Fable 5/5.1 / Opus 4.8 / 4.7 | 400  | Use `thinking: {type: "adaptive"}`                      |
| `thinking: {type: "disabled"}` on Fable 5/5.1 | 400    | Omit the `thinking` param entirely (accepted on Opus 4.8/4.7) |
| Org set to ZDR / retention below 30 days (Fable 5/5.1, Mythos 5/5.1) | 400 on every request | Fix the org's data-retention configuration - the payload isn't the problem |
| `thinking: {type: "disabled"}` or `budget_tokens` on Claude Opus 5.5 | 400 `"thinking.type.disabled" is not supported for this model` | Omit `thinking`; control depth with `output_config.effort` (default `medium`) |
| `computer_20251124` tool on Claude Opus 5.5 | 400 `does not support tool types: computer_20251124` | `{type: "computer_toolset_20260801"}` - no beta header, no `name` / display size; update the agent loop for member tool calls |
| `thinking: {type: "disabled"}` on Claude Sonnet 5.5 | 400 `"thinking.type.disabled" is not supported for this model` | `{type: "between_tools"}` at effort `high` or below (no other `thinking` field, no per-message effort change), or thinking on at a lower effort |
| `budget_tokens`, non-default sampling parameters, or assistant prefill on Claude Haiku 5.5 (code carried over from Haiku 4.5) | 400 | `thinking: {type: "adaptive"}` + `output_config.effort`; remove the sampling parameters; end `messages` with a user turn and use structured outputs |
| `thinking: {type: "between_tools"}` on any other model, or at `xhigh` / `max` | 400 | Send it only to Claude Sonnet 5.5 at effort `high` or below; otherwise omit `thinking` |
| `tool_choice` `any` / `tool` on Claude Fable 5.1 / Claude Mythos 5.1 / Claude Opus 5.5 / Claude Sonnet 5.5 | 400 | `{type: "auto"}` + name the tool in the prompt (`strict: true` for schema-valid args), or structured outputs |
| Edited history replayed with thinking blocks (Claude Fable 5.1 / Claude Opus 5.5 / Claude Sonnet 5.5 / Claude Haiku 5.5, preserved thinking; Claude Mythos 5.1 doesn't run this check) | 400 `Invalid signature in thinking block ... bound to a different conversation` | Stop editing history - keep the transcript append-only, using mid-conversation `role: "system"` / tool-change messages, turn-scoped `clear_at` reminders that are never deleted, server-side context editing, and summary-only compaction instead of edits; recover once by stripping the named block and every thinking block after it (text and tool calls stay), or `prefix_mismatch_behavior: "drop_block"` (thinking on only - not with Claude Sonnet 5.5's `between_tools`) |
| `thinking.block_binding` without `thinking-binding-controls-2026-08-01` | 400 `block_binding: Extra inputs are not permitted` | Send the beta header where the controls beta is offered (`shared/platform-availability.md`); elsewhere remove `block_binding` and use strip-and-retry |
| `budget_tokens` >= `max_tokens` (older models) | 400 | Ensure `budget_tokens` < `max_tokens`                  |
| Typo in model ID                | 404              | Use valid model ID like `claude-opus-5-5`               |
| First message is `assistant`    | 400              | First message must be `user`                            |
| Consecutive same-role messages  | 400              | Alternate `user` and `assistant`                        |
| API key in code                 | 401 (leaked key) | Use environment variable                                |
| Custom retry needs              | 429/5xx          | SDK retries automatically; customize with `max_retries` |

## Typed Exceptions in SDKs

**Always use the SDK's typed exception classes** instead of checking error messages with string matching. Each HTTP status code maps to a specific exception class per SDK.

### Exception class names by language

| HTTP | Python (`anthropic.*`) / TypeScript (`Anthropic.*`) | Ruby (`Anthropic::Errors::*`) | Java (`com.anthropic.errors.*`) | C# | PHP (`Anthropic\Core\Exceptions\*`) |
|---|---|---|---|---|---|
| 400 | `BadRequestError` | `BadRequestError` | `BadRequestException` | `AnthropicBadRequestException` | `BadRequestException` |
| 401 | `AuthenticationError` | `AuthenticationError` | `UnauthorizedException` | `AnthropicUnauthorizedException` | `AuthenticationException` |
| 403 | `PermissionDeniedError` | `PermissionDeniedError` | `PermissionDeniedException` | `AnthropicForbiddenException` | `PermissionDeniedException` |
| 404 | `NotFoundError` | `NotFoundError` | `NotFoundException` | `AnthropicNotFoundException` | `NotFoundException` |
| 422 | `UnprocessableEntityError` | `UnprocessableEntityError` | `UnprocessableEntityException` | `AnthropicUnprocessableEntityException` | `UnprocessableEntityException` |
| 429 | `RateLimitError` | `RateLimitError` | `RateLimitException` | `AnthropicRateLimitException` | `RateLimitException` |
| >=500 | `InternalServerError` | `InternalServerError` | `InternalServerException` | `Anthropic5xxException` | `InternalServerException` |
| net | `APIConnectionError` | `APIConnectionError` | `AnthropicIoException` | `AnthropicIOException` | `APIConnectionException` |
| base | `APIError` (both); `APIStatusError` (Python only) | `APIStatusError` / `APIError` | `AnthropicServiceException` | `AnthropicApiException` | `APIStatusException` / `APIException` |

The Ruby and PHP classes live in a dedicated errors namespace - write `Anthropic::Errors::RateLimitError` and `Anthropic\Core\Exceptions\RateLimitException` (not bare `Anthropic::RateLimitError`). All 4xx C# exceptions also inherit from `Anthropic4xxException`.

### Catch most-specific first, in a chain

Order `catch`/`except`/`rescue` clauses from the most specific subclass to the base class, with a separate clause for each category you handle differently - retryable (429, >=500, network) vs. non-retryable (4xx). The SDK defines a distinct class per status for exactly this reason; a single broad catch-all discards that information.

```python
try:
    msg = client.messages.create(...)
except anthropic.NotFoundError as e:          # 404 - e.g. bad model ID
    ...
except anthropic.RateLimitError as e:         # 429 - back off and retry
    ...
except anthropic.APIStatusError as e:         # any other non-2xx HTTP response
    print(e.status_code, e.message)
except anthropic.APIConnectionError as e:     # network failure before a response
    ...
```

The same chain shape applies in every SDK: TypeScript `instanceof Anthropic.NotFoundError` -> `RateLimitError` -> `APIConnectionError` -> `APIError` (check `APIConnectionError` before `APIError` - in the TypeScript SDK it's a subclass of `APIError`, unlike Python where it's a sibling); Ruby `rescue Anthropic::Errors::NotFoundError` -> `...::RateLimitError` -> `...::APIStatusError`; Java `catch (NotFoundException) ... catch (RateLimitException) ... catch (AnthropicServiceException)`; C# `catch (AnthropicNotFoundException) ... catch (AnthropicRateLimitException) ... catch (AnthropicApiException)`; PHP `catch (NotFoundException) ... catch (RateLimitException) ... catch (APIStatusException)`.

### Go - `errors.As` then branch on status

The Go SDK returns a single `*anthropic.Error` for all non-2xx responses. Unwrap it with `errors.As`, then branch on `StatusCode`:

```go
_, err := client.Messages.New(ctx, params)
if err != nil {
    var apierr *anthropic.Error
    if errors.As(err, &apierr) {
        switch apierr.StatusCode {
        case 404:
            // bad model ID / resource
        case 429:
            // back off and retry
        default:
            // other API error - apierr.StatusCode, apierr.RequestID
        }
    } else {
        // transport-level error (*url.Error wrapping *net.OpError, etc.)
    }
}
```

### Error `.type` Field

All `APIStatusError` subclasses now expose a `.type` property (Python: `.type`, TypeScript: `.type`, Java: `.errorType()`, Go: `.Type()`, Ruby: `.type`, PHP: `.type`) that returns the API error type string (e.g., `"invalid_request_error"`, `"authentication_error"`, `"rate_limit_error"`, `"overloaded_error"`). Use this to classify errors by type name instead of by status code. `"billing_error"` is a 402 and `"permission_error"` is a 403.

```python
except anthropic.APIStatusError as e:
    if e.type == "rate_limit_error":
        # handle rate limiting
    elif e.type == "overloaded_error":
        # handle overload
```
