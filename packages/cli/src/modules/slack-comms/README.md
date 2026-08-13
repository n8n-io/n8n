# slack-comms

Talk to your n8n instance from Slack. Mention `@n8n` in a channel (or DM it) to build workflows, create agents, and troubleshoot executions through the AI Assistant. Failed executions post to an error channel with a **Debug this run** button.

Hackathon build. Direct mode only: one Slack app you create yourself, one n8n instance, credentials via environment variables, Socket Mode (no public URL needed for events).

## Prerequisites

- A running n8n instance with the AI Assistant configured (model + API key)
- The code sandbox service for workflow building:
  ```bash
  pnpm --filter n8n-containers services --services sandbox
  ```
- A Slack workspace where you can create apps

## 1. Create the Slack app

At [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From a manifest:

```yaml
display_information:
  name: n8n
features:
  app_home:
    messages_tab_enabled: true
    messages_tab_read_only_enabled: false
  bot_user:
    display_name: n8n
    always_online: true
  agent_view:
    agent_description: "Builds workflows, creates agents, and reports failures from your n8n instance."
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - chat:write
      - chat:write.public
      - assistant:write
      - im:history
      - im:write
      - channels:history
      - channels:read
      - groups:history
      - groups:read
      - reactions:write
      - users:read
      - users:read.email
settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.channels
      - message.groups
      - message.im
      - app_home_opened
      - app_context_changed
  interactivity:
    is_enabled: true
  org_deploy_enabled: false
  socket_mode_enabled: true
```

Then:

1. Basic Information → App-Level Tokens → generate a token with scope `connections:write` (`xapp-...`)
2. Install App → Install to Workspace → copy the Bot User OAuth Token (`xoxb-...`)
3. Any later scope or event change requires reinstalling the app

## 2. Configure n8n

```bash
N8N_ENABLED_MODULES=slack-comms,agents
N8N_COMMS_MODE=direct
N8N_COMMS_SLACK_BOT_TOKEN=xoxb-...
N8N_COMMS_SLACK_APP_TOKEN=xapp-...
N8N_COMMS_SLACK_SIGNING_SECRET=...        # unused at runtime in socket mode, kept for the HTTP path
N8N_COMMS_ERROR_CHANNEL_ID=C...           # channel that receives failure cards
N8N_COMMS_STREAM_MODE=native              # or "fallback" (chat.update instead of streaming)
```

Restart n8n after any change. Look for `Slack comms socket connected` in the log.

## 3. Use it

- `/invite @n8n` into the channels where you want to talk to it (and the error channel, if private)
- Mention `@n8n build me a workflow that ...` in a channel, or DM it
- It replies in-thread and follows the conversation without further mentions
- Approvals, credential selection, and plan review render as buttons and dropdowns
- Failed executions post to the error channel with **View this run** and **Debug this run**

## Identity

The caller's Slack profile email must match an existing, enabled n8n user on the instance. No match means the bot refuses (ephemerally) and does nothing. Everyone acts with their own n8n permissions.

## Known limits

- One Slack workspace per instance; one instance per workspace
- Multi-user Slack threads map to per-user assistant threads (no shared memory across users in one thread)
- `Run it now` buttons deep-link into n8n instead of executing directly
- SSO/LDAP users are currently refused by the identity gate (null-password check)
- Production path (shared cloud app, broker routing, HTTP transport, persistence) is documented in the branch plan but not built
