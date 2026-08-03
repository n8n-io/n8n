# Instance AI load test

Measures **backend memory per concurrent user** when several people build
workflows at the same time.

Each virtual user is a *real* n8n account with its own `n8n-auth` cookie, its own
thread and its own SSE connection. That matters: the existing Playwright
benchmark driver fakes concurrency with multiple browser tabs of a single user,
so per-user server state (`LocalGatewayRegistry.userGateways`, browser sessions,
thread ownership) never multiplies. Here it does.

```bash
cd packages/@n8n/instance-ai

# Free: provision users, open SSE, sample memory, clean up. Sends no messages.
pnpm loadtest:instance-ai --dry-run --users 5

# Real conversations against the real Anthropic API (costs money).
pnpm loadtest:instance-ai --users 5 --ramp 5s

# The actual deliverable: fit memory against concurrency.
pnpm loadtest:instance-ai --sweep 1,5,10

pnpm loadtest:instance-ai --help
```

## Target setup

The module is **off by default** and there is no license gate. Minimum viable
local target:

```bash
N8N_ENABLED_MODULES=instance-ai \
N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6 \
N8N_INSTANCE_AI_MODEL_API_KEY=sk-ant-... \
N8N_METRICS=true \
E2E_TESTS=true \
NODE_OPTIONS=--expose-gc \
N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED=true \
  pnpm --filter n8n start
```

Then create an owner (`POST /rest/owner/setup`) if the instance is fresh. The
harness logs in as `N8N_EVAL_EMAIL` / `N8N_EVAL_PASSWORD`, falling back to
`nathan@n8n.io` / `PlaywrightTest123` — the same defaults the eval CLI uses, so a
machine already set up for evals needs no extra configuration.

### Gotchas that will silently ruin a measurement

1. **DB settings override env vars.** `InstanceAiSettingsService.loadFromDb()`
   applies the `instanceAi.settings` DB key over the env config — including
   `sandboxEnabled`, `sandboxProvider` and the model credential. Check the
   startup log before trusting your env.
2. **`N8N_INSTANCE_AI_BUILDER_SANDBOX_TTL_MS=0` for measurement runs.** The
   15-minute default keeps completed builder sandboxes warm, which pollutes
   `post-cleanup` and reads as a leak.
3. **`N8N_INSTANCE_AI_SANDBOX_EPHEMERAL` is Daytona-only** — `ephemeral` is only
   read inside the `provider === 'daytona'` branch of `getSandboxConfigFromEnv`
   (`instance-ai-sandbox.service.ts`). With the default `n8n-sandbox` provider
   it is a no-op.
4. **The build cases need a sandbox.** With `N8N_INSTANCE_AI_SANDBOX_ENABLED=false`
   the workflow builder is unavailable, so the building cases degrade to chat and
   the numbers under-represent real usage. Set a real provider
   (`N8N_SANDBOX_SERVICE_URL`, or Daytona creds) for a representative run.
5. **Single main, no workers.** Instance AI does not support queue/multi-main
   execution; the e2e suite pins `mains: 1, workers: 0`. Don't load-test a
   scaled topology.
6. **`N8N_METRICS` defaults to false**, and leave
   `N8N_METRICS_INCLUDE_DEFAULT_METRICS` at its `true` default — that's where the
   heap/RSS series come from.
7. MFA enforcement off, SSO off (SSO blocks invitation accept entirely).

## Build cases

Each user runs one case as a multi-turn conversation (build → tweak → ask),
assigned round-robin by user index. `--cases a,b` narrows the set.

| Case | Shape |
| --- | --- |
| `hourly-ip-check` | Schedule → HTTP Request → Set |
| `webhook-sample-api` | Webhook → Code → Respond to Webhook |
| `health-ping` | Schedule → Code → Set |
| `read-only` | Control group: questions only, never builds |

Cases deliberately differ from each other and each names its workflow uniquely
per user. Identical prompts across users would hit Anthropic's prompt cache,
understating both cost and per-thread history size — the things being measured.
`read-only` exists so sandbox/builder cost can be attributed by comparison.

## What it measures

Six phases, with a comparable reading at each boundary:

| Phase | State | Answers |
| --- | --- | --- |
| `baseline` | nothing connected | fixed cost |
| `threads-open` | N users, threads created, SSE held, **no messages** | per-user idle-connection cost |
| `load` | ramped multi-turn conversations | peak per-user cost |
| `post-load-idle` | conversations done, **SSE still open, threads alive** | **what a finished thread still retains** |
| `sse-closed` | streams aborted, threads alive | cost of a live SSE connection |
| `post-cleanup` | threads deleted | residual leak |

Derived for both heap and RSS. **RSS is the headline** — it's what OOM-kills a
pod; heap is the diagnostic. Negative deltas are reported, not clamped: a
negative per-user cost means the reading didn't settle, and hiding it would
manufacture confidence.

`nonHeapOverheadMB` (`rss - heapTotal`) is tracked because native growth doesn't
show in the JS heap — each Brotli compressor retains ~8.6 MB, which is why SSE
bypasses compression via the `stripBrotli` middleware.

### Read the validity block before the numbers

- **`max concurrent runs observed` must reach N.** If it didn't, runs were
  serialized (usually 409s — one active run per thread) and no per-user number
  is trustworthy.
- **`driver RSS growth` should be a small fraction of server growth.** The
  harness prunes SSE events hard, but it measures itself rather than assuming;
  `driverConfounded` flags a run where it can't be ruled out.
- **`cleanup failures` invalidate the residual-leak number.**
- **A single concurrency level cannot separate fixed from marginal cost.** Use
  `--sweep`; the slope is the answer and `r²` says whether to believe it.

### Stabilization

Chosen by capability probe, never by flag:

- **`forced-gc`** (local, `E2E_TESTS=true` + `--expose-gc`): force GC via
  `POST /rest/e2e/gc`, then poll until the heap stops moving.
- **`min-of-window`** (cloud, no e2e endpoints): sample a quiet window and take
  the trough. V8's sawtooth means the minimum of a quiet window tracks the live
  set closely. RSS uses the median, since RSS doesn't shrink promptly.

## Cloud targets

`NODE_ENV=production` removes the entire e2e controller, so no forced GC, no
heap snapshots and no `/test/idle` probe — the harness detects this and switches
to `min-of-window` automatically.

Other production differences it handles:

- **Rate limits are live.** All N invitations go in **one**
  `POST /rest/invitations` request (limit 10/window), and accepts run at
  concurrency 4 (limit 100/min).
- **Users are reused by default.** Identities are deterministic
  (`loadtest-u000@n8n.local`), so a second run issues zero invitations. Use
  `--users-file` for quota-capped plans or SSO-only instances, where invitation
  accept is refused outright.
- **Instance AI settings are managed** by the AI-service proxy, so env vars are
  ignored; the harness reports what it observes rather than asserting.

**Before a cloud run, confirm `/metrics` is reachable.** It's registered
unauthenticated on the root express app, so any sane ingress blocks it
externally and Prometheus scrapes it in-cluster. Options: allowlist your IP
temporarily, or run with `--no-metrics` (which still records exact per-phase ISO
timestamps to the JSON so the numbers can be read off Grafana afterwards).

## Cost control

All default-on. `--max-turns` is the hard ceiling on LLM calls per user and thus
the primary lever; `--max-cost-usd` is the real backstop, driven off the
`n8n_instance_ai_cost_usd_total` delta.

| Flag | Default |
| --- | --- |
| `--max-turns` | 4 (counting the opening message) |
| `--max-cost-usd` | 5 — aborts and cancels every run on breach |
| `--max-wall-clock` | 20m — aborts, then still measures and cleans up |
| `--timeout-ms` | 600000 per conversation |
| `--dry-run` | free; every phase except `load` |

`Ctrl-C` cancels runs, still cleans up, and still writes a partial report — an
interrupt must not leave orphan threads and warm sandboxes behind.

## Output

- `<output>/loadtest-<ts>.json` — full report (phase readings, derived block,
  per-user results, sweep fit, phase timestamps). Passwords are stripped.
- `<output>/loadtest-<ts>-n<N>-samples.jsonl` — every raw sample, appended as
  taken, so an aborted run still yields data.
- stdout — human summary.

Default output dir is `./.data/load-test` (gitignored).

## How it's built

Mostly glue over the eval harness, which already had a working client for this
API surface:

| Reused | For |
| --- | --- |
| `evaluations/clients/n8n-client.ts` | auth, threads, chat, cleanup — one instance per user |
| `evaluations/clients/sse-client.ts` | `consumeSseStream` |
| `evaluations/harness/chat-loop.ts` | `runMultiTurnConversation`, HITL auto-approval |

Zero new dependencies.

`event-log.ts` is the one non-obvious piece. `chat-loop.ts` accumulates *every*
SSE event including `text-delta`, which is right for eval transcripts but would
make the driver balloon at 50 users. So we keep exactly what chat-loop reads
(`run-start`/`run-finish` counters, `agent-spawned`/`agent-completed` ids, and
`confirmation-request` **verbatim**, because auto-approval consumes its whole
payload) and project everything else down to a bounded summary. Counters are
bumped for every event before any drop, so the stats stay a faithful record of
wire traffic even though the array does not. `chat-loop.ts` itself is imported
unmodified — it just gets handed a smaller array.

The `read-only` case and the `min-of-window` tier are also worth knowing about
before changing anything here; both exist to keep the measurement honest rather
than to add features.
