
## Purpose

Use this to decide whether the target agent needs an entry in `integrations`
or a normal node/workflow tool for an external product, then configure
`integrations` only when the integration is the right surface.

## Use when

- The user asks to add, update, or remove entries in the target agent's
  `integrations` array.
- The user asks to connect the target agent to an external chat platform with
  credentials.

## Integration vs Node Tool Decision

Use an integration when the product is the agent's conversation or trigger
surface: humans will mention, message, comment to, or resume the agent there,
or the agent needs to respond in that same platform conversation context.

Use a node/workflow tool when the product is only something the agent operates
on: searching records, creating tickets, updating objects, or sending a
business-process notification while the conversation happens elsewhere.

Examples:

- Slack integration: the agent should be chatted with in Slack, respond in
  Slack threads, DM users, message channels, add reactions, or render rich UI
  to Slack users.
- Linear integration: the agent should be triggered from Linear issues/comments,
  understand the current Linear subject, or reply in the same Linear
  conversation.
- Linear node tools: the agent is triggered from Slack, Preview, a task, or a
  workflow and only needs to search/create/update Linear tickets.

## Workflow

The `integrations` array controls how the target agent is triggered.

### Chat Integrations

- These are connected external chat platforms, not built-in Preview chat.
- Call `agent_builder` (`action: "list_integration_types"`) first.
- Read the returned `capabilities`, `useIntegrationWhen`, and
  `useNodeToolWhen` fields before deciding to add an integration.
- Only connect a channel when the **user explicitly asks** to connect the agent
  to Slack, Telegram, Linear, or another chat platform. Do not suggest it
  unprompted.
- To connect a channel, call the standalone `configure_channel` tool with the
  chosen `integrationType` (e.g. `configure_channel({ integrationType: "slack" })`).
  It opens the channel setup UI in the chat, where the user creates a **new**
  credential and connects — a new agent always needs its **own** credential for
  its own identity, so **never reuse an existing credential** for a channel.
- **Never** call the `credentials` tool for a channel, and **never** write channel
  entries into `integrations` via `write_config`/`patch_config`. The setup UI
  persists the connection itself; leave the `integrations` array untouched for
  channels (do not clobber it on later config writes).
- `configure_channel` returns `{ connected }`. If `connected` is `false` the
  user skipped — proceed without the channel and do not re-prompt.

## Gotchas

- Connect chat channels only through `configure_channel`; never reuse an
  existing credential and never resolve one with the `credentials` tool.
- To connect chat channels through `configure_channel`, there is **no need to enable socket mode** and **no need to configure a Webhook URL**,  the connection is handled internally and only the new channel bot's respective token is required. **Do not contradict yourself on this matter**
- Do not add a Linear integration just because the agent needs Linear issue
  CRUD. Use Linear node tools unless Linear itself is the chat/trigger context.
- For recurring or scheduled runs, create a task (`agent_builder` `action:
  "create_task"`), not an integration.

## Verify

- Chat channels were connected via `configure_channel` (which creates a new
  credential through the setup UI), not by writing to `integrations` directly.
- The chosen integration matches `useIntegrationWhen`; otherwise use node or
  workflow tools.
- The final `integrations` array keeps unrelated integrations intact.
