
## Purpose

Use this to decide whether the target agent needs an entry in `integrations`
or a normal node/workflow tool for an external product, then configure
`integrations` only when the integration is the right surface.

## Use when

- The user asks to add, update, or remove entries in the target agent's
  `integrations` array.
- The user asks to connect the target agent to an external chat platform with
  credentials.

## Decision

Use an integration when the external product is the agent's conversation or
trigger surface: people will mention, message, comment to, or resume the agent
there, and the agent should respond in that same conversation context.

Use a node/workflow tool when the product is only something the agent operates
on, such as searching records, creating tickets, updating objects, or sending a
notification while the conversation happens elsewhere.

## Workflow

- Chat integrations are connected external platforms, not built-in Preview chat.
- Call `agent_builder` (`action: "list_integration_types"`) before selecting a
  channel. The returned `type` values are the channel catalog.
- Read the returned `capabilities`, `useIntegrationWhen`, and
  `useNodeToolWhen` fields before deciding between an integration and a
  node/workflow tool.
- Connect a returned channel with the standalone `configure_channel` tool. It
  opens setup UI in chat, creates the channel credential, persists the
  connection, and returns `{ connected }`.
- If `configure_channel` returns `{ connected: false }`, the user skipped setup;
  continue without re-prompting.
- If the requested platform is not returned by `list_integration_types`, tell the
  user it is not available as a chat channel and use a node/workflow tool when
  that matches the request.
- Leave channel entries out of `write_config`/`patch_config` changes. The setup
  UI persists them, so later config writes should preserve existing
  integrations.

## Gotchas

- `configure_channel` handles the channel connection details; socket mode and
  webhook URL setup are not part of this flow.
- Linear issue CRUD usually belongs in a node/workflow tool unless Linear itself
  is the chat/trigger context.
- For recurring or scheduled runs, create a task (`agent_builder` `action:
  "create_task"`), not an integration.

## Verify

- Chat channels were connected via `configure_channel` (which creates a new
  credential through the setup UI), not by writing to `integrations` directly.
- The chosen channel `type` came from `list_integration_types`.
- The chosen integration matches `useIntegrationWhen`; otherwise use node or
  workflow tools.
- The final `integrations` array keeps unrelated integrations intact.
