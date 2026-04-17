# Dev Panel — AI-assisted DOM editing for n8n

An in-app overlay that lets developers select any DOM element in the n8n
editor, type a prompt, and push it into a locally running Claude Code session
via [Channels](https://code.claude.com/docs/en/channels). Claude reads the
selected element's source location, edits the file, and Vite HMR reflects the
change in the browser.

Think "Vue Agentation, but the prompt auto-lands in Claude instead of the
clipboard."

## Status

MVP spec, not yet implemented.

## Goals

- Dev-only tool; zero bytes and zero side effects in production builds.
- Single keyboard shortcut to toggle the overlay during normal `pnpm dev`.
- One-way push: panel → Claude. Claude edits. HMR refreshes.
- No copy-paste, no context switching into the terminal to paste a prompt.

## Non-goals (MVP)

- Two-way chat bridge (no reply tool, no clarifying questions in the panel).
- Permission prompts in the UI (we run Claude with `--dangerously-skip-permissions`).
- Shipping as a public plugin / npm package.
- Supporting Claude sessions on a remote host.

## Architecture

```
┌── editor-ui (Vite dev only) ───┐        ┌── dev-panel-channel (MCP) ──┐
│ DevPanel overlay (Vue 3)       │  POST  │ Bun MCP server              │
│  • element picker (hover+click)│───────►│ HTTP :8788 /prompt          │
│  • popover + prompt textarea   │  JSON  │ emits claude/channel        │
│  • status pill (polls /health) │◄──────▲│   notification over stdio   │
└────────────────────────────────┘        └─────────────┬───────────────┘
         ▲ HMR refresh                                  │ stdio
         │                                              ▼
┌────────┴────────────────────────────────────────────────────────┐
│ claude --dangerously-load-development-channels                   │
│        server:n8n-dev-panel                                      │
│        --dangerously-skip-permissions                            │
│ → edits .vue / .ts files, Vite picks up change                   │
└──────────────────────────────────────────────────────────────────┘
```

Claude sees each prompt as:

```
<channel source="n8n-dev-panel" file="packages/frontend/editor-ui/src/app/components/NodeView.vue" line="142" testid="execute-workflow-button" selector=".el-button.primary">
make this button larger and give it a tooltip explaining what it does
</channel>
```

## Transport decision

Claude Code **Channels** (not Claude Agent SDK, not raw MCP, not CLI invocation).

| Option                  | Fit | Why not                                                                 |
|-------------------------|:---:|-------------------------------------------------------------------------|
| **Channels**            | ✅  | Designed to push events into a running local session. Files stay open. |
| Agent SDK (headless)    | ❌  | Fresh session per prompt. No editor context continuity.                 |
| Plain MCP server        | ❌  | Claude polls *it*, not the other way. Won't auto-react to a click.     |
| Subprocess `claude -p`  | ❌  | No streaming status, spawns cold per prompt.                            |

Caveats we accept:
- Channels is research-preview, requires Claude Code v2.1.80+.
- Requires claude.ai login (no API key auth).
- Custom channels require `--dangerously-load-development-channels`.
- Team/Enterprise orgs must have `channelsEnabled: true`.

## Packages

```
packages/@n8n/dev-panel-channel/              channel server (Node, "private": true)
  package.json                                
  src/server.ts                               MCP stdio + HTTP :8788
  tsconfig{,.build}.json, eslint.config.mjs
  README.md

packages/frontend/editor-ui/src/app/dev/DevPanel/   NEW — UI (not yet scaffolded)
  index.ts                                    entry, guarded by import.meta.env.DEV
  DevPanel.vue                                overlay root
  ElementPicker.ts                            hover highlight + click
  PromptPopover.vue                           textarea + send button
  channelClient.ts                            POSTs to http://127.0.0.1:8788/prompt
  useChannelHealth.ts                         polls /health, drives status pill

.mcp.json                                     NEW — points Claude at the channel server
```

Runtime: **Node** (not Bun). n8n already requires Node ≥22 and uses `tsx` for
dev execution. The channel server uses `node:http` for the listener and is
spawned via `pnpm --filter @n8n/dev-panel-channel exec tsx src/server.ts`.

Nothing new in `packages/cli`, `nodes-base`, etc. This is a frontend-only
feature plus one standalone MCP server.

## Dev-only enforcement

Three independent layers:

1. **Vite tree-shaking.** `DevPanel` is imported behind `if (import.meta.env.DEV)`
   in `packages/frontend/editor-ui/src/app/init.ts`. Vite statically replaces
   this as `false` for production builds; rollup drops the import.
2. **Vite plugin guard.** The source-location injector
   (`vite-plugin-vue-inspector`) is only added to the Vite config when
   `mode === 'development'`.
3. **Channel server is a separate package** with `"private": true` and no
   runtime dependency from the CLI or editor-ui build graph. It never lands
   in a published artifact.

A CI check greps the production bundle for `DevPanel` / `localhost:8788` and
fails if present.

## UX flow

1. Developer runs `pnpm dev` in `packages/frontend/editor-ui`. Panel is
   mounted but invisible.
2. Developer opens a separate terminal and runs `pnpm dev:ai` at the repo
   root, which exec's:
   `claude --dangerously-load-development-channels server:n8n-dev-panel --dangerously-skip-permissions`
3. Claude Code spawns the channel server as a subprocess (stdio). The server
   opens `http://127.0.0.1:8788`.
4. Developer presses `⌘⇧D` (or `Ctrl+Shift+D`) in the browser. Panel toggles on.
   - Status pill shows **"connected"** (if `/health` responds) or
     **"run `pnpm dev:ai` to enable AI edits"** with a copy button.
5. Developer clicks "pick element", hovers, clicks the target.
6. Popover appears anchored to the element. Developer types prompt, presses
   send (⌘↵).
7. Panel POSTs `{ prompt, file, line, selector, testId, outerHtmlSnippet }`
   to `/prompt`. Channel server forwards as
   `notifications/claude/channel`. Terminal shows Claude receiving the event
   and starting to work.
8. Claude edits source files. Vite HMR reloads. Panel status pill flips to
   **"working…"** (heuristic: while the HTTP request is in-flight) and
   returns to **"connected"** when done.

### Keyboard shortcuts (MVP)

| Key           | Action                           |
|---------------|----------------------------------|
| `⌘⇧D` / `Ctrl+⇧+D` | Toggle panel                 |
| `Esc`         | Cancel element picker            |
| `⌘↵`          | Send prompt                      |

## Source-location mapping

Use [`vite-plugin-vue-inspector`](https://github.com/webfansplz/vite-plugin-vue-inspector)
in dev mode. It injects a `data-v-inspector="<path>:<line>:<col>"` attribute
on every rendered element. Our picker walks up from the clicked node until it
finds the nearest element with this attribute.

Fallback when no inspector attribute is available (e.g. content inside a
third-party component like ElementPlus): ship these fields so Claude can grep:

- `testId` — nearest `data-testid` up the tree
- `classes` — class list of the clicked element
- `selector` — simplified CSS path from nearest testid/id ancestor
- `outerHtmlSnippet` — first 500 chars of `outerHTML`
- `componentName` — Vue component `__name` from the nearest mountable instance

## Channel server contract

### `POST /prompt`

Request:
```json
{
  "prompt": "make this button larger and add a tooltip",
  "file": "packages/frontend/editor-ui/src/app/components/NodeView.vue",
  "line": 142,
  "col": 5,
  "testId": "execute-workflow-button",
  "componentName": "NodeView",
  "selector": ".el-button.primary",
  "classes": ["el-button", "primary"],
  "outerHtmlSnippet": "<button class=\"el-button primary\">Run</button>"
}
```

Response: `{ "ok": true }` once the MCP notification has been emitted.

The server forwards to Claude as:

```
<channel source="n8n-dev-panel"
         file="packages/frontend/editor-ui/src/app/components/NodeView.vue"
         line="142"
         testid="execute-workflow-button"
         component="NodeView"
         selector=".el-button.primary">
make this button larger and add a tooltip
</channel>
```

(Meta keys must match `[a-zA-Z0-9_]+` — hyphens are silently dropped by the
channels runtime, so we use `testid` not `test-id`, etc.)

### `GET /health`

Returns `200 { "ok": true, "session": "<claude-session-id>" }`. Used by the
panel's status pill. No auth; bound to `127.0.0.1` only.

### Server-side system prompt

```ts
instructions:
  'Prompts arrive as <channel source="n8n-dev-panel"> tags. The `file` and ' +
  '`line` attributes point at the Vue/TS file that rendered the element. ' +
  'Edit the file to fulfill the user\'s request. Use `testid`, `selector`, ' +
  'and `component` as grep fallbacks when `file` is absent. Do not reply ' +
  'through any channel — this channel is one-way.'
```

## Commands

```jsonc
// packages/frontend/editor-ui/package.json — unchanged
"dev": "vite"

// repo root package.json — new
// (note: "dev:ai" is already taken; this feature uses "dev:claude-panel")
"dev:claude-panel": "claude --dangerously-load-development-channels server:n8n-dev-panel --dangerously-skip-permissions"
```

### Why not a single command?

The channel server is spawned by Claude Code over stdio — it can't run
without a Claude session. Folding both into one command would either:

- Co-locate Claude in the same terminal as Vite (killing Vite's log output), or
- Spawn Claude in a new OS terminal (platform-specific, ugly).

Keeping `pnpm dev` and `pnpm dev:claude-panel` separate lets the panel light
up automatically when Claude is running, and fall back gracefully with a hint
when it isn't.

## `.mcp.json`

New file at repo root, committed:

```json
{
  "mcpServers": {
    "n8n-dev-panel": {
      "command": "pnpm",
      "args": [
        "--silent",
        "--filter",
        "@n8n/dev-panel-channel",
        "exec",
        "tsx",
        "src/server.ts"
      ]
    }
  }
}
```

Only loaded when Claude is launched with
`--dangerously-load-development-channels server:n8n-dev-panel`.

## Security

Low surface area, but called out:

- Channel server binds `127.0.0.1` only.
- Gated inbound is not strictly needed (no external senders), but we still
  require a simple `X-Sender: dev-panel` header that the panel sends and the
  server checks. Makes accidental curl experiments harder to land in a
  session silently.
- `--dangerously-skip-permissions` means any Bash / Write / Edit call Claude
  decides on goes through. Acceptable for a local dev environment; documented
  clearly in the README.
- CSP: editor-ui dev CSP already allows `localhost:*`; confirm before merging.

## Open questions

- [ ] Do we also want a "select last N console errors" button that attaches
      recent console messages to the prompt?
- [ ] Should the panel remember the last N prompts per element (local history)?
- [ ] Add a screenshot of the selected element to the prompt meta? Channels
      `content` is a string — would need data URL or filesystem path.

## Implementation TODO

### Channel server
- [x] Create `packages/@n8n/dev-panel-channel/` package skeleton with `"private": true`.
- [x] Add `@modelcontextprotocol/sdk` dependency.
- [x] Implement `src/server.ts` following the
      [webhook-receiver pattern](https://code.claude.com/docs/en/channels-reference#example-build-a-webhook-receiver).
- [x] Declare `experimental: { 'claude/channel': {} }` capability.
- [x] `POST /prompt` handler → `notifications/claude/channel` with meta.
- [x] `GET /health` handler.
- [x] `X-Sender` header check.
- [x] Instructions string (see spec).

### UI
- [ ] Scaffold `packages/frontend/editor-ui/src/app/dev/DevPanel/` with
      dev-only dynamic import in `init.ts`.
- [ ] Implement `ElementPicker` (hover highlight via overlay rect, click to
      select, Esc to cancel).
- [ ] Implement `PromptPopover.vue` (anchored to element, textarea, send button).
- [ ] Implement `channelClient.ts` (POST /prompt, JSON body).
- [ ] Implement `useChannelHealth.ts` (poll `/health` every 3s, debounced).
- [ ] Status pill component with the three states: connected / not-running / working.
- [ ] Keyboard shortcut registration (`⌘⇧D`).
- [ ] i18n strings in `@n8n/i18n` for visible copy (or leave in English only
      since it's dev-only — decide with user).

### Vite / build
- [ ] Add `vite-plugin-vue-inspector` to editor-ui Vite config, gated on `mode === 'development'`.
- [ ] Verify `DevPanel` is tree-shaken from production bundles (CI grep check).
- [x] Add `.mcp.json` at repo root.

### Commands / docs
- [x] Add `dev:claude-panel` script at repo root.
- [ ] README section in editor-ui explaining how to enable (`pnpm dev:claude-panel` + link to Channels docs).
- [ ] Document Claude Code version requirement (`v2.1.80+`) and claude.ai login.

### Tests
- [ ] Unit: `ElementPicker` finds nearest `data-v-inspector` ancestor.
- [ ] Unit: `channelClient` handles 503 (server down) gracefully.
- [ ] Unit: channel server forwards POST body as notification with correct meta keys.
- [ ] Manual: end-to-end "click button, prompt, verify file edited" in `pnpm dev` + `pnpm dev:ai`.

## References

- [Claude Code Channels](https://code.claude.com/docs/en/channels)
- [Channels Reference — building a custom channel](https://code.claude.com/docs/en/channels-reference)
- [Agentation (agent-agnostic inspiration)](https://github.com/benjitaylor/agentation)
- [vite-plugin-vue-inspector](https://github.com/webfansplz/vite-plugin-vue-inspector)
