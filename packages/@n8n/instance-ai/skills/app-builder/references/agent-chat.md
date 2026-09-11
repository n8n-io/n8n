# `agent-chat` block

A chat with one of the project's agents, rendered on the page. The visitor
types a message, the agent's reply streams into the widget. Use it when the
user wants "a chat with my agent on the page", "let customers talk to the
support agent", or a help widget backed by an agent that already exists.

```json
{
  "id": "chat1",
  "type": "agent-chat",
  "data": {
    "agentId": "agent_abc123",
    "welcome": "Hi! Ask me anything about your order.",
    "placeholder": "Type your question"
  }
}
```

| Field | Rules |
| --- | --- |
| `agentId` | Required. Id of an agent in the **same project** as the app. |
| `welcome` | Optional, max 500 characters. Shown as the first assistant bubble. Plain text; markup is escaped. |
| `placeholder` | Optional, max 100 characters. Placeholder of the input. Default "Type a message". |

## Rules

- **Published agents only.** The block talks to the agent's published
  version. An agent that was never published answers every message with an
  error bubble ("Agent is not published"). Ask the user to publish the agent
  first, or publish it with the agent tooling, before you point a block at it.
- **Finding the id.** Use the agents tooling you already have (the
  `agent-builder` skill and its tools) to list the project's agents and read
  the id and whether it is published. The `apps` tool has no agent listing.
- **One agent per block.** Put a second block on the page for a second agent.
- **No tool approvals, no attachments.** A tool call that needs human approval
  cannot be approved from the page; the reply ends there. Do not point the
  block at agents whose tools require approval.
- **History lasts one page load.** The thread continues while the visitor
  stays on the page. A reload starts a new thread. For an app with
  `auth: "n8n"` the agent's memory is per signed-in viewer; on a public app
  it is per thread.
- **Agents module.** If the instance has agents disabled, the block renders a
  muted "Chat is not available on this instance." notice. Do not add the block
  when the user has no agents.

## Styling

The widget uses `.app-chat`, `.app-chat-messages`, `.app-chat-bubble`,
`.app-chat-bubble--user`, `.app-chat-bubble--assistant`,
`.app-chat-bubble--notice` and `.app-chat-form`. Override them with
`theme.customCss`; the widget follows the theme colors by default.
