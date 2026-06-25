# Channel Integration Tests

This guide explains how to add chat platform integration tests for agent channel integrations.
The current suite covers three layers:

- Shared contract tests for behavior every channel integration must support.
- Synthetic platform tests for hand-built edge cases.
- Recorded replay tests for real webhook/API traffic captured from a local run.

These tests should validate n8n's integration logic: routing inbound messages to the agent, preserving message context, executing integration actions, resuming suspended tool calls, and avoiding self-trigger loops. Avoid asserting the Chat SDK itself unless the behavior is part of our adapter contract.

## Test Layout

Channel integration tests live under:

```text
src/modules/agents/integrations/
__tests__/channel-integration-contract.test.ts
__tests__/fixtures/<platform>/
__tests__/helpers/<platform>/replay-test-context.ts
__tests__/helpers/<platform>/synthetic-fixtures.ts
platforms/__tests__/<platform>/recorded-integration.test.ts
platforms/__tests__/<platform>/synthetic-integration.test.ts
```

Use the replay context helpers to build a small in-memory Chat SDK surface. The helpers should be just realistic enough to drive `AgentChatBridge`, `ChatIntegrationActionExecutor`, `IntegrationMessageContextService`, and the platform integration implementation.

## Shared Contract Tests

Use `runSharedChannelIntegrationContract()` when a scenario should behave the same across platforms.

The shared contract currently verifies that an integration:

- Routes a mention or DM to `executeForChatPublished()`.
- Subscribes the thread and routes follow-up messages.
- Persists latest message context for the integration context tool.
- Responds through the integration action executor into the latest thread.
- Ignores messages authored by the connected bot.

Add a platform to `channel-integration-contract.test.ts` by providing:

- `fixtures`: `mention`, `followUp`, and `selfMessage`.
- `expected.message` and `expected.followUpMessage`.
- Expected context fields such as platform, message ID, user ID, thread ID, and channel ID.
- Expected outbound post body for first response and `respond`.
- `createContext()`, usually `createSlackReplayContext()` or `createTelegramReplayContext()`.

Keep shared assertions focused on n8n behavior. If a platform has special handling, put it in a synthetic platform test instead.

## Synthetic Integration Tests

Use synthetic tests for cases that are hard to capture reliably, need narrow edge-case control, or should be readable without scanning a recorded payload.

Good synthetic scenarios include:

- Platform-specific mention routing, such as Telegram group mentions.
- Ignored messages, such as non-mentioned group messages or bot-authored Slack messages.
- Thread identity rules, such as Telegram forum topic IDs.
- Tool resume behavior from rich cards or inline keyboard callbacks.
- Action executor behavior, such as `send_dm` or `respond`.

Name each test as a scenario, not an implementation detail. Prefer:

```ts
it('routes a Telegram group mention to a new agent conversation', async () => {
	// ...
});
```

Avoid vague names like:

```ts
it('handles a Bot API update', async () => {
	// ...
});
```

The assertion should prove the integration behavior:

- The agent executor received the expected cleaned message and integration type.
- The latest message context contains the expected platform target.
- The outbound adapter call targets the right channel/thread.
- Blocked or ignored messages do not call the agent executor.

Do not duplicate Chat SDK parsing logic in the test and then claim the test validates the SDK. If the fake adapter implements the behavior, the test only proves our bridge behavior after the adapter emits an event.

## Recorded Replay Tests

Use recorded tests to lock down real-world webhook shapes and outbound adapter call shapes. Recorded tests are most useful for payload structure, platform metadata, and regressions caused by fields that synthetic fixtures missed.

A recorded replay test usually:

1. Loads `recorded-session.json`.
2. Finds the webhook record for the scenario.
3. Builds replay fixtures from the recorded webhook body and recorded bot metadata.
4. Sends the payload through the replay context webhook.
5. Asserts n8n behavior: agent execution, message context, and outbound post body.

Do not assert recorded fixture contents by themselves. For example, asserting `record.response.id` only proves the JSON file has that value. Instead, assert the replayed behavior that n8n produced in the test context.

Recorded tests should also avoid overfitting to timestamps unless the timestamp is part of the thread or message identity being tested.

## Recording Requests

Recording is controlled by `ChannelIntegrationRecorder` and the `recordAdapterCalls()` proxy.

The recorder can capture:

- `webhook`: incoming channel webhooks.
- `api-call`: Chat SDK adapter method calls such as `postMessage`, `openDM`, `startTyping`, and `deleteMessage`.
- `fetch`: outbound HTTP calls to known platform APIs, such as Slack and Telegram.

Sensitive headers and known token-shaped URLs are sanitized before writing records. Still review every recording before committing it.

To enable recording during a local run, set:

```bash
export N8N_AGENT_INTEGRATION_RECORDING_ENABLED=true
export N8N_AGENT_INTEGRATION_RECORDING_SESSION_ID=telegram-basic
export N8N_AGENT_INTEGRATION_RECORDING_DIR="$PWD/.agent-recordings/channel-integrations"
pnpm dev
```

Then exercise the real platform flow:

- Send a message or mention to the connected bot.
- Trigger any follow-up, callback, or action scenario you want to preserve.
- Let the agent post the response so outbound adapter calls are recorded.

The default recording directory is `.agent-recordings/channel-integrations` under the current working directory if `N8N_AGENT_INTEGRATION_RECORDING_DIR` is not set.

## Exporting Recordings

Recordings are written as JSONL session files. Use the package scripts from `packages/cli` to list and export them.

List sessions:

```bash
pnpm recording:list --recording-dir ~/Documents/my-recordings
```

Export a session to stdout:

```bash
pnpm recording:export telegram-basic --recording-dir ~/Documents/my-recordings
```

Export a session to the test fixture folder:

```bash
pnpm recording:export telegram-basic --output-dir src/modules/agents/integrations/__tests__/fixtures/telegram
```

The export command writes `<session-id>.json`. Rename it to the fixture name used by the tests, for example `recorded-session.json`, after reviewing and minimizing the contents.

## Using Recordings In Tests

Load recordings with `jsonParse<ChannelIntegrationRecord[]>()`:

```ts
const recordedSession = jsonParse<ChannelIntegrationRecord[]>(
	readFileSync(join(__dirname, '../../__tests__/fixtures/telegram/recorded-session.json'), 'utf8'),
);
```

Then select only the records needed for the scenario. Keep lookup helpers specific and explicit:

```ts
function getRecordedWebhook() {
	const record = recordedSession.find(
		(entry): entry is Extract<ChannelIntegrationRecord, { type: 'webhook' }> =>
			entry.type === 'webhook' && entry.platform === 'telegram',
	);
	if (!record) throw new Error('Expected Telegram webhook record');
	return record;
}
```

Build replay fixtures from the recorded webhook body, not by copying fields into new literals. This keeps the test close to the captured platform payload while still letting assertions focus on n8n behavior.

## Checklist

Before committing a new channel integration test:

- The test name describes a user-visible scenario or routing rule.
- The test asserts n8n integration behavior, not just SDK or fixture behavior.
- Shared behavior is covered in the contract test where possible.
- Platform-specific behavior is covered in a synthetic or recorded platform test.
- Recorded fixtures are sanitized, minimal, and reviewed manually.
