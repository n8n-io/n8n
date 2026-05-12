# n8n Hub — End-User Testing Guide

**Branch:** `feat/n8n-hub-hackathon`
**Date:** 2026-05-10
**Audience:** A developer with some n8n familiarity who wants to verify the hackathon deliverable end-to-end.

This guide walks you from a fresh clone to a working end-to-end smoke test of every surface the hackathon shipped:

- `POST /rest/executions/node` — single-node execution endpoint
- `GET /rest/nodes/search` and `GET /rest/nodes/:id` — REST node catalog
- Three new MCP tools at `/mcp-server/http`
- `@n8n/sdk` — TypeScript client
- `@n8n/cli` — `n8n-cli node`, `exec`, `credential list` commands
- UI changes to the executions list (caller attribution)

You should be able to follow this guide top-to-bottom in roughly **45–75 minutes** the first time (most of that is `pnpm install` + `pnpm build`).

Status markers used throughout:

- ✅ Verified working
- ⚠ Known caveat / partial / depends on your environment
- ❌ Known broken (don't bother — workaround documented inline)

---

## 1. Prerequisites

### Tooling versions

The repo root `package.json` pins these:

- **Node.js:** `>=22.16` — confirmed via `engines.node`
- **pnpm:** `>=10.22.0` — confirmed via `engines.pnpm`; the project uses `packageManager: pnpm@10.32.1`

If you use `nvm`, the project does not commit a `.nvmrc`. Set Node yourself:

```bash
node --version    # must be >=22.16
pnpm --version    # must be >=10.22
```

If pnpm is missing or older, install via Corepack:

```bash
corepack enable
corepack prepare pnpm@10.32.1 --activate
```

### Disk space

`pnpm install` pulls **~5–8 GB** of `node_modules` across the monorepo, and the build produces another **~2–3 GB** of `dist/` and `.turbo/` caches. Budget **~12 GB free** before you start, with some headroom.

### Other tools

- `jq` — used for inspecting JSON responses in this guide. `brew install jq` on macOS.
- `curl` — comes with macOS / Linux.
- `git` — to switch branches.
- (Optional) **Claude Desktop** — for the MCP integration walkthrough in §9.
- (Optional) `tsx` or `pnpm exec tsx` — to run the SDK example.

---

## 2. Install + build

```bash
cd /Users/filipetavares/git/n8n
git checkout feat/n8n-hub-hackathon
pnpm install
pnpm build > /tmp/build.log 2>&1
tail -n 30 /tmp/build.log
```

### What to expect

- `pnpm install` takes **3–10 minutes** depending on network. It will print lots of warnings about peer dependencies; these are normal in a monorepo this size.
- `pnpm build` takes **8–20 minutes** the first time (Turbo will cache subsequent runs). The tail of the log should look something like:

```
 Tasks:    NN successful, NN total
Cached:    0 cached, NN total
  Time:    13m25s
```

✅ A clean build ends with a `Tasks: ... successful, ... total` line and **no `ERROR` lines** before it.

### Common errors

| Error you see | Likely cause | Fix |
|---|---|---|
| `ERR_PNPM_UNSUPPORTED_NODE_VERSION` | Node too old | Install Node `>=22.16` (see §1) |
| `Cannot find module '@n8n/api-types'` during build | Build ran out of order; usually a stale cache | `pnpm clean && pnpm build` |
| TypeScript errors mentioning `packages/cli/src/executions/__tests__/...` | ⚠ Known issue: 3 typecheck errors in test files. See §13. | The runtime build still succeeds; only `pnpm --filter n8n typecheck` is affected. |
| `EMFILE: too many open files` on macOS | File-descriptor limit too low | `ulimit -n 8192` before retrying |
| `ENOSPC` | Out of disk space | Free ~12 GB |

> **Tip:** If the build seems stuck on a single package for >5 minutes, in another terminal run `tail -f /tmp/build.log` to see live progress.

---

## 3. Start the server

```bash
cd /Users/filipetavares/git/n8n
pnpm dev
```

This starts everything via Turbo:

- The backend (`packages/cli`) on `http://localhost:5678`
- The editor frontend (`packages/frontend/editor-ui`) with hot reload
- Worker / queue processes if configured

### Expected output

You'll see a wall of colored log lines from each workspace. The signal you want is:

```
[n8n]   Editor is now accessible via:
[n8n]   http://localhost:5678
```

…printed somewhere in the noise. The first time it boots, there will be database migration logs — that's normal.

### Log noise tips

- Filter for the n8n core process only: `pnpm dev 2>&1 | grep --line-buffered '^\[n8n\]'`
- Keep this terminal open. The whole guide assumes the server stays running.

### Common errors

| Symptom | Cause | Fix |
|---|---|---|
| Port `5678` already in use | Another n8n instance running | Kill it (`lsof -i :5678` then `kill <pid>`) |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres mode configured but DB not running | Default is SQLite — only happens if your env vars point at Postgres |
| Hot-reload loops on every save | Watchers got into a loop | Stop with `Ctrl+C`, run again |

---

## 4. Mint a Personal Access Token (PAT)

The CLI, SDK, and `curl` examples in this guide all authenticate with an n8n API key.

1. Open `http://localhost:5678` in a browser.
2. **First-time setup:** the very first user becomes the instance owner. Fill in email + password and finish the setup wizard.
3. Click your avatar (bottom-left) → **Settings** → **n8n API**.
4. Click **Create an API key**. Give it a label like `hub-testing`.
5. Copy the key (it's only shown once). Export it to your shell:

```bash
export N8N_PAT="<paste-key-here>"
```

> ⚠ **Auth scope caveat.** The PAT works against `/api/v1/`. For the new `/rest/` endpoints, n8n historically uses JWT session cookies rather than the API key. The hackathon endpoints **should** accept the API key (the controller is decorated with `@GlobalScope('node:execute')` which the API-key auth middleware honors), but if you hit a `401` in §5, see the troubleshooting block there. This is also called out in the production handoff (`docs/superpowers/specs/2026-05-10-n8n-hub-production-handoff.md` §5 item 4).

---

## 5. Smoke test the endpoint via curl

This is the **single most important command in the guide.** If this returns success, the entire backend pipeline (auth → scope check → workflow synthesis → engine → execution write → response) is working.

```bash
curl -sS -X POST http://localhost:5678/rest/executions/node \
  -H "X-N8N-API-KEY: $N8N_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "nodeType": "n8n-nodes-base.set",
    "parameters": {
      "values": {
        "string": [{"name": "hello", "value": "world"}]
      }
    }
  }' | jq
```

### Expected response

```json
{
  "executionId": "abcdef-1234-...",
  "status": "success",
  "output": [
    { "hello": "world" }
  ],
  "executionUrl": "http://localhost:5678/executions/abcdef-1234-..."
}
```

✅ A `200` status code with that JSON shape means the endpoint, scope decorator, single-node mode, and execution engine are all wired correctly.

### Troubleshooting

| HTTP code | What it means | What to do |
|---|---|---|
| `401 Unauthorized` | API key wrong, missing, or `/rest/` rejects it | (1) Re-check `echo $N8N_PAT` is set. (2) Try `Authorization: Bearer $N8N_PAT` instead of `X-N8N-API-KEY`. (3) If both fail, the endpoint may require JWT cookie auth — see §13. |
| `403 Forbidden` | Scope `node:execute` missing | Owner accounts should have all scopes; if you're testing on a member account, retest as owner. |
| `400 Bad Request` | Validation failed on the `nodeType` or `parameters` shape | Inspect `err.message` — typically a missing required field or typo in `nodeType` |
| `404 Not Found` | Endpoint not registered / wrong branch | Confirm `git rev-parse --abbrev-ref HEAD` says `feat/n8n-hub-hackathon` and the server has fully started |
| `500 Internal Server Error` | Engine failure | Check the `pnpm dev` log for the stacktrace |

### Verify the OAuth scope expansion

The MCP OAuth metadata endpoint advertises the new scopes:

```bash
curl -s http://localhost:5678/.well-known/oauth-authorization-server | jq .scopes_supported
```

Expected:

```json
[
  "tool:listWorkflows",
  "tool:getWorkflowDetails",
  "node:execute",
  "credential:read",
  "tool:search"
]
```

✅ All five scopes present — including the three new ones (`node:execute`, `credential:read`, `tool:search`) — confirms the `SUPPORTED_SCOPES` array was extended (see `mcp-oauth-service.ts`).

---

## 6. Test the REST parity endpoints

These two endpoints mirror the MCP `n8n_search_tools` and `n8n_get_node_schema` tool semantics but over plain HTTP.

### Node search

```bash
curl -s 'http://localhost:5678/rest/nodes/search?q=slack' \
  -H "X-N8N-API-KEY: $N8N_PAT" | jq
```

Expected response shape:

```json
{
  "results": [
    {
      "nodeId": "n8n-nodes-base.slack",
      "displayName": "Slack",
      "description": "Consume Slack API"
    },
    {
      "nodeId": "n8n-nodes-base.slackTrigger",
      "displayName": "Slack Trigger",
      "description": "Starts the workflow when Slack events occur"
    }
  ]
}
```

✅ At least one result, each with `nodeId`, `displayName`, `description`.

### Filter to credential-requiring nodes only

```bash
curl -s 'http://localhost:5678/rest/nodes/search?q=slack&hasCredential=true' \
  -H "X-N8N-API-KEY: $N8N_PAT" | jq '.results | length'
```

The count should be less than or equal to the unfiltered count. The Slack Trigger and Slack action both require credentials, so for `q=slack` both still appear.

### Get a node's full schema

```bash
curl -s 'http://localhost:5678/rest/nodes/n8n-nodes-base.slack' \
  -H "X-N8N-API-KEY: $N8N_PAT" | jq 'keys'
```

Expected: an object with keys like `nodeId`, `displayName`, `operations`, `credentials`, etc., where `operations` is an array of `{resource, operation, inputSchema}` tuples and `inputSchema` is JSON Schema.

> ⚠ **Known catalog shortcut:** `displayOptions` is not currently encoded in the JSON Schema (`allOf` / `if`/`then` not emitted) — agents see all fields and have to disambiguate by description. See production handoff §3 (Catalog & search).

---

## 7. Test the CLI

The CLI ships as `@n8n/cli` and has been on the repo for a while; the hackathon **added** four new commands.

### Build the CLI

```bash
cd /Users/filipetavares/git/n8n/packages/@n8n/cli
pnpm build
```

If you ran the top-level `pnpm build` in §2, this is already built. Re-running is idempotent and fast.

### Configure the CLI

```bash
./bin/n8n-cli.mjs login
```

Interactive prompts:

```
? n8n instance URL: http://localhost:5678
? API key: <paste your $N8N_PAT>
✓ Logged in successfully
```

This writes a config file to `~/.n8n-cli/config.json`. ⚠ The file is `mode 0644` (world-readable) — fine for local testing, but called out in the production handoff §3 as a security item.

### Verify login

```bash
./bin/n8n-cli.mjs --help
```

Expected: a list of topics — `workflow`, `execution`, `credential`, **`node`**, **`exec`**, etc. The bolded ones are new.

### Node search

```bash
./bin/n8n-cli.mjs node search slack
```

Expected output: a table with `nodeId`, `displayName`, `description` columns. Same data as §6's REST call, table-formatted.

Filter to credential-requiring nodes only:

```bash
./bin/n8n-cli.mjs node search slack --has-credential
```

### Get node details

```bash
./bin/n8n-cli.mjs node get n8n-nodes-base.slack
```

Expected: pretty-printed JSON of the node schema. Useful for discovering `resource` / `operation` discriminators before calling `exec run`.

### Execute a node — dry run first

The `exec run` command's first positional argument is a **tool id**, which can be either:

1. A bare node type (e.g. `n8n-nodes-base.set`) — the file's parser splits on `.` and dispatches accordingly.
2. A `resource.operation` tuple file (the CLI has a `parse-tool-id.ts` helper for this).

Try a dry run first to confirm validation:

```bash
./bin/n8n-cli.mjs exec run n8n-nodes-base.set \
  --param values='{"string":[{"name":"k","value":"v"}]}' \
  --dry-run
```

Expected: prints the request body that *would* be sent (`nodeType`, `parameters`, `dryRun: true`) without actually executing. ✅ No execution row is written.

### Execute for real

```bash
./bin/n8n-cli.mjs exec run n8n-nodes-base.set \
  --param values='{"string":[{"name":"k","value":"v"}]}'
```

Expected output:

```
✓ Execution succeeded
  executionId: <uuid>
  executionUrl: http://localhost:5678/executions/<uuid>
  output: [{ "k": "v" }]
```

Click the URL to confirm in the UI (see §11).

### Execute with a credential

If the node needs a credential, first list available ones:

```bash
./bin/n8n-cli.mjs credential list
./bin/n8n-cli.mjs credential list --node-type slack
```

Then:

```bash
./bin/n8n-cli.mjs exec run n8n-nodes-base.slack \
  --credential <cred-id> \
  --param resource=message \
  --param operation=post \
  --param channel='#test' \
  --param text='Hello from Hub'
```

> ⚠ Slack and similar nodes will require valid OAuth credentials to be set up in the n8n UI first. Without those credentials, the execution will fail at the engine level (you'll get an `executionId` back, but `status: error`).

### Common CLI errors

| Symptom | Fix |
|---|---|
| `Error: not logged in` | Run `n8n-cli login` again — config file may be missing |
| `Error: 401` from a node command | API key invalid / expired — re-mint and `login` again |
| `--param k=v` fails to parse | Wrap complex JSON in single quotes; escape internal double quotes |

---

## 8. Test the SDK

The SDK is a tiny package that exposes a Proxy-based client. Code-style:

```ts
n8n.<service>.<resource>.<operation>(args)
```

…where the Proxy translates the call into `POST /rest/executions/node` under the hood.

### Build the SDK

```bash
cd /Users/filipetavares/git/n8n/packages/@n8n/sdk
pnpm build
```

(Idempotent if you did the top-level build in §2.)

### Run the bundled demo

The package ships an example at `packages/@n8n/sdk/examples/oneonone-prep.ts`. It needs Linear, GitHub, and Slack credentials to exist in your instance (named `cred_linear`, `cred_github`, `cred_slack`). If you don't have them, the script will fail at the first call — that's expected and still proves the SDK wiring works (you'll see a 4xx error, not a transport / import error).

```bash
cd /Users/filipetavares/git/n8n/packages/@n8n/sdk
N8N_URL=http://localhost:5678 N8N_TOKEN=$N8N_PAT npx tsx examples/oneonone-prep.ts
```

⚠ Without those credentials configured, expect a `Credential not found` error. Set up the three OAuth credentials in the n8n UI (Credentials → New) and re-run if you want a clean run.

### Write your own minimal SDK test

Save the following to `/tmp/test-sdk.ts`:

```ts
import { createClient } from '@n8n/sdk';

const n8n = createClient({
  baseUrl: process.env.N8N_URL!,
  token: process.env.N8N_TOKEN!,
});

(async () => {
  // Untyped (no codegen yet — Task 18 deferred)
  const result = await (n8n as any).set.json({
    values: { string: [{ name: 'hello', value: 'world' }] },
  });
  console.log('Result:', JSON.stringify(result, null, 2));
})().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
```

Then link the SDK package and run:

```bash
cd /Users/filipetavares/git/n8n/packages/@n8n/sdk && pnpm link --global
cd /tmp && pnpm link --global @n8n/sdk
N8N_URL=http://localhost:5678 N8N_TOKEN=$N8N_PAT npx tsx test-sdk.ts
```

Expected:

```
Result: {
  "executionId": "...",
  "status": "success",
  "output": [
    { "hello": "world" }
  ],
  "executionUrl": "..."
}
```

✅ The Proxy-style call (`n8n.set.json({...})`) was correctly dispatched as `POST /rest/executions/node` with `nodeType: "n8n-nodes-base.set"`.

### Alternative: import directly from source (no link needed)

If the global link fails, you can import from the source tree directly:

```ts
import { createClient } from '/Users/filipetavares/git/n8n/packages/@n8n/sdk/src';
```

> ⚠ **SDK typing gap.** The SDK currently has no codegen (Task 18 was deferred). You'll need `as any` to call arbitrary services from TypeScript. The proxy works at runtime regardless.

---

## 9. Set up MCP in Claude Desktop

The hackathon registered three new MCP tools — `n8n_search_tools`, `n8n_execute_tool`, `n8n_list_credentials` — on the existing OAuth-gated MCP server at `/mcp-server/http`.

### Edit the Claude Desktop config

**macOS path:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows path:** `%APPDATA%\Claude\claude_desktop_config.json`

Open it (create it if it doesn't exist) and add:

```json
{
  "mcpServers": {
    "n8n-local": {
      "url": "http://localhost:5678/mcp-server/http",
      "type": "http"
    }
  }
}
```

> ⚠ If you already have other `mcpServers` configured, merge — don't replace.

### Restart Claude Desktop

Quit (Cmd+Q on macOS), then reopen. Open a new conversation and ask:

> What tools do you have for n8n?

✅ You should see references to `n8n_search_tools`, `n8n_execute_tool`, `n8n_list_credentials` in the response (plus the pre-existing tools like `n8n_list_workflows`, `n8n_get_workflow_details`).

### OAuth consent flow

The first tool call triggers the OAuth grant flow:

1. Claude Desktop tries to invoke a tool.
2. A browser tab pops open at `http://localhost:5678/mcp-oauth/authorize?...`.
3. Sign in to n8n (if you're not already logged in in that browser).
4. Approve the consent screen. ⚠ The consent UI does **not** yet break the scopes down per tool — it's a single allow/deny. That's a documented production gap (handoff §3).
5. Tokens are persisted by Claude Desktop. Subsequent calls don't re-prompt.

### Try prompts

| Prompt | Expected tool invocation |
|---|---|
| "Search n8n for Slack tools" | `n8n_search_tools` with `query: "slack"` |
| "List my n8n credentials" | `n8n_list_credentials` |
| "Run the Set node with key=hello value=world" | `n8n_execute_tool` with `nodeType: "n8n-nodes-base.set"` |
| "What are the available operations on the Slack node?" | `n8n_search_tools` then `n8n_get_node_schema` |

When invoking a tool, Claude Desktop shows the request and response inline — useful for verifying the actual JSON over the wire.

### Troubleshooting

| Symptom | Fix |
|---|---|
| Claude Desktop says "no connection to n8n-local" | Confirm `pnpm dev` is running and `curl http://localhost:5678/mcp-server/http` returns something (even a 405 is fine — it means the server is up) |
| OAuth redirect loops | Clear Claude Desktop's MCP cache: quit, delete `~/Library/Application Support/Claude/mcp/` (or equivalent), restart |
| Tool invocation returns "permission denied" | The consent flow may have failed silently — sign out and back in to n8n, then retry |

---

## 10. Test the MCP server with the inspector (alternative to Claude Desktop)

If you don't have Claude Desktop, or want a more diagnostic view, use the official MCP inspector.

```bash
npx @modelcontextprotocol/inspector http://localhost:5678/mcp-server/http
```

The inspector opens at a local URL (it prints the URL to stdout — usually `http://localhost:6274` or similar).

Steps:

1. The inspector page shows a "Connect" button. Click it.
2. The browser will redirect through the OAuth consent flow.
3. Approve and return to the inspector.
4. The left pane lists all registered tools — confirm the three new ones are there.
5. Click each tool to see its input schema and invoke it interactively.

✅ Each tool listed, schema documented, manual invocation returns a sensible response.

---

## 11. View executions in the UI

Navigate to `http://localhost:5678/workflow/executions` (the executions list — this is the canonical route for n8n's "all executions" view).

For each single-node execution you triggered above (via curl, CLI, SDK, or MCP), expect:

- **List row headline:** the node id, e.g. `n8n-nodes-base.set`
- **Sub-line:** `via <caller>` — where `<caller>` is the kind+name from the request (e.g. `via cli/n8n-cli`)
- **Status badge:** Success / Error / Running, same as workflow executions

✅ Visual confirmation that `GlobalExecutionsListItem.vue` is correctly distinguishing single-node executions.

### Click into a row

⚠ **Known gap (Phase 5.3):** The detail view (`ExecutionPreview.vue`) was **not** updated as part of the hackathon. Clicking a single-node row may:

- Render an empty panel
- Show an error toast (if the loader assumes `workflowId` exists)
- 500 on the API call

Workaround: fetch the execution via the API to see its data:

```bash
EXEC_ID=<copy from the URL or list>
curl -s "http://localhost:5678/rest/executions/$EXEC_ID" \
  -H "X-N8N-API-KEY: $N8N_PAT" | jq
```

This will return the full execution JSON including the node's input/output.

---

## 12. Verify caller attribution

Caller metadata is persisted to `ExecutionMetadata` and read back into the `ExecutionSummary` DTO.

### Hit the endpoint with a `caller` field

```bash
curl -sS -X POST http://localhost:5678/rest/executions/node \
  -H "X-N8N-API-KEY: $N8N_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "nodeType": "n8n-nodes-base.set",
    "parameters": {
      "values": {"string": [{"name": "k", "value": "v"}]}
    },
    "caller": {
      "kind": "cli",
      "name": "manual-curl-test",
      "clientId": "local"
    }
  }' | jq
```

Note the returned `executionId`.

### Fetch the execution and verify caller is round-tripped

```bash
EXEC_ID=<paste-from-above>
curl -s "http://localhost:5678/rest/executions/$EXEC_ID" \
  -H "X-N8N-API-KEY: $N8N_PAT" | jq .caller
```

Expected:

```json
{
  "kind": "cli",
  "name": "manual-curl-test",
  "clientId": "local"
}
```

✅ Caller round-tripped through `ExecutionMetadata` and back into the summary DTO.

The list-page sub-line ("via cli/manual-curl-test") in §11 should match this caller's `kind`/`name`.

---

## 13. Known gaps + workarounds

Cross-referenced with `docs/superpowers/specs/2026-05-10-n8n-hub-production-handoff.md`. None of these are blockers for hackathon testing, but you'll see their effects.

| # | Gap | Effect during testing | Workaround |
|---|---|---|---|
| 1 | **Detail view for single-node executions not built** (Phase 5.3) | Clicking a single-node row in the executions list renders an empty panel or 500s | Use `curl /rest/executions/<id>` to fetch raw data |
| 2 | **CLI may use API-key while `/rest/` expects JWT cookie** | If you see `401` from §5 despite a valid PAT, this is why | Try `Authorization: Bearer $N8N_PAT` instead of `X-N8N-API-KEY`. If still 401, sign in via the UI, open DevTools → Application → Cookies, copy the `n8n-auth` cookie and use `-H "Cookie: n8n-auth=<value>"` instead |
| 3 | **No per-tool MCP scope enforcement** | All authenticated MCP sessions get all three new tools regardless of which scopes they were granted | Not a runtime blocker — just means scope advertising is informational only |
| 4 | **SDK has no codegen — types are loose** | TypeScript needs `as any` to call arbitrary services | Use the runtime Proxy regardless; ignore TS errors or cast as the demo does |
| 5 | **No mode-filter chip on executions list** | Single-node executions mix in with workflow executions | Eyeball / sort by date |
| 6 | **No payload size cap** | Very large outputs can stall the connection | Don't test with multi-MB payloads for now |
| 7 | **`searchNodesStructured` drops `categories` and `score`** | Search results don't include category labels | Cross-reference with the node catalog UI |
| 8 | **`displayOptions` ignored in node schemas** | Agents see all parameter fields, no conditional show/hide | Read the field descriptions carefully |
| 9 | **`loadOptions`, `resourceLocator`, `resourceMapper` not in schema** | These dynamic-option fields are absent or simplified | Pass raw IDs / names — the engine resolves them |
| 10 | **3 typecheck errors in `packages/cli` test files** | `pnpm --filter n8n typecheck` fails; tests still pass | Ignored for runtime testing; documented in production handoff §2 |
| 11 | **CLI tokens unencrypted** at `~/.n8n-cli/config.json` (`0644`) | None for testing; security note only | Will be moved to OS keychain in production |
| 12 | **No rate limiting on `POST /executions/node`** | None for one user; could be an issue under load | Don't load-test |

For the full ranked list and effort estimates, see production handoff §5.

---

## 14. Cleanup

When you're done testing:

```bash
# 1. Stop the dev server
# In the pnpm dev terminal, hit Ctrl+C. Wait for "Stopping..." to finish.

# 2. (Optional) clear the CLI config
rm -f ~/.n8n-cli/config.json

# 3. (Optional) remove the MCP server config from Claude Desktop
#    Edit ~/Library/Application Support/Claude/claude_desktop_config.json
#    and remove the "n8n-local" entry

# 4. (Optional) restore master if you want to go back
git stash                  # or commit the branch first if you made changes
git checkout master
```

### To revoke the API key

In the n8n UI: **Settings → n8n API → Delete** next to the key you minted in §4.

### To purge test executions from the DB

```bash
# SQLite (default):
sqlite3 ~/.n8n/database.sqlite "DELETE FROM execution_entity WHERE mode IN ('single-node', 'manual');"
```

⚠ Don't do this if you've used the instance for anything else you care about. Per-instance scope.

---

## Appendix A: Full smoke-test one-liner

If you only have 60 seconds and want to confirm the system is alive, this is the call:

```bash
curl -sS -X POST http://localhost:5678/rest/executions/node \
  -H "X-N8N-API-KEY: $N8N_PAT" \
  -H "Content-Type: application/json" \
  -d '{"nodeType":"n8n-nodes-base.set","parameters":{"values":{"string":[{"name":"hello","value":"world"}]}}}' \
  | jq '.status, .output'
```

Expected:

```
"success"
[ { "hello": "world" } ]
```

If both lines print, the entire pipeline — auth, scope check, single-node mode, workflow synthesis, engine, response, JSON shape — is operating correctly.

---

## Appendix B: Reference files

| Purpose | File |
|---|---|
| Production handoff (gaps, side-effects, plan compliance) | `/Users/filipetavares/git/n8n/docs/superpowers/specs/2026-05-10-n8n-hub-production-handoff.md` |
| Original implementation plan | `/Users/filipetavares/git/n8n/docs/superpowers/specs/2026-05-10-n8n-hub-implementation-plan.md` |
| Design doc | `/Users/filipetavares/git/n8n/docs/superpowers/specs/2026-05-10-n8n-hub-design.md` |
| CLI source | `/Users/filipetavares/git/n8n/packages/@n8n/cli/src/commands/` |
| CLI binary | `/Users/filipetavares/git/n8n/packages/@n8n/cli/bin/n8n-cli.mjs` |
| SDK source | `/Users/filipetavares/git/n8n/packages/@n8n/sdk/src/` |
| SDK demo | `/Users/filipetavares/git/n8n/packages/@n8n/sdk/examples/oneonone-prep.ts` |
| Endpoint service | `/Users/filipetavares/git/n8n/packages/cli/src/executions/execute-node.service.ts` |
| MCP tool registrations | `/Users/filipetavares/git/n8n/packages/cli/src/modules/mcp/tools/` |
| MCP OAuth service | `/Users/filipetavares/git/n8n/packages/cli/src/modules/mcp/mcp-oauth-service.ts` |
| Executions list UI | `/Users/filipetavares/git/n8n/packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.vue` |

---

*Generated 2026-05-10 as part of the n8n Hub hackathon deliverable. Companion to the production handoff doc; that's the "what's broken" view, this is the "how do I verify it works" view.*
