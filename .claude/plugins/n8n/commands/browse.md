---
description: Start an isolated n8n dev instance (own ports, own sqlite DB) from the current checkout and test changes in a browser — never touches your long-running dev servers
---

Start an isolated n8n dev instance from the directory where this conversation modified code, then test the changes in a browser.

Since PRs #35724/#35770, `N8N_PORT` + `N8N_EDITOR_PORT` relocate a whole dev instance (backend port, injected `BASE_PATH`, and the editor's REST base URL), so **the default is a fresh instance on free ports** — never touch already-running dev servers (default ports: editor 8080, backend 5678), never kill anything, no cwd detection.

No Docker: bind-mounting a macOS worktree into Linux breaks platform-native node_modules and file watching. Env vars give the same isolation natively, with real hot reload.

## Step 1 — Directory

Find the n8n repo root the Edit/Write/Bash calls in *this* conversation touched (the dir with `pnpm-workspace.yaml`). May be a worktree, not the session cwd. If nothing was edited, use the cwd. Say `Using <dir>` before continuing.

If a node/credential under `packages/nodes-base` was edited, `pnpm build` there first — definitions load once at backend boot.

## Step 2 — Shortcut: reuse a running instance

Only worth it when your own long-running dev servers already serve *this* checkout and the test needs their real data (workflows, credentials — log in with your own dev credentials; never paste them into this file or the conversation):

```bash
dir=$(cd <dir> && pwd -P)
# true when a process listening on the port runs from this checkout (its cwd is under $dir)
owned() { for p in $(lsof -ti tcp:$1 -sTCP:LISTEN 2>/dev/null); do case "$(lsof -a -p "$p" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')" in "$dir"|"$dir"/*) return 0;; esac; done; return 1; }
owned 5678 && owned 8080 && curl -sf localhost:5678/healthz >/dev/null && curl -sf localhost:8080 >/dev/null && echo reusable
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

Needs a public URL (webhooks, OAuth callbacks)? Start `cloudflared tunnel --url "http://localhost:$BE"` backgrounded FIRST and note its PID (`CF_PID=$!`), then add `WEBHOOK_URL=https://<random>.trycloudflare.com/` to the backend env, and it is read at boot.

Poll before testing, with a deadline (the first build can take minutes). If either check fails, stop and report the dev-server output:

```bash
wait_for() { for _ in $(seq 100); do curl -sf "$1" >/dev/null 2>&1 && return 0; sleep 3; done; echo "not ready after about 5 minutes: $1" >&2; return 1; }
wait_for localhost:$BE/healthz && echo backend ready
wait_for localhost:$FE && echo editor ready
```

## Step 5 — Owner setup (fresh DB has no users)

```bash
curl -sf -X POST "http://localhost:$BE/rest/owner/setup" -H 'content-type: application/json' \
  -d '{"email":"test@n8n.io","firstName":"Test","lastName":"Owner","password":"Test1234!"}'
```

If it rejects (payload shape drifts), complete the setup wizard in the browser with the same values. Log in as `test@n8n.io` / `Test1234!` — throwaway values for the throwaway DB, never your real credentials.

## Step 6 — Test

Check the browser responds first (e.g. `list_pages` in Chrome DevTools); if it hangs or is stuck, close the open pages and open a new one. If calls still fail, say so: a broken MCP server needs a manual `/mcp` reconnect that can't be done from here.

Then: decide which parts of the app the changes affect, navigate under `http://localhost:$FE`, log in, and verify. If a `/rest/*` call goes to 5678 instead of `$BE`, `N8N_PORT` did not reach the editor process — fix that before drawing conclusions.

Inspect persisted state directly when the UI isn't enough:

```bash
sqlite3 "$DATA/.n8n/database.sqlite" 'select id, name, active from workflow_entity;'
```

## Step 7 — Clean up

```bash
if [ -z "$BE" ] || [ -z "$FE" ] || [ -z "$DATA" ]; then
  echo "BE, FE or DATA is unset: set them from Step 3 first. Nothing was stopped." >&2
else
  lsof -ti tcp:$BE -ti tcp:$((BE+1)) -ti tcp:$FE 2>/dev/null | xargs -r kill -9 2>/dev/null
  [ -n "$CF_PID" ] && kill "$CF_PID" 2>/dev/null   # only the tunnel started in Step 4
  rm -rf "$DATA"
fi
true
```

Explicit ports only — no `pkill` sweep of `turbo run dev`, and nothing that could hit the default 8080/5678 servers.

$ARGUMENTS
