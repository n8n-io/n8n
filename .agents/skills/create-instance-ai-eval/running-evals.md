# Running evals

A run does four things: **build** (Instance AI builds the workflow on a live
instance) → **Phase 1** (generate mock data hints) → **Phase 2** (execute with
external HTTP requests LLM-mocked) → **verify** (LLM grades `successCriteria`).
This file describes what the harness offers and how to point it at an instance;
the [README](../../../packages/@n8n/instance-ai/evaluations/README.md) has the
exhaustive flag list.

## What a run needs

- **A running n8n instance with Instance AI enabled**, reachable over HTTP. The
  eval is a client — it logs in and drives the normal build flow. Point it with
  `--base-url` (defaults to `http://localhost:5678`); use whatever instance you
  already run for Instance AI dev.
- **A login** — the eval signs in as an existing user. Set the eval login env
  vars to a user your instance has; the model and most settings have defaults
  that a working Instance AI dev setup already provides.
- **A working sandbox** — the build executes its workflow-build code in a
  sandbox, so the instance must have one configured (see below).
- **A model key for the eval helper** — mock generation, verification,
  user-proxy, and the expectations judge call an Anthropic-capable model.

## The sandbox

The build runs generated code in a sandbox that must be enabled and reachable on
the instance. How it's provisioned is a property of your instance, not the eval:

- **Via the hosted proxy** — the instance vends sandbox access (and can vend the
  model) through the AI-assistant proxy.
- **Direct** — the instance talks to the sandbox provider (Daytona) and the model
  provider with your own keys, bypassing the proxy.

Either path has a ceiling a parallel run can hit — the **proxy** enforces a
per-tenant quota, and going **direct** shifts that ceiling to your model
provider's rate limits. Neither is "the" setting; pick per what you're running
and lower `--concurrency` if you hit a limit. Configuration specifics live in the
instance's Instance AI config and the README's environment-variables section.

## Run modes

| Mode | How | Produces |
|---|---|---|
| **Direct loop** | no `LANGSMITH_API_KEY` | `eval-results.json` + HTML report locally |
| **LangSmith** | `LANGSMITH_API_KEY` set | also records an experiment and auto-compares against the baseline |
| **Prebuilt** | `--prebuilt-workflows <manifest>` | skips the build; verifies existing workflows (score MCP/hand-built cohorts on the same verifier) |

Narrow any run with `--filter <slug>` (filename substring, comma = OR),
`--tier <name>`, and `--exclude`. `--keep-workflows` leaves built workflows for
inspection; `--iterations N` runs each case N times for pass@k / pass^k.

## Configuration & secrets

The harness reads its configuration from environment variables — how you supply
them is up to you. A common setup is a gitignored local env file loaded with
`dotenvx` (`.env.eval.example` is a starting template), but any env mechanism
works. The pieces, regardless of how they're loaded:

- the **model key** the eval helper uses (mock-gen / verifier / user-proxy /
  judge);
- the **login** the eval signs in with;
- optionally `LANGSMITH_API_KEY` to record experiments and compare against a
  baseline (note: setting this locally also writes your run into the shared
  dataset — leave it unset for throwaway exploration);
- optionally `CONTEXT7_API_KEY` to improve mock realism for less-common services.

Describe-what-you-need, not a fixed recipe: on a dev instance you already use,
the login and model are usually already set, and you only add the eval-specific
keys.

## Parallel lanes

The **build** is the slow step and is capped at **4 concurrent builds per
instance**, so throughput scales with the number of instances, not just
`--concurrency`. Two ways to fan out:

- **`scripts/run-eval-lanes.sh`** spins up N lanes as **docker containers**,
  seeds a user on each, and runs the eval with the base-URLs wired together.
  It needs the **local image built first** (`INCLUDE_TEST_CONTROLLER=true pnpm
  build:docker`); pass `--build` to (re)build it, which you must do after any
  code change (the image is a snapshot). Extra eval args pass through after `--`.

  ```bash
  # from packages/@n8n/instance-ai/
  ./scripts/run-eval-lanes.sh --instance-count 5 --tier pr
  ./scripts/run-eval-lanes.sh --instance-count 3 --build -- --filter contact-form
  ```

- **Comma-separated `--base-url`** to fan across instances you're already
  running; a work-stealing allocator dispatches each build to a free lane.

  ```bash
  pnpm eval:instance-ai --base-url http://localhost:5678,http://localhost:6678
  ```

## Tiers

Each case declares a `datasets` array (default `["full"]`) — free-form logical
groupings, propagated to LangSmith as example splits so `--tier <name>` maps to a
server-side filter. The two that matter for CI:

- **`full`** — every case; nightly / full-suite runs.
- **`pr`** — curated thin set (~6 cases) for the PR gate: high baseline
  reliability + capability diversity.

Other values group cases logically (e.g. `behaviour` for conversation-behaviour
cases, `seeded` for transient `seedThread` cases kept out of CI). Add a case to a
tier by putting the value in its `datasets` array and re-syncing. **Only promote
to `pr` after `--iterations 5+` shows it's reliably green** — a flaky case in the
gate poisons it.

## Baselines & regression

When `LANGSMITH_API_KEY` is set, every run auto-compares against the most recent
experiment named `instance-ai-baseline-*` and writes `eval-pr-comment.md`.
Regression tiers are computed statistically (`comparison/statistics.ts`) so
small-N PR runs don't flag noise. Comparison is best-effort — it never fails a
run.

**Refresh the baseline** explicitly (no auto-refresh), on `master`, with high N
for low noise:

```bash
# with your env loaded and LANGSMITH_API_KEY set, from packages/@n8n/instance-ai/
pnpm eval:instance-ai --experiment-name instance-ai-baseline --iterations 10
```

LangSmith appends a random suffix; the most-recently-started `instance-ai-baseline-*`
becomes the next comparison target. In CI, the same is a workflow dispatch:

```bash
gh workflow run ci-instance-ai-evals.yml -f experiment-name=instance-ai-baseline -f iterations=10
gh workflow run ci-instance-ai-evals.yml -f pr=<number>   # re-run evals against a PR's head
```

An isolated cohort (e.g. MCP) must override **both** `--dataset` and
`--baseline-prefix` — overriding one still touches shared Instance AI data (the
CLI warns).

## Reading the result

The `workflow-eval-report.html` in the run's `.data/` dir is the fastest
debugger — full transcript, per-node traces, intercepted requests + mock
responses, and the verifier's reasoning. `eval-results.json` is the
machine-readable companion. (See the SKILL's "Outputs of a run".)
