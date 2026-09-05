---
description: Start an isolated n8n dev instance (own ports, own sqlite DB) from the current checkout and test changes in a browser — never touches your long-running dev servers
---

Start an isolated n8n dev instance from the directory where this conversation modified code, then use a browser MCP (e.g. Chrome DevTools MCP or Playwright) to test the changes.

Since PRs #35724/#35770, `N8N_PORT` + `N8N_EDITOR_PORT` relocate a whole dev instance (backend port, injected `BASE_PATH`, and the editor's REST base URL), so **the default is a fresh instance on free ports** — never touch already-running dev servers (default ports: editor 8080, backend 5678), never kill anything, no cwd detection.

No Docker: bind-mounting a macOS worktree into Linux breaks platform-native node_modules and file watching. Env vars give the same isolation natively, with real hot reload.

## Step 1 — Directory

Find the n8n repo root the Edit/Write/Bash calls in *this* conversation touched (the dir with `pnpm-workspace.yaml`). May be a worktree, not the session cwd. If nothing was edited, use the cwd. Say `Using <dir>` before continuing.

If a node/credential under `packages/nodes-base` was edited, `pnpm build` there first — definitions load once at backend boot.

## Step 2 — Shortcut: reuse a running instance

Only worth it when your own long-running dev servers already serve *this* checkout and the test needs their real data (workflows, credentials — log in with your own dev credentials; never paste them into this file or the conversation):

```bash
pid=$(pgrep -f "$(cd <dir> && pwd)/packages/cli" | head -n1)
[ -n "$pid" ] && curl -sf localhost:5678/healthz >/dev/null && curl -sf localhost:8080 >/dev/null && echo reusable
```

If `reusable`, skip to Step 6 against http://localhost:8080. Otherwise Step 3. Never restart or kill those servers to make this work — spin up your own instead.

## Step 3 — Ports and data dir

Backend needs two free ports (API + task-runner broker). The editor's vite server uses `strictPort`, so its port must be free or it fails fast.

```bash
BE=5679; FE=8081
while lsof -ti tcp:$BE >/dev/null 2>&1 || lsof -ti tcp:$((BE+1)) >/dev/null 2>&1; do BE=$((BE+1)); done
while lsof -ti tcp:$FE >/dev/null 2>&1; do FE=$((FE+1)); done
DATA=$(mktemp -d /tmp/n8n-isolated-XXXXXX)
echo "backend $BE broker $((BE+1)) editor $FE data $DATA"
```

`N8N_USER_FOLDER=$DATA` gives a brand-new sqlite DB at `$DATA/.n8n/database.sqlite` plus its own encryption key and logs. State the ports and data dir.

## Step 4 — Start both servers

Two backgrounded Bash calls, from `<dir>`:

```bash
# backend
N8N_PORT=$BE N8N_RUNNERS_BROKER_PORT=$((BE+1)) N8N_USER_FOLDER=$DATA pnpm dev:be

# editor — VUE_APP_URL_BASE_API= neutralises a stale export, which now wins over the derived URL (#35770)
N8N_PORT=$BE N8N_EDITOR_PORT=$FE VUE_APP_URL_BASE_API= pnpm dev:fe:editor
```

Both are watch-mode, so hot reload works exactly like the main setup. A malformed port throws immediately with the var name — read the error instead of waiting.

Needs a public URL (webhooks, OAuth callbacks)? Start `cloudflared tunnel --url "http://localhost:$BE"` backgrounded FIRST, then add `WEBHOOK_URL=https://<random>.trycloudflare.com/` to the backend env — it is read at boot.

Poll before testing (first build can take minutes; report the dev-server output if either never comes up):

```bash
until curl -sf localhost:$BE/healthz >/dev/null 2>&1; do sleep 3; done; echo backend ready
until curl -sf localhost:$FE >/dev/null 2>&1; do sleep 3; done; echo editor ready
```

## Step 5 — Owner setup (fresh DB has no users)

```bash
curl -sf -X POST "http://localhost:$BE/rest/owner/setup" -H 'content-type: application/json' \
  -d '{"email":"test@n8n.io","firstName":"Test","lastName":"Owner","password":"Test1234!"}'
```

If it rejects (payload shape drifts), complete the setup wizard in the browser with the same values. Log in as `test@n8n.io` / `Test1234!` — throwaway values for the throwaway DB, never your real credentials.

## Step 6 — Test

Check the browser MCP is responsive first (e.g. `list_pages` for Chrome DevTools MCP); if it hangs or the browser is stuck, close the open pages and open a new one. If calls still fail, say so — a broken MCP needs a manual `/mcp` reconnect that can't be done from here.

Then: decide which parts of the app the changes affect, navigate under `http://localhost:$FE`, log in, and verify. If a `/rest/*` call goes to 5678 instead of `$BE`, `N8N_PORT` did not reach the editor process — fix that before drawing conclusions.

Inspect persisted state directly when the UI isn't enough:

```bash
sqlite3 "$DATA/.n8n/database.sqlite" 'select id, name, active from workflow_entity;'
```

## Step 7 — Clean up

```bash
lsof -ti tcp:$BE -ti tcp:$((BE+1)) -ti tcp:$FE 2>/dev/null | xargs -r kill -9 2>/dev/null
pkill -f "cloudflared tunnel" 2>/dev/null
rm -rf "$DATA"
true
```

Explicit ports only — no `pkill` sweep of `turbo run dev`, and nothing that could hit the default 8080/5678 servers.

$ARGUMENTS
