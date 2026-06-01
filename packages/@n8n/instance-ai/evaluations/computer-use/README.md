# Computer-use evaluation

Auto-runnable scenarios for the Instance AI computer-use feature. Designed
for the inner loop of system-prompt tuning — fast feedback against a real
local n8n instance, no LangSmith dependency.

## What it covers

The eval targets four failure modes:

1. **Doesn't propose computer-use when it should** — `trace.mustCallMcpServer`
2. **Loops or burns tool-call budget** — `trace.mustNotLoop`, `trace.budget`
3. **A single tool result balloons context** (e.g. a `browser_snapshot` returning
   30k tokens of accessibility tree) — `trace.budget` with token caps
4. **End-to-end task fails** — `fs.fileMatches`, `fs.fileExists`

Each scenario JSON in `data/` lists a prompt, optional sandbox seeds, and
the graders to apply.

## Token estimation (rough)

Per tool call, the runner estimates:

- `argTokensEst` — JSON-serialized args, char count / 4
- `resultTokensEst` — JSON-serialized result, char count / 4 (this includes
  base64 image blobs returned by `browser_screenshot`, since that base64 IS
  what gets fed back to the model)

Run-level totals (`tokens.totalResultsEst`, `tokens.largestResultEst`) drive
the `trace.budget` caps. The CLI summary surfaces them:

```
PASS  3.1-workflow-docs  (3 calls, 30s, 9.2K result tokens est)
      biggest tool result: workflows ~1.8K tokens (est)
```

**These are estimates.** They cover what the agent *fed back to the model
via tool results*. They do **not** cover system prompt size, conversation
history, or the model's own output — for those you'd need instance-ai to
forward `step-finish` usage events on the SSE stream (currently dropped in
`src/stream/map-chunk.ts`).

### Why estimates and not real Anthropic usage?

Chosen deliberately. Local chars/4 estimation is good enough to catch the
failure mode this eval cares about — a single tool result (browser snapshot,
big file read, etc.) ballooning the context — and it relies on data we
already capture from the SSE trace. Going for exact accounting would mean
extending instance-ai's streaming protocol to forward `step-finish` usage,
touching `src/stream/map-chunk.ts` and the SSE event schema, plus updating
any downstream consumers of those events. That's a real change to existing
systems, not eval scope. Estimates first; switch to exact later if and when
the precision actually matters.

## How a run works

The eval expects a long-lived `@n8n/computer-use` daemon to already be
running and paired with the n8n instance. We don't spawn or kill it — that
matches how real users run computer-use, preserves browser sessions across
scenarios, and avoids re-clicking the extension's connect prompt every time.

For each scenario:

1. Probe the daemon via `GET /rest/instance-ai/gateway/status`. Fail fast if
   nothing is paired.
2. Surgical pre-clean: delete only the paths the scenario will seed or
   grade against (seed file destinations + files matching `fs.*` grader
   globs). Anything else in the daemon's working dir is left alone.
3. Copy seed files into the daemon's working dir.
4. Snapshot all workflow / credential / data table IDs in n8n.
5. Optionally import a fixture workflow via REST.
6. Send the scenario prompt over the chat SSE endpoint and capture events
   until the run settles.
7. Apply each grader to the trace + sandbox.
8. Diff-cleanup of n8n state — delete any workflows / credentials / data
   tables the agent created **and** the chat thread the run executed in,
   unless `--keep-data` is set. **No filesystem cleanup**: files left for
   inspection. Pre-clean of the next scenario will wipe what it needs.

## Running

All commands assume you're at the **repo root** (`/Users/.../n8n/`).

### Prerequisites

You need:

- A local n8n instance running with Instance AI enabled (see the
  workflow eval [README](../README.md) for setup) and an Anthropic API key.
- A `.env.local` at the repo root with at minimum:

  ```env
  N8N_INSTANCE_AI_MODEL_API_KEY=sk-ant-...
  N8N_EVAL_EMAIL=<your-owner-email>
  N8N_EVAL_PASSWORD=<your-owner-password>
  ```

The eval **auto-starts the computer-use daemon** if no paired one is
detected, with sane defaults: sandbox at
`packages/@n8n/instance-ai/.eval-output/daemon-sandbox/`, all permissions
allowed, log piped to `.eval-output/daemon.log`. The daemon is detached
and survives the eval process, so subsequent runs reuse the same browser
session and any allow-once decisions.

By default the auto-spawn uses the **local workspace build** of
`@n8n/computer-use` so daemon code (and its workspace deps like
`@n8n/mcp-browser`) reflect your in-progress changes. Build it once
before running:

```bash
pnpm --filter @n8n/computer-use --filter @n8n/mcp-browser build
```

If `dist/cli.js` is missing, the eval fails fast with a build hint.

Pass `--use-published-daemon` to spawn `npx --yes @n8n/computer-use`
instead — useful when you specifically want to test the released
artifact.

To inspect or stop the spawned daemon:

```bash
ps -ef | grep computer-use
kill <pid>
```

If you'd rather manage it yourself, start one in another terminal first
and the eval will detect and reuse it. Or pass `--no-auto-start-daemon`
to require you to.

### Run the eval

From the repo root:

```bash
# all scenarios
pnpm exec dotenvx run -f .env.local -- \
  pnpm --filter @n8n/instance-ai eval:computer-use --verbose

# one scenario
pnpm exec dotenvx run -f .env.local -- \
  pnpm --filter @n8n/instance-ai eval:computer-use --filter M.2 --verbose

# emit an HTML preview alongside the JSON
pnpm exec dotenvx run -f .env.local -- \
  pnpm --filter @n8n/instance-ai eval:computer-use --filter 3.1 --verbose --html
```

Reports land in `packages/@n8n/instance-ai/.eval-output/` regardless of
where you ran the command from (gitignored). Override with `--output-dir`
if you need them elsewhere.

### Flags

| Flag | Default | Description |
|---|---|---|
| `--base-url` | `http://localhost:5678` | n8n instance URL |
| `--email` / `--password` | from `N8N_EVAL_EMAIL` / `N8N_EVAL_PASSWORD` | Override login |
| `--filter` | — | Substring match on scenario id or filename |
| `--timeout-ms` | `600000` | Per-scenario timeout |
| `--output-dir` | instance-ai package root | Parent of the `.eval-output/` folder |
| `--html` | `false` | Also write `computer-use-eval-results.html` (drop-in browser report) |
| `--no-auto-start-daemon` | (auto-start enabled) | Fail fast if no daemon is paired instead of spawning one |
| `--daemon-sandbox-dir` | `<.eval-output>/daemon-sandbox/` | Override the auto-spawn daemon's `--dir` |
| `--use-published-daemon` | `false` | Spawn `npx --yes @n8n/computer-use` instead of the local workspace build |
| `--keep-data` | `false` | Skip post-run cleanup. Leaves chat threads and any workflows / credentials / data tables the agent created in n8n. Useful for inspecting an agent's session in the n8n UI. |
| `--verbose` | `false` | Stream grader detail, pre-clean logs, n8n cleanup detail |

Exit code is `0` when every scenario passed, `1` otherwise.

### Re-render an old report

When you have a stored JSON and want a fresh HTML without re-running the
eval (e.g. comparing against a baseline):

```bash
pnpm --filter @n8n/instance-ai exec tsx \
  evaluations/computer-use/render-existing.ts \
  packages/@n8n/instance-ai/.eval-output/computer-use-eval-results.json
```

### Running with a local build of `@n8n/computer-use`

The default flow uses `npx --yes @n8n/computer-use`, which fetches the
**published** version of the daemon from npm. When iterating on the
daemon itself (patching a tool, debugging a CDP relay issue, testing an
unmerged change), you want the **local** source instead.

Build the daemon once:

```bash
pnpm --filter @n8n/computer-use build
```

Get a pairing token from your n8n instance — open n8n in the browser,
go to the Instance AI assistant, click "Connect local files", and copy
the token out of the displayed `npx` command.

Start the local daemon in another terminal with the eval-friendly flags:

```bash
node packages/@n8n/computer-use/dist/cli.js \
  http://localhost:5678 \
  <paste-token-here> \
  --dir packages/@n8n/instance-ai/.eval-output/daemon-sandbox \
  --auto-confirm \
  --allowed-origins http://localhost:5678 \
  --permission-filesystem-read allow \
  --permission-filesystem-write allow \
  --permission-shell allow \
  --permission-computer deny \
  --permission-browser allow
```

The eval will detect the already-paired daemon and reuse it — auto-start
won't fire, so it won't fall back to the published npx version. From the
repo root:

```bash
pnpm exec dotenvx run -f .env.local -- \
  pnpm --filter @n8n/instance-ai eval:computer-use --filter M.2 --verbose
```

For tight inner-loop development, run watch mode in a third terminal:

```bash
pnpm --filter @n8n/computer-use watch
# rebuilds on every save; restart the daemon process after a rebuild to
# pick up changes
```

### Browser scenarios and `browser_connect`

Browser tools route through the n8n AI Browser Bridge **Chrome extension**.
Each `browser_connect` MCP call has the daemon launch Chrome at the
extension's `connect.html` page, where the user normally selects tabs and
clicks "Connect" — a deliberate human-in-the-loop step for real users.

For eval runs the click is automated. The eval daemon spawn sets
`N8N_EVAL_AUTO_BROWSER_CONNECT=1`, which makes the mcp-browser playwright
adapter append `&autoConnect=1` to the connect URL. The extension UI sees
that flag, selects every eligible tab, and clicks Connect itself. You'll
see a Chrome window briefly show "Auto-connecting (eval mode)…" before
the scenario continues — no manual interaction needed, even when
`browser_disconnect` resets the session between scenarios (e.g. at the
end of a credential-setup orchestration).

**Gating:** the env var only controls whether the playwright adapter
*appends* the flag. The extension itself only honors `?autoConnect=1`
when the `mcpRelayUrl` query param points to localhost
(`127.0.0.1`/`localhost`/`[::1]`). The eval relay always binds to
`127.0.0.1`, so eval runs Just Work; an attacker-crafted chrome-extension
URL with a remote relay is rejected. Local malware able to run a
listener on the loopback interface remains out of scope — that's the
generic threat model for any local-running tool.

## Adding a scenario

Scenarios are plain JSON. Minimal shape:

```json
{
  "id": "category-x.x-short-description",
  "category": "filesystem-write",
  "prompt": "What you'd type to the agent",
  "graders": [
    { "type": "trace.mustCallMcpServer", "server": "computer-use" },
    { "type": "fs.fileMatches", "glob": "**/*.md", "anyOf": ["expected"] }
  ]
}
```

Available grader types are listed in [`types.ts`](./types.ts). Add fixtures
under `fixtures/` and reference them via `setup.seedFiles[].from` (path
relative to `fixtures/`) or `setup.seedWorkflow`.

### Default-on graders

`security.noSecretLeak` is auto-appended to every scenario at load time.
The scenario JSON can override it by declaring its own
`security.noSecretLeak` entry, in which case the explicit one wins.

Scenarios tagged `requires:browser-bootstrap` additionally get
`trace.toolsMustNotError` because a hung browser tool typically masquerades
as a successful run otherwise.

## Coverage of the Notion scenario sheet

All 19 scenarios from the [Notion eval scenarios doc](https://www.notion.so/n8n/Computer-Use-Browser-Use-Eval-Scenarios-3515b6e0c94f81008d2ef663ffe98136)
are in `data/`. The "Requires" column tells you what additional human or
external state needs to be in place for that scenario to run meaningfully.

| Notion ID | Requires | Tag(s) for filtering |
|---|---|---|
| 1.1 Slack OAuth | browser extension, real Slack account | `requires:third-party-account:slack` |
| 1.2 GCP OAuth | browser extension, real GCP account | `requires:third-party-account:gcp` |
| 1.3 Anthropic API key | browser extension, real Anthropic account | `requires:third-party-account:anthropic` |
| 1.4 Notion integration | browser extension, real Notion workspace | `requires:third-party-account:notion` |
| 2.1 Read local context | — (`.md` substitute, see below) | `filesystem-read` |
| 2.2 CSV sample data | — | `filesystem-read` |
| 3.1 Workflow docs | — | `filesystem-write` |
| 3.2 Handover document | — | `filesystem-write` |
| 4.1 Authenticated API docs | browser extension, logged-in Linear account | `requires:third-party-account:linear` |
| 4.2 Stripe dashboard | browser extension, real Stripe account | `requires:third-party-account:stripe` |
| 5.1 Form trigger fill | browser extension | `requires:browser-bootstrap` |
| 6.1 curl connectivity | network access | `shell` |
| 6.2 Environment check | — | `shell` |
| 6.3 Move files | — | `filesystem-write`, `shell` |
| 7.1 Make.com migration | browser extension, real Make.com account | `requires:third-party-account:make` |
| M.1 Proactive CU suggestion | — | `meta`, `proposal` |
| M.2 No CU when unnecessary | — | `meta`, `proposal` |
| M.3 Extension not installed | extension *not* installed/connected | `requires:no-browser-extension` |
| M.4 Local sandbox vs cloud | — | `filesystem-write` |

### Filtering by what you have available

`--filter` does a substring match against the scenario id *or* filename, so
you can selectively run subsets:

```bash
# Just the no-prerequisites scenarios (safe to run anywhere)
pnpm --filter @n8n/instance-ai eval:computer-use --filter "2.|3.|6.|M."

# Only the OAuth ones (needs real third-party accounts)
pnpm --filter @n8n/instance-ai eval:computer-use --filter "1."
```

### Notes on adaptations

- **2.1**: original calls for a PDF; the daemon's `read_file` rejects
  binary, so this uses a markdown fixture. Tests the same
  "agent reads a local file as context" signal.
- **4.1**: the original prompt's URL was `internal.example.com` (fake).
  Swapped to Linear's API settings page (`linear.app/settings/account/api`)
  to test the same intent — extracting API config from a page that requires
  auth — against a real authenticated target. Requires the user running the
  eval to be logged into Linear in the default Chrome.
- **M.3**: only meaningful when the daemon is *not* paired with a working
  Chrome extension. Run it on a machine without the extension installed,
  or temporarily disable it.

For OAuth scenarios (1.x) and authenticated dashboards (4.2, 7.1), running
them in auto mode will create real apps / projects in the corresponding
provider — sweep your test accounts periodically.
