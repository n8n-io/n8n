# n8n Hub — Sessions & Node-Direct Detail Testing Guide

**Branch:** `feat/n8n-hub-hackathon`
**Date:** 2026-05-13
**Living doc:** keep this in sync as the implementation lands and any contract changes.
**Audience:** anyone exercising the new session-grouping + node-direct detail features end-to-end.

This guide extends `2026-05-10-n8n-hub-testing-guide.md` with the new `caller.sessionId` field and the UI changes that consume it. Setup, prerequisites, auth, and demo identities are unchanged — read that guide for the environment baseline.

---

## TL;DR — what's new

- **`caller.sessionId`** (optional, free-form, 1–512 chars) on `POST /rest/executions/node` — lets the caller group multiple single-node executions under one logical run (an agent conversation, a script invocation, a CLI session).
- **CLI / SDK / MCP all default a sessionId** when the user doesn't supply one. CLI generates a UUID per `n8n exec` invocation. SDK generates one per `createClient(...)`. MCP forwards what the tool input carries (no transport default in v1 — agents pass `sessionId` explicitly).
- **UI list:** a "Group by session" toggle in the executions toolbar. When on, single-node executions sharing a `sessionId` collapse under a single group block with status rollup. Sessionless (or session-of-1) single-node calls stay as flat rows. Workflow runs are untouched.
- **UI detail:** clicking a single-node execution opens a **node-direct** view (no canvas). Header carries the caller chip, session-id chip, and credential link. If the execution has a `sessionId`, a sibling rail lists the other calls in the same session, click-to-navigate.

The "12 rows in 3 batches of 4" demo from the original guide now lands as **3 session blocks of 4 calls each**, one per surface (SDK, CLI, MCP).

---

## Common prerequisites

All three surfaces hit the same endpoint: `POST /rest/executions/node`.

Body accepted: `{ nodeType, parameters, credentialId?, nodeVersion?, dryRun?, caller? }`

`caller` schema:

```ts
{
  kind: 'mcp' | 'sdk' | 'cli';
  name: string;
  clientId?: string;
  sessionId?: string;   // NEW — 1..512 chars, free-form, optional
}
```

Environment (same as the previous guide):

- n8n running at `http://localhost:5678`
- Auth: `~/.n8n-cli/config.json {url, apiKey}` — `apiKey` is the JWT used as `X-N8N-API-KEY`
- Slack OAuth2 credential connected: `id=8BZpalGTCqC2oIbX`, type `slackOAuth2Api`, name "Slack account"
- GitHub credential connected: `id=LCPIXDMHsgT1l8rU`, type `githubApi`
- Recipient Slack user: `U09GV6R3QUX` (self)
- Demo subject: Romeo Balta — Slack `U08V4KZ526B` (handle `romeo.balta`), GitHub `romeobalta`
- "Weekly" window: `after:2026-05-04`

---

## 1) SDK surface

Default caller: `{ kind: 'sdk', name: '@n8n/sdk' }`. **Default `sessionId`: one UUID generated at `createClient(...)` time, attached to every call from that client instance.**

### Override the sessionId

```ts
import { createClient } from '../packages/@n8n/sdk/src/index';

const n8n = createClient({
  baseUrl,
  token,
  caller: {
    kind: 'sdk',
    name: 'romeo-report',
    sessionId: 'romeo-weekly-2026-05-13', // ← human-readable session id
  },
});
```

Per-call override is also supported via the `caller` field on any operation:

```ts
await n8n.slack.message.post({
  credentialId,
  authentication: 'oAuth2',
  ...rest,
  caller: { kind: 'sdk', name: '@n8n/sdk', sessionId: 'special-call' },
});
```

### Run it

```bash
pnpm exec tsx scripts/romeo-report-e2e.ts
```

The script does the standard 6-step pipeline. After this guide's wiring lands, you should see all 4 single-node executions appear under one session group in the UI, labeled with the SDK-generated UUID (or your override if you supplied one).

---

## 2) CLI surface

Default caller: `{ kind: 'cli', name: 'n8n-cli' }`. **Default `sessionId`: one UUID generated per `n8n exec` invocation** — every call within one process invocation shares the same id; spawning a fresh CLI process generates a new id.

### Override the sessionId

```bash
n8n-cli exec run slack.message.post \
  --credential 8BZpalGTCqC2oIbX \
  --input params.json \
  --session "romeo-weekly-2026-05-13" \
  --json
```

`--session <id>` is forwarded as `caller.sessionId` on the request body. Useful for multi-step shell scripts that want every call in the script to land in one session.

### Run the demo

```bash
scripts/romeo-report-e2e-cli.sh
```

⚠ Today the script does NOT pass `--session` between its steps, so each `n8n exec` invocation generates its own session id — the 4 CLI calls would each land as session-of-1 (flat rows). **TODO when the implementation is in:** update `romeo-report-e2e-cli.sh` to generate one session id at the top of the script (`SESSION="cli-romeo-$(uuidgen)"`) and pass `--session "$SESSION"` to every `n8n-cli exec run`.

---

## 3) MCP surface

Default caller: `{ kind: 'mcp', name: 'mcp-server' }`. **Default `sessionId`: none** — agents pass it explicitly in the tool input. (A transport-level default is a follow-up — see `docs/superpowers/specs/2026-05-13-n8n-hub-sessions-design.md` "Deferred from this plan".)

### Tool input

`n8n_execute_tool` gains an optional `sessionId` field:

```json
{
  "id": "slack.message.post",
  "credentialId": "8BZpalGTCqC2oIbX",
  "params": { /* ... */ },
  "sessionId": "claude-romeo-thread-1"
}
```

The MCP server forwards `sessionId` to `caller.sessionId` on the request body when provided.

### Direct curl (simulating the MCP server's wire calls)

```bash
TOKEN="$(jq -r .apiKey ~/.n8n-cli/config.json)"
URL="http://localhost:5678/rest/executions/node"
SESSION="claude-romeo-thread-1"

# Step 1 — slack.user.getAll
curl -s -X POST "$URL" -H "X-N8N-API-KEY: $TOKEN" -H "Content-Type: application/json" -d "{
  \"nodeType\":\"n8n-nodes-base.slack\",
  \"parameters\":{\"resource\":\"user\",\"operation\":\"getAll\",\"authentication\":\"oAuth2\",\"returnAll\":true},
  \"credentialId\":\"8BZpalGTCqC2oIbX\",
  \"caller\":{\"kind\":\"mcp\",\"name\":\"local-n8n\",\"sessionId\":\"$SESSION\"}
}"

# Step 2 — httpRequest (GitHub events)
curl -s -X POST "$URL" -H "X-N8N-API-KEY: $TOKEN" -H "Content-Type: application/json" -d "{
  \"nodeType\":\"n8n-nodes-base.httpRequest\",
  \"parameters\":{\"method\":\"GET\",\"url\":\"https://api.github.com/users/romeobalta/events\",\"sendQuery\":true,\"queryParameters\":{\"parameters\":[{\"name\":\"per_page\",\"value\":\"100\"}]}},
  \"caller\":{\"kind\":\"mcp\",\"name\":\"local-n8n\",\"sessionId\":\"$SESSION\"}
}"

# Step 3 — slack.message.search
curl -s -X POST "$URL" -H "X-N8N-API-KEY: $TOKEN" -H "Content-Type: application/json" -d "{
  \"nodeType\":\"n8n-nodes-base.slack\",
  \"parameters\":{\"resource\":\"message\",\"operation\":\"search\",\"authentication\":\"oAuth2\",\"query\":\"from:@romeo.balta after:2026-05-04\",\"sort\":\"desc\",\"limit\":50},
  \"credentialId\":\"8BZpalGTCqC2oIbX\",
  \"caller\":{\"kind\":\"mcp\",\"name\":\"local-n8n\",\"sessionId\":\"$SESSION\"}
}"

# Step 4 — slack.message.post
# (Block Kit body identical to step 6 in the SDK/CLI scripts; just add "sessionId":"$SESSION" inside caller)
curl -s -X POST "$URL" -H "X-N8N-API-KEY: $TOKEN" -H "Content-Type: application/json" -d "$BODY"
```

All four calls share `sessionId="claude-romeo-thread-1"`, so they collapse into one MCP session block in the UI.

---

## What you should see in the UI

After running all three surfaces with a consistent sessionId per surface, navigate to **`/executions`**.

### Executions list (toolbar)

A new **"Group by session"** switch lives in the toolbar (only visible when single-node executions exist on the page). On by default; toggle off reverts to the flat list.

### Executions list (grouped view)

```
▼ MCP   local-n8n   claude…   · 4 calls    4✓ · 11:32 – 11:33
  ● slack.message.post                              1.2s   11:33
  ● slack.message.search                            0.6s   11:33
  ● httpRequest                                     0.8s   11:32
  ● slack.user.getAll                               0.4s   11:32

▼ SDK   @n8n/sdk    a3f24c…  · 4 calls    4✓ · 11:30 – 11:31
  ...

▶ CLI   n8n-cli     c91d…    · 4 calls    4✓ · 11:28 – 11:29
        (collapsed by default if ≥ 6 calls; here it's 4 so expanded)

● Daily digest                workflow · manual · 4.7s    10:31
```

- Caller chip (`MCP` / `CLI` / `SDK`) renders via `N8nBadge`.
- Session-id chip (mono font) is **clickable** — click → URL filter to `?metadata=caller.sessionId=<id>` for a flat, shareable view of just that session.
- Group header is collapse-only (it's not a navigation target). Click the chevron or the row body of any child call to drill into the detail.
- Workflow runs and sessionless single-node calls remain flat rows, time-interleaved.

### Executions detail (node-direct view)

Clicking any single-node execution opens at `/executions/:id`:

```
Executions › slack.message.post                                       [×]
─────────────────────────────────────────────────────────────────────────
● slack.message.post   ·   success · 1.2s
─────────────────────────────────────────────────────────────────────────
 [MCP] via Claude Desktop · session claude…           Credential: Slack-Prod →
─────────────────────────────────────────────────────────────────────────
 SESSION · 4 calls │ Input · parameters    │ Output · 1 item
 ● slack.user…     │ ┌──────────────────┐  │ ┌──────────────────┐
 ● httpRequest     │ │ channel: …       │  │ │ { ok: true, … }  │
 ● slack.message…  │ │ text: …          │  │ │                  │
 ● slack.message.post ← active                                       
 View all in list →
```

- **No canvas.** The view is two `RunData` panes (Input + Output) — same JSON / Table / Schema toggles users get inside the workflow editor.
- **Caller bar** shows: `[KIND]` badge, `via <caller name>`, `session <short-id>` chip (clickable → URL filter), and the credential link (with deleted-state fallback when the credential no longer exists).
- **Sibling rail** appears only when `caller.sessionId` is present. Lists the session's other calls in chronological order; the current call is highlighted; clicking another row navigates to it; "View all in list →" opens the URL-filtered flat list.
- Sessionless single-node calls open the same node-direct view without the rail.

---

## Quick verification matrix

After each implementation phase lands, re-run this matrix:

| Surface | sessionId source | Expected UI grouping |
|---|---|---|
| SDK, no override | `createClient`-default UUID | One group, all 4 calls under one block |
| SDK, override at `createClient({ caller: { sessionId } })` | the supplied id | One group, label is your id |
| SDK, override per call | per-call value wins | One block per id; mixed if you used different ids |
| CLI, no `--session` | one UUID per `n8n exec` invocation | Four separate flat rows (one per process) |
| CLI, `--session <id>` in a multi-step shell script (same id passed to each invocation) | the supplied id | One group, all 4 calls under one block |
| MCP, agent passes `sessionId` | the supplied id | One group, label is the agent's id |
| MCP, no `sessionId` | absent | Four separate flat rows |

---

## Quirks (carried from the original guide, still apply)

1. **SDK package isn't resolvable as `@n8n/sdk` from `scripts/`** — scripts import by relative path: `../packages/@n8n/sdk/src/index`.
2. **Cache-poisoning bug in `ExecuteNodeService`**: per `nodeType + resource + operation` triple there's a placeholder `workflow_entity`. If those rows get deleted out-of-band, the cache lies and `POST /rest/executions/node` returns `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed`. Fix is `restart n8n`. Affects all three surfaces.
3. **Slack `message.search`** uses `from:@<handle>` (Slack username, not display name) and `after:YYYY-MM-DD`.
4. **`slack.message.post` Block Kit:** `blocksUi` must be a JSON-encoded **string** containing `{ blocks: [...] }`. The `user` field uses an RL: `{__rl: true, mode: 'id', value: '<U…>'}`.
5. **GitHub Events API** occasionally returns `pull_request.title` as `undefined` for `PullRequestEvent` items — script falls back to `PR #<number>`.

---

## Known follow-ups (not in v1)

- MCP transport-level default `sessionId` (agents currently pass it explicitly).
- Dedicated DB index on `caller.sessionId` for big-volume instances.
- `sessionLabel` for human-readable session naming as a separate field.
- Dedicated "Session" filter input in the filter sidebar.
- Session-transcript view (chronological stack of all calls + I/O on one page).
- Playwright spec for the grouping + rail navigation flows.

---

## Maintenance

When you change the contract — adding fields, changing defaults, renaming chips — update this guide in the same PR. Sections most likely to drift: the schema TL;DR, the per-surface "Override the sessionId" snippets, and the verification matrix.

Implementation plan: `docs/superpowers/plans/2026-05-13-n8n-hub-sessions.md`
Design spec: `docs/superpowers/specs/2026-05-13-n8n-hub-sessions-design.md`
