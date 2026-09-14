# Channel Integration Tests

This guide explains how to add chat platform integration tests for agent channel integrations.
The current suite covers three layers:

- Shared contract tests for behavior every channel integration must support.
- Synthetic platform tests for hand-built edge cases.
- Recorded replay tests for real webhook payloads captured from a local run.

These tests validate n8n's integration logic: routing inbound messages to the agent, preserving
message context, executing integration actions, resuming suspended tool calls, and avoiding
self-trigger loops.

## Design: real adapters, no fakes

These tests run the **real** `@chat-adapter/*` adapters and the real `chat` SDK. There are no fake
or in-memory adapters. The packages are ESM-only; in production they are loaded via `esm-loader`'s
`new Function()` indirection to survive the CJS transform, but **that indirection cannot run under
Vitest** — so the test helpers import them directly (`await import('@chat-adapter/telegram')`), which
Vitest loads natively. Any test that drives a code path which itself calls `esm-loader` (e.g. the
real `ComponentMapper` for rich cards) must `vi.mock('../esm-loader', …)` to redirect the loaders to
native dynamic imports — see the telegram tests for the pattern.

The only thing faked is the **external platform HTTP at the network boundary** — you cannot call
live Telegram/Slack/Linear from CI. Everything else (adapter, `AgentChatBridge`, integration
implementation, action executor, message-context service) is real.

### Answering the network boundary

Each platform adapter uses a different HTTP client, so the interception mechanism differs:

| Platform | Adapter HTTP client | Interception | Helper |
|----------|---------------------|--------------|--------|
| Telegram | native `fetch` | replace `globalThis.fetch` | `installFetchStub` (replay-test-helpers) |
| Slack | `@slack/web-api` (axios) | `nock` at the HTTP layer | inline in slack `replay-test-context` |
| Linear | `@linear/sdk` (GraphQL over fetch) | replace `globalThis.fetch` | `installFetchStub` |

Responses are answered from two sources, in order of preference:

1. **Recorded data** where it matters — the captured webhook payload is replayed into the real
   adapter as the inbound event, and recorded outbound bodies inform assertions.
2. **Minimal stubs** for incidental calls the recordings don't need to pin down — identity bootstrap
   (`getMe`, `auth.test`, Linear `viewer`), streaming lifecycle, and entity look-ups.

The assertions check what the adapter **sends** (the outbound request body), not what it receives,
so response stubs only need to be valid enough for the real adapter to proceed.

#### Platform notes

- **Telegram** — `getMe` returns the bot fixture so the adapter learns its identity; `sendMessage`
  returns a minimal message. `reply_markup` is sent as a JSON object (not a stringified blob), so
  read inline-keyboard callback data via `getTelegramInlineCallbackData`.
- **Slack** — agent replies go through Slack's assistant **streaming** API
  (`chat.startStream` → `appendStream` → `stopStream`), not `chat.postMessage`. The nock handler
  reconstructs the streamed text and records it as a synthetic `chat.postMessage` so assertions can
  treat the reply as one outbound post. `webhookVerifier: () => true` bypasses signature checks (the
  fixtures carry sanitized signatures); passing `botUserId` skips the `auth.test` lookup.
- **Linear** — webhooks are HMAC-signed (`linear-signature`) and timestamp-checked, so the helper
  refreshes `webhookTimestamp` and signs the body. `@linear/sdk` strictly deserializes typed
  entities and lazily fetches relationships, so the GraphQL stub returns fully-shaped entities
  (e.g. a `Comment` needs `reactions: []`; an `AgentActivity` references `agentSession`/`sourceComment`
  by id). Linear's "mention" is an **agent-session** event, not a comment — see the contract note
  below.

## Test Layout

```text
src/modules/agents/integrations/
__tests__/channel-integration-contract.test.ts
__tests__/fixtures/<platform>/
__tests__/helpers/<platform>/replay-test-context.ts
__tests__/helpers/<platform>/synthetic-fixtures.ts
__tests__/helpers/replay-test-helpers.ts        # shared: createReplayContextSetup, installFetchStub, …
platforms/__tests__/<platform>/recorded-integration.test.ts
platforms/__tests__/<platform>/synthetic-integration.test.ts
```

Each `<platform>/replay-test-context.ts` builds the real adapter + real `Chat`, installs the
network interceptor, wires `AgentChatBridge` via `createReplayContextSetup`, and exposes
`sendWebhook`, `latestContext`, `lastPost`, `apiCalls`, and `shutdown` (which restores the
interceptor).

## Shared Contract Tests

Use `runSharedChannelIntegrationContract()` when a scenario should behave the same across platforms.
It verifies that an integration:

- Routes a mention or DM to `executeForChatPublished()`.
- Subscribes the thread and routes follow-up messages.
- Persists latest message context for the integration context tool.
- Responds through the integration action executor into the latest thread.
- Ignores messages authored by the connected bot.

> **Linear is intentionally not in the shared contract.** The real `@chat-adapter/linear` only treats
> agent-session events as mentions (a bare comment has `isMention = false`), and agent-session vs
> comment threads don't share an id — so the comment-as-mention + subscribe/follow-up contract
> doesn't model real Linear behavior. Linear's real flow is covered by its recorded agent-session
> test (`platforms/__tests__/linear/recorded-integration.test.ts`).

Assert the real adapter's actual output, not a simplified shape. For example, the message-context
`channelId` is platform-prefixed (`telegram:123456`, `slack:C_SUPPORT`), and Slack agent replies are
recorded with a `markdown_text` body.

## Synthetic Integration Tests

Use synthetic tests for cases that are hard to capture reliably or need narrow edge-case control:
platform-specific mention routing (Telegram group mentions), ignored messages (bot-authored), thread
identity rules (Telegram forum topics), tool-resume from cards/inline keyboards, action-executor
behavior (`send_dm`, `respond`).

Name each test as a scenario, not an implementation detail
(`'routes a Telegram group mention to a new agent conversation'`, not `'handles a Bot API update'`).
The assertion should prove integration behavior: the agent executor received the expected cleaned
message and integration type; the latest context has the expected platform target; the outbound
adapter call targets the right channel/thread; blocked messages don't call the agent executor.

## Recorded Replay Tests

Use recorded tests to lock down real webhook shapes against the real adapter. A recorded replay test:

1. Loads `recorded-session.json`.
2. Builds fixtures from the recorded webhook body and recorded bot metadata.
3. Sends the payload through the replay context webhook (driving the real adapter).
4. Asserts n8n behavior: agent execution, message context, and outbound request body.

Do not assert recorded fixture contents by themselves (e.g. `record.response.id`) — assert the
behavior n8n produced. Avoid overfitting to timestamps unless the timestamp is part of the thread or
message identity being tested.

> **Note on recording completeness.** The recordings primarily capture webhook **inputs**. The
> outbound side is answered by the interceptor stubs described above, because the recorder only
> captures `fetch` traffic (Slack uses axios) and adapter versions can drift from older recordings.
> If you want a recorded test to replay outbound responses verbatim, ensure the recording is current
> and complete for that adapter version.

## Recording Requests

Recording is controlled by `ChannelIntegrationRecorder` and the `recordAdapterCalls()` proxy. It can
capture `webhook` (incoming webhooks), `api-call` (adapter method calls), and `fetch` (outbound HTTP
to known platform APIs — note: `fetch` only, so axios-based clients like `@slack/web-api` are not
captured). Sensitive headers and token-shaped URLs are sanitized, but review every recording before
committing it.

To record during a local run:

```bash
export N8N_AGENT_INTEGRATION_RECORDING_ENABLED=true
export N8N_AGENT_INTEGRATION_RECORDING_SESSION_ID=telegram-basic
export N8N_AGENT_INTEGRATION_RECORDING_DIR="$PWD/.agent-recordings/channel-integrations"
pnpm dev   # a real n8n instance with a real bot connected (real credentials)
# then: message the bot, trigger callbacks, let the agent reply
```

Export and install the session:

```bash
pnpm recording:list --recording-dir ~/Documents/my-recordings
pnpm recording:export telegram-basic --output-dir src/modules/agents/integrations/__tests__/fixtures/telegram
# review, sanitize, minimize → rename to recorded-session.json
```

## Checklist

Before committing a new channel integration test:

- The test name describes a user-visible scenario or routing rule.
- The test asserts n8n integration behavior against the **real** adapter's actual output.
- Shared behavior is covered in the contract test where the platform fits its model.
- Platform-specific behavior is covered in a synthetic or recorded platform test.
- Recorded fixtures are sanitized, minimal, and reviewed manually.
- The network interceptor is restored on teardown (`shutdown()`).
