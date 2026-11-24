# Managed Agents - Self-Hosted Sandboxes

With `config.type: "self_hosted"`, the **agent loop stays on Anthropic's orchestration layer** but **tool execution moves to infrastructure you control** - bash, file ops, and code run inside your container, so filesystem contents and the sandbox's network egress never leave your environment. (`web_search` / `web_fetch` are the exception: they run on Anthropic's servers in both environment types - turn them off or restrict them with `allowed_domains` / `blocked_domains` in the agent toolset, `shared/managed-agents-tools.md` § Agent Toolset and § Web search & web fetch settings.) Tool inputs/outputs still flow to Anthropic's control plane so the model can see results; the agent's skills and the contents of any attached memory stores are stored by Anthropic and copied into your sandbox for the session (memory changes sync back - see § Memory stores). Contrast with `config.type: "cloud"`, where Anthropic runs the container. Connectivity is **outbound-only**: your worker long-polls Anthropic's work queue; Anthropic never dials into your network.

## Flow

```
1. Create environment:      config: {type: "self_hosted"}        -> env_...
2. Generate environment key (Console, on the environment page)   -> sk-ant-oat01-...  as ANTHROPIC_ENVIRONMENT_KEY
3. Run a worker:            EnvironmentWorker.run()  or  ant beta:worker poll
4. Sessions reference       environment_id=env_... exactly as for cloud
```

## Create the environment

```python
client = anthropic.Anthropic()

environment = client.beta.environments.create(
    name="self-hosted", config={"type": "self_hosted"}
)
```

`{"type": "self_hosted"}` is the entire config - there are no pool, capacity, or networking sub-fields; you control those on your side.

## Run a worker - SDK (primary path)

`EnvironmentWorker` wraps the poll -> dispatch -> tool-execute loop. `.run()` is the always-on loop (loops until cancelled). `.handle_item()` / `.handleItem()` / `.HandleItem()` services **one already-claimed** work item without polling - IDs fall back to `ANTHROPIC_WORK_ID` / `ANTHROPIC_ENVIRONMENT_ID` / `ANTHROPIC_SESSION_ID`, the key to the worker's own `environment_key` and then `ANTHROPIC_ENVIRONMENT_KEY`, and the per-session secret to `ANTHROPIC_WORK_SECRET`, so inside an `ant beta:worker poll --on-work` container it needs no arguments. It ignores (and force-stops) non-session work items itself. There is no `run_one()`; claiming is done by `.run()` or by the mid-level poller (below).

**Python - always-on:**

```python
import asyncio
import contextlib
import os
import signal
from anthropic import AsyncAnthropic
from anthropic.lib.environments import EnvironmentWorker


async def main() -> None:
    environment_key = os.environ["ANTHROPIC_ENVIRONMENT_KEY"]
    environment_id = os.environ["ANTHROPIC_ENVIRONMENT_ID"]
    async with AsyncAnthropic(auth_token=environment_key) as client:
        worker = EnvironmentWorker(
            client,
            environment_id=environment_id,
            environment_key=environment_key,
            workdir="/workspace",
        )
        task = asyncio.create_task(worker.run())
        # Cancel the task (don't kill the process): the worker stops its in-flight
        # work item and uploads changed memory files before exiting.
        loop = asyncio.get_running_loop()
        for signum in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(signum, task.cancel)
        with contextlib.suppress(asyncio.CancelledError):
            await task


asyncio.run(main())
```

**TypeScript - always-on:**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { EnvironmentWorker } from "@anthropic-ai/sdk/helpers/beta/environments";

const environmentKey = process.env.ANTHROPIC_ENVIRONMENT_KEY!;
const environmentId = process.env.ANTHROPIC_ENVIRONMENT_ID!;
const client = new Anthropic({ authToken: environmentKey });
const ctrl = new AbortController();
process.once("SIGTERM", () => ctrl.abort());
process.once("SIGINT", () => ctrl.abort());

await new EnvironmentWorker({
  client,
  environmentId,
  environmentKey,
  workdir: "/workspace",
  signal: ctrl.signal
}).run();
```

**Customizing tools.** `EnvironmentWorker` runs the built-in toolset by default. To add or replace tools, use `AgentToolContext(workdir=, client=, session_id=)` with `beta_agent_toolset(env)` / `betaAgentToolset(env)` and pass the resulting tools to the lower-level `tool_runner()`. Skills attached to the agent are downloaded into `{workdir}/skills/<name>/` before tool calls begin (`AgentToolContext` handles this when given `client` and `session_id`). Downloaded skill files are marked executable automatically by the CLI and SDK; if you implement skills download yourself, you set permissions.

> **Runtime deps:** the SDK helpers require `/bin/bash` at that exact path (not consulted via `PATH`). The TypeScript SDK additionally requires `unzip` and `tar` on `PATH` and Node.js 22+; Python and Go use their standard libraries for archive extraction. Memory stores additionally need a POSIX host (Linux or macOS - not Windows, the worker opens memory files with `O_NOFOLLOW`) with a writable `/mnt/memory` - see § Memory stores.

**File-tool confinement.** `AgentToolContext` confines `read`/`write`/`edit`/`glob`/`grep` to the working directory plus `allowed_roots` (`allowedRoots` / `AllowedRoots`); `write` and `edit` also refuse paths under `read_only_roots` (`readOnlyRoots` / `ReadOnlyRoots`). `EnvironmentWorker` adds the session's memory store directories to these lists itself. This is a guardrail for the file tools only - it does **not** constrain `bash`. The old `unrestricted_paths` option is no longer accepted (passing it raises); add directories to `allowed_roots` instead.

## Run a worker - `ant` CLI (fixed tools)

The `ant` CLI ships a worker with the fixed built-in toolset (`bash`, `read`, `write`, `edit`, `glob`, `grep`). Install per `shared/anthropic-cli.md`, then:

```sh
export ANTHROPIC_ENVIRONMENT_KEY=sk-ant-oat01-...
ant beta:worker poll --environment-id env_... --workdir /workspace
```

- `--workdir` is the directory tools operate in (default `.`); tool calls are sandboxed to it.
- `--environment-key` overrides the env var.
- `--on-work <script>` runs your script per work item (e.g. to spin a fresh container per session - see Container orchestration below).
- `--unrestricted-paths`, `--max-idle` (default `60s`), `--log-format` - see `ant beta:worker poll --help`.
- Flags fall back to env vars (`ANTHROPIC_ENVIRONMENT_ID`, `ANTHROPIC_ENVIRONMENT_KEY`).
- Exits cleanly on SIGTERM/SIGINT after draining in-flight work.
- **Fixed toolset** - for custom tools, use the SDK worker above.
- **Does not mount memory stores.** A session that attaches one still runs, but the agent finds nothing at the store's `/mnt/memory/<store-name>/` directory and nothing syncs back. To combine the CLI poller with memory stores, keep `ant beta:worker poll --on-work` on the host and run the **SDK** worker (`EnvironmentWorker.handle_item()`) inside the per-session sandbox - see § Memory stores -> Sandbox-per-session.

Inside an `--on-work` container, run `ant beta:worker run --workdir <dir>` as the entrypoint (or the SDK worker, if the session needs memory stores).

## Webhook-driven wake (instead of always-on)

Register a webhook for `session.status_run_started` (see `shared/managed-agents-webhooks.md`), verify the delivery, then **drain** the queue with the poller (`drain=True` stops when it's empty; `block_ms=None` is non-blocking; `auto_stop=False` because `handle_item` force-stops the item itself) and hand each claimed item to `handle_item()`. **Don't `await` the drain inside the HTTP handler** - a session run outlives the webhook delivery timeout, so acknowledge the delivery and run the drain as a background task (`asyncio.create_task` / a detached promise / a goroutine off `context.Background()`), keeping the process alive until it finishes:

```python
import asyncio
import os
import anthropic

environment_key = os.environ["ANTHROPIC_ENVIRONMENT_KEY"]
environment_id = os.environ["ANTHROPIC_ENVIRONMENT_ID"]
client = anthropic.AsyncAnthropic(
    auth_token=environment_key,
)  # reads ANTHROPIC_WEBHOOK_SIGNING_KEY from env for webhooks.unwrap()


async def handle(raw: bytes, headers: dict[str, str]) -> dict:
    event = client.beta.webhooks.unwrap(raw.decode(), headers=headers)
    if event.data.type != "session.status_run_started":
        return {"status": "ignored"}
    asyncio.create_task(drain())  # keep a reference if your framework may GC it
    return {"status": "accepted"}


async def drain() -> None:
    async for work in client.beta.environments.work.poller(
        environment_id=environment_id,
        environment_key=environment_key,
        block_ms=None,
        reclaim_older_than_ms=2000,
        drain=True,
        auto_stop=False,
    ):
        await client.beta.environments.work.worker(workdir="/workspace").handle_item(
            work_id=work.id,
            environment_id=environment_id,
            session_id=work.data.id,
            environment_key=environment_key,
            work_secret=work.secret,  # lets the worker mount the session's memory stores
        )
```

TypeScript: same shape with `client.beta.webhooks.unwrap(body, {headers})`, `client.beta.environments.work.poller({environmentId, environmentKey, blockMs: null, reclaimOlderThanMs: 2000, drain: true, autoStop: false})`, and `client.beta.environments.work.worker({workdir}).handleItem({workId, environmentId, sessionId, environmentKey, workSecret: work.secret})`. Go: no `RunOne` convenience either - `environments.NewWorkPoller(ctx, client, environments.WorkPollerOptions{EnvironmentID, EnvironmentKey, BlockMs: param.Null[int64](), ReclaimOlderThanMs: param.NewOpt[int64](2000), Drain: true, AutoStop: param.NewOpt(false)})`, then `worker.HandleItem(ctx, environments.HandleItemOptions{WorkID: item.ID, EnvironmentID: item.EnvironmentID, SessionID: item.Data.ID, EnvironmentKey, WorkSecret: item.Secret})` per `poller.Next()` item, in a goroutine off `context.Background()`. Always pass the work item's `secret` through, or sessions with memory stores fail at claim time. `handle_item` skips non-session work items itself, so the drain loop needs no `work.data.type` check.

## Container orchestration (mid-level)

`EnvironmentWorker.run()` polls and executes tools in the same process. To run each session in its **own** container, use the mid-level poller in a thin orchestrator - Python `client.beta.environments.work.poller(environment_id=, environment_key=, drain=, block_ms=, reclaim_older_than_ms=, auto_stop=)`; TypeScript `new WorkPoller({client, environmentId, environmentKey, autoStop})` from `@anthropic-ai/sdk/helpers/beta/environments` - and, for each yielded `work` item, start a fresh container with these env vars injected, whose entrypoint runs `ant beta:worker run` or an `EnvironmentWorker(...).handle_item()` (required if the session attaches memory stores). `block_ms` is 1-999 (or `None` for non-blocking); `reclaim_older_than_ms` re-claims items leased to a dead worker; `drain` stops once the queue is empty; `auto_stop` posts a stop signal after the iterator exits (set `False` when the launched container owns the stop call). Go: `environments.NewWorkPoller(ctx, client, environments.WorkPollerOptions{EnvironmentID, EnvironmentKey, BlockMs, ReclaimOlderThanMs, Drain, AutoStop: param.NewOpt(false)})` with `poller.Next()` / `poller.Current()` / `poller.Err()`.

| Env var | Value |
|---|---|
| `ANTHROPIC_SESSION_ID` | `work.data.id` |
| `ANTHROPIC_WORK_ID` | `work.id` |
| `ANTHROPIC_ENVIRONMENT_ID` | `work.environment_id` |
| `ANTHROPIC_ENVIRONMENT_KEY` | pass through |
| `ANTHROPIC_BASE_URL` | pass through |
| `ANTHROPIC_WORK_SECRET` | `work.secret` - the per-session credential the worker inside needs to mount memory stores. `ant beta:worker poll --on-work` does **not** set it for the spawned script; read it from the work-item JSON on stdin (`jq -r '.secret // empty'`) and pass it in. Only into the sandbox serving that session; never log it. |

Skip items where `work.data.type != "session"` when you dispatch containers yourself (`handle_item` does this check for you).

## Memory stores

Sessions on a self-hosted environment attach memory stores exactly like cloud sessions - `resources=[{"type": "memory_store", "memory_store_id": ..., "access": ...}]` at session create, up to 8 per session (see `shared/managed-agents-memory.md`). The difference is *who materializes them*: on cloud, Anthropic mounts a live FUSE filesystem; on self-hosted, the **SDK worker** (`EnvironmentWorker`, or its `handle_item()` / `handleItem()` / `HandleItem()`) downloads a working copy and syncs it. Requires the Python, TypeScript, or Go SDK; the `ant` CLI worker and the C#/Java/PHP/Ruby SDKs don't mount stores. Not available on Claude Platform on AWS.

**What the worker does** when it claims a work item whose session has stores attached:

1. Downloads each store to its mount path under `/mnt/memory/` - derived from the store's name, not a settable field (e.g. `/mnt/memory/user-preferences/` for a store named "User Preferences"); the same path cloud sessions use, and the session's system prompt describes it to the agent. Authenticates with the work item's per-session `secret`.
2. Adds those directories to the file tools' `allowed_roots`, and `access: "read_only"` stores to `read_only_roots`, so the agent uses the ordinary `read`/`write`/`edit`/`glob`/`grep` tools on memories.
3. Reconciles after tool calls, at most once per sync interval (default 15 s): remote changes are written to disk, files the agent changed are uploaded.
4. On session end: final sync, flushes pending uploads for up to 30 s, removes the directories. A worker that is *cancelled* mid-session skips the final sync but still uploads changed files and removes the directories; a worker that is *killed* runs no teardown at all.

The store on Anthropic's side remains the source of truth - memory versions, redaction, and Console viewing/editing work as for cloud sessions, and the agent's memory reads/writes appear in the event stream as ordinary tool events. Because sync is interval-based, a change written by one self-hosted session is visible to another running session only after both have synced (typically well under a minute); cloud sessions see each other's changes almost immediately. Each store directory holds a marker file `.anthropic-memory-store` - leave it alone; the worker won't sync a directory whose marker is missing or altered.

**Prepare the host.** POSIX (Linux/macOS) only; a case-sensitive filesystem is recommended. Before starting the worker:

```bash
sudo mkdir -p /mnt/memory && sudo chown "$USER" /mnt/memory
```

Do **not** create the per-store directories yourself - the worker creates each store's directory when a session starts, **refuses the work item if something already exists at that path**, and removes it at session end. Two rules follow: (a) two sessions can't mount the same store on one host simultaneously (they need the same path) - give each session its own sandbox; (b) stop workers gracefully. `EnvironmentWorker` installs no signal handlers: wire SIGTERM/SIGINT to cancellation yourself (abort the `signal` in TypeScript, cancel the context in Go, cancel the task running `run()` / `handle_item()` in Python), send SIGTERM, and allow >= 30 s before any hard kill. If a worker is killed before teardown, remove the leftover directory under `/mnt/memory/` before the next session that attaches that store - unsynced edits in it are lost.

**Sandbox-per-session** (the pattern from § Container orchestration) satisfies rule (a) automatically. Keep `ant beta:worker poll --on-work` (or the SDK poller) on the host; build the per-session image around the SDK worker instead of `ant beta:worker run` - its entrypoint constructs `EnvironmentWorker` and calls `handle_item()`, which reads the session/work/environment IDs from the `ANTHROPIC_*` vars and the per-session secret from `ANTHROPIC_WORK_SECRET` (or pass `work_secret=` / `workSecret` / `WorkSecret` explicitly). `--on-work` does not set `ANTHROPIC_WORK_SECRET` for the spawn script, so read it from the work-item JSON on stdin:

```bash
#!/bin/bash
# spawn.sh - called once per claimed work item; the work item arrives as JSON on stdin
ANTHROPIC_WORK_SECRET="$(jq -r '.secret // empty')"
export ANTHROPIC_WORK_SECRET
exec docker run --rm \
  -e ANTHROPIC_SESSION_ID -e ANTHROPIC_WORK_ID -e ANTHROPIC_ENVIRONMENT_ID \
  -e ANTHROPIC_ENVIRONMENT_KEY -e ANTHROPIC_BASE_URL -e ANTHROPIC_WORK_SECRET \
  my-sdk-worker-image
```

The per-session entrypoint is a few lines - no arguments needed, `handle_item()` reads the forwarded `ANTHROPIC_*` vars including `ANTHROPIC_WORK_SECRET`; wire signals to cancellation so a stopped container still uploads:

```python
import asyncio, contextlib, os, signal
from anthropic import AsyncAnthropic
from anthropic.lib.environments import EnvironmentWorker


async def main() -> None:
    async with AsyncAnthropic(auth_token=os.environ["ANTHROPIC_ENVIRONMENT_KEY"]) as client:
        task = asyncio.create_task(EnvironmentWorker(client, workdir="/workspace").handle_item())
        loop = asyncio.get_running_loop()
        for signum in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(signum, task.cancel)
        with contextlib.suppress(asyncio.CancelledError):
            await task


asyncio.run(main())
```

TypeScript: `new EnvironmentWorker({ client, workdir: "/workspace", signal: controller.signal }).handleItem()` with `process.once("SIGTERM"/"SIGINT", () => controller.abort())`. Go: `signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)` then `environments.NewEnvironmentWorker(client, environments.EnvironmentWorkerOptions{Workdir: "/workspace"}).HandleItem(ctx, environments.HandleItemOptions{})`.

The image needs a writable `/mnt/memory`; the memory directories need **not** be bind-mounted to the host - the worker uploads before the sandbox exits, and a discarded sandbox leaves nothing to clean up. Stop a container early with a signal the entrypoint turns into cancellation, not a kill, so that upload still runs.

**Configure sync** - two `EnvironmentWorker` options (constructor or `client.beta.environments.work.worker()` factory in Python; the options object in TypeScript; `environments.EnvironmentWorkerOptions` in Go):

| Option | Python / TypeScript / Go | Behavior |
|---|---|---|
| Sync interval | `memory_sync_interval` (seconds) / `memorySyncIntervalMs` (ms) / `MemorySyncInterval` (duration) | Default 15 s, minimum 5 s. Shorter narrows the stale window at the cost of more memory-store requests. `None` / `null` / negative duration **disables memory support entirely** - stores are neither downloaded nor synced, and a session with stores attached runs without them even though its system prompt still describes them. Only disable on workers whose sessions never attach stores. While enabled, a work item that arrives without a `secret` for a session with stores **fails** rather than running memory-less. |
| Delete propagation | `memory_sync_deletes` / `memorySyncDeletes` / `MemorySyncDeletes` | `"enabled"` (default - deletes from the store once a later sync confirms the file is still gone), `"log_only"` (same checks, only logs what it would delete - use to audit before trusting `enabled`), `"disabled"` (never deletes from the store). Go: `environments.MemorySyncDeletesEnabled` (zero value) / `LogOnly` / `Disabled`. Uploads/downloads are unaffected. |

For example, sync every 10 s and only *log* would-be deletes: Python `EnvironmentWorker(client, environment_id=..., environment_key=..., workdir="/workspace", memory_sync_interval=10, memory_sync_deletes="log_only")`; TypeScript `new EnvironmentWorker({ client, environmentId, environmentKey, workdir: "/workspace", memorySyncIntervalMs: 10_000, memorySyncDeletes: "log_only" })`; Go `environments.EnvironmentWorkerOptions{..., MemorySyncInterval: 10 * time.Second, MemorySyncDeletes: environments.MemorySyncDeletesLogOnly}`.

**Read-only stores and conflicts.** For `access: "read_only"`, `write`/`edit` refuse changes under the directory (the only memory errors that reach the agent, as tool errors) and nothing uploads; the memory-store endpoints also reject writes made with the session's `secret`. `bash` edits aren't blocked locally - they never sync and the next remote change overwrites them. Conflicts resolve **in favor of the store**: if the agent changes a file that also changed remotely since the last sync, the worker keeps the store's version at the next sync, overwrites the local file, and logs a warning - `write`/`edit` still succeed and no error reaches the agent; it can re-read and re-apply.

**Troubleshooting.** Mount and background-sync failures are *logged*, not reported to the session. If a store can't be mounted at claim time the worker fails the work item - the session emits no error event and sits `idle` (`requires_action` stop reason).

| Log line / symptom | Cause | Fix |
|---|---|---|
| `the work item carried no sessions token` (Go: `ErrSessionMemoryNoToken`), work item fails | The per-session `secret` didn't reach the worker - memory on self-hosted isn't enabled for your org, or your spawn script didn't forward it | Forward `ANTHROPIC_WORK_SECRET` into the sandbox. If the in-process worker (poll + run in one process) still logs this, contact support |
| `something already exists at the memory store's path` | Leftover directory from a killed worker | Remove the named directory (unsynced edits are lost) |
| `cannot create the memory store's folder` + `the worker host must make this mount path writable` | Worker user can't create dirs under `/mnt/memory` | `mkdir -p /mnt/memory && chown <worker-user> /mnt/memory` |
| Session `idle` with `requires_action`, no error event, shortly after a claim | Worker failed the work item on a mount error above | Fix the host, then send `user.interrupt` - the work is re-queued and the next claim retries the mount |

## Monitoring & control

These are **control-plane** calls - authenticate with `x-api-key` (not the environment key); `managed-agents-2026-04-01` beta header. **Call them from outside the worker host** - setting `ANTHROPIC_API_KEY` on the worker host exposes an organization-scoped credential to agent tool calls.

| SDK (`client.beta.environments.work.*`) | REST | CLI | Returns |
|---|---|---|---|
| `stats(environment_id)` | `GET /v1/environments/{id}/work/stats` | `ant beta:environments:work stats` | `{type:"work_queue_stats", depth, pending, oldest_queued_at, workers_polling}` |
| `stop(work_id, environment_id=)` | `POST /v1/environments/{id}/work/{work_id}/stop` | `ant beta:environments:work stop` | `work.state` |

## What changes vs `cloud`

| Concern | `cloud` | `self_hosted` |
|---|---|---|
| Container lifecycle, hardening, networking | Anthropic | **You** - run non-root, read-only rootfs, drop caps; egress is whatever your VPC/firewall allows - except `web_search` / `web_fetch`, which run on Anthropic's servers either way (turn them off or restrict them per tool with `allowed_domains` / `blocked_domains`) |
| `file` / `github_repository` resource mounting | Anthropic mounts into the container | **You** - pass pointers via `sessions.create(metadata={...})` and have your orchestrator fetch/clone before dispatch |
| `memory_store` resources | Mounted by Anthropic at `/mnt/memory/<name>/` (live FUSE mount) | **Supported via the SDK worker** (Python / TypeScript / Go `EnvironmentWorker`), which downloads each store to `/mnt/memory/<store-name>/` and syncs on an interval - see § Memory stores. Not mounted by the `ant` CLI worker; not available in the C#, Java, PHP, or Ruby SDKs. `memory_store` is the **only** resource type self-hosted environments accept - `file` / `github_repository` are still rejected with the 400 message "Environment env_... is a self-hosted environment. `resources` are not supported with self-hosted environments." (deployments targeting a self-hosted environment follow the same rule; the Console deployment form doesn't offer memory stores for them - use the API/SDK). |
| Vault `environment_variable` credentials | Supported (substituted at Anthropic-managed egress) | **Not yet supported** - egress is yours, so there's nowhere to substitute the secret. Use MCP credentials or a host-side custom tool (`shared/managed-agents-client-patterns.md` Pattern 9) |
| Built-in tools | Via `agent_toolset_20260401` | Supplied by your worker (`EnvironmentWorker` default / `beta_agent_toolset(env)` / `ant` CLI fixed set) |
| Skills download | Automatic | `EnvironmentWorker` / `AgentToolContext` fetch into `{workdir}/skills/` (needs `client` + `session_id`) |
| Claude Platform on AWS | Supported | Supported - the worker authenticates with AWS IAM (SigV4) or an AWS-Console-generated API key (Console-generated environment keys don't work against the AWS endpoint); attach the `AnthropicSelfHostedEnvironmentAccess` managed policy to the worker's principal. **Memory stores cannot be attached** to sessions on self-hosted environments there (rejected at session create); cloud environments attach them as usual. |
| SDK worker helpers | All SDKs | **Python, TypeScript, Go only** (`EnvironmentWorker` / poller not in Java, Ruby, PHP, or C#) - use one of those three or the `ant` CLI |

## Credentials

| Credential | Format | Scope |
|---|---|---|
| `ANTHROPIC_ENVIRONMENT_KEY` | `sk-ant-oat01-...` | One environment's work queue. Generate in Console ("Generate environment key"). Pass as `auth_token=` / `authToken` on the client **and** as `environment_key=` / `environmentKey` on `EnvironmentWorker`. Store in a secrets manager; rotate on exposure. |
| `ANTHROPIC_WEBHOOK_SIGNING_KEY` | `whsec_...` | Webhook signature verification (if using webhook-driven wake). The SDK reads this env var automatically for `client.beta.webhooks.unwrap()`. |
| Work-item `secret` (`ANTHROPIC_WORK_SECRET`) | per-session, issued by Anthropic on the claimed work item | Posts that session's events and reads/writes the memory stores attached to it. You don't generate it; the in-process worker picks it up from the work item, and in the sandbox-per-session pattern you forward it into the sandbox yourself (or pass `work_secret=` / `workSecret` / `WorkSecret` explicitly). Treat like the environment key: only into the sandbox serving that session, never in images, shared volumes, or logs. |

## Security - what you own

Container hardening; egress restriction for the sandbox (there is no default; the server-side `web_search` / `web_fetch` are governed only by the agent toolset: `enabled`, `allowed_domains` / `blocked_domains`); `ANTHROPIC_ENVIRONMENT_KEY` custody and rotation; one workspace + environment per trust boundary when running untrusted code; least-privilege for the tool process; log retention and redaction. **Anthropic cannot**: fast-revoke a leaked environment key, verify your image or supply chain, sandbox tool execution inside your container, or enforce retention after tool output reaches your infrastructure. **Memory stores** stay hosted by Anthropic (with version history), but the working copy under `/mnt/memory/` is yours for the session's duration: the worker deletes it on teardown, a killed worker leaves it behind, and permissions/isolation between sessions sharing a filesystem are your responsibility. A `read_only` store is protected from *upload*, not from local modification - `bash` can still change the local copy (later tool calls in that session read the changed copy until the store next changes that memory); disable `bash` or mount the path read-only if the agent must not alter even its local view. See the Self-Hosted Sandboxes Security page in `shared/live-sources.md` for the full checklist.
