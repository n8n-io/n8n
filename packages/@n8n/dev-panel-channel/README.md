# @n8n/dev-panel-channel

Dev-only [Claude Code channel](https://code.claude.com/docs/en/channels) server.
Receives prompts from the editor-ui dev panel over local HTTP and forwards them
into a running Claude Code session as channel events.

Not shipped in production. `private: true`, not published to npm.

## How it runs

Claude Code spawns this as an MCP subprocess over stdio when launched with
`--dangerously-load-development-channels server:n8n-dev-panel`. At the same
time, it binds a local HTTP listener on `127.0.0.1:8788` so the browser panel
can POST prompts into it.

See the feature spec at [.claude/specs/dev-panel/](../../../.claude/specs/dev-panel/).

## Endpoints

### `POST /prompt`

Headers:
- `X-Sender: n8n-dev-panel` (required)
- `Content-Type: application/json`

Body:

```json
{
  "prompt": "make this button larger",
  "file": "packages/frontend/editor-ui/src/app/components/NodeView.vue",
  "line": 142,
  "col": 5,
  "testid": "execute-workflow-button",
  "component": "NodeView",
  "selector": ".el-button.primary",
  "classes": ["el-button", "primary"],
  "outerHtmlSnippet": "<button class=\"el-button primary\">Run</button>"
}
```

Emits a `notifications/claude/channel` notification; returns `{ "ok": true }`.

### `GET /health`

Returns `{ "ok": true, "server": "n8n-dev-panel" }`. Used by the panel's
status pill.

## Environment

- `N8N_DEV_PANEL_CHANNEL_PORT` — override the HTTP port (default `8788`).

## Testing without the panel

With Claude Code running (`pnpm dev:claude-panel` at repo root):

```sh
curl -s -X POST http://127.0.0.1:8788/prompt \
  -H 'Content-Type: application/json' \
  -H 'X-Sender: n8n-dev-panel' \
  -d '{"prompt":"say hello in the terminal"}'
```

The event arrives in your Claude Code session as `<channel source="n8n-dev-panel">`.
