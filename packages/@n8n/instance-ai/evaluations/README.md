# Workflow evaluation framework

Tests whether workflows built by Instance AI actually work by executing them with LLM-generated mock HTTP responses. No real credentials or external services are involved.

Main harnesses live here:

- **`eval:instance-ai`** — end-to-end build + mocked execution + LLM verification (drives a running n8n instance)
- **`eval:pairwise`** — pairwise-compatible builder run outputs (`summary.json`, `results.jsonl`, report/comparison CLI), now backed by the main orchestrator workflow eval path
- **`eval:discovery`** — orchestrator in-process, scored against required or forbidden tool/dispatch events (no n8n server)

Sections:

- [Running evals](#running-evals)
- [Regression detection](#regression-detection)
- [Running evals against pre-built workflows](#running-evals-against-pre-built-workflows)
- [Running discovery evals](#discovery-evals)
- [How the e2e harness works](#how-the-e2e-harness-works)

## Running evals

Each run:

1. **Build** — the test case conversation goes to Instance AI's orchestrator, which loads skills and builds a workflow.
2. **Phase 1** — the server analyzes the workflow and generates consistent mock data hints (one Sonnet call per scenario).
3. **Phase 2** — the workflow executes with every HTTP request intercepted and answered by an LLM using the node's configuration and API docs from Context7.
4. **Verify** — an LLM evaluates whether the scenario's success criteria were met and categorizes any failure by root cause (see [Failure categories](#failure-categories)).

### What gets mocked

- **Mocked nodes** — anything that makes HTTP requests (Gmail, Slack, Google Sheets, HTTP Request, Notion…). The request is intercepted before it leaves the process; an LLM generates the response.
- **Pinned nodes** — nodes that don't go through the HTTP layer (triggers/webhooks, LangChain/AI nodes, database nodes). They receive LLM-generated pin data.
- **Real nodes** — logic nodes (Code, Set, Merge, Filter, IF, Switch) execute on the mocked data.

~95% of node types are covered. See [Known limitations](#known-limitations) for the gaps.

### Binary / file scenarios

The mock layer synthesizes minimal-valid binary fixtures (PNG, JPEG, GIF, WebP, PDF, ZIP, GZIP, MP3, WAV, OGG/Opus, MP4, SVG, CSV/JSON/HTML/XML plaintext, octet-stream fallback) on every `type: "binary"` response, so file-download endpoints round-trip through `prepareBinaryData` with the correct `mimeType` / `fileExtension` / `fileType`. Multipart and raw-binary request bodies are redacted to part metadata (`name`, `filename`, `contentType`, `size`) before the LLM prompt so uploads never crash on JSON-serializing raw bytes. The LLM picks `type: "binary"` and the MIME, and the mock layer fills in the bytes.

Common upload flows (webhook → file upload to Slack/Telegram/S3) are also covered on the input side: the trigger pin data automatically includes a `binary` map when a downstream node references `$binary.<key>` or is a known binary consumer (`Extract from File`, `Read Binary File`, LangChain document loader).

## Quick start

You need an n8n instance running with Instance AI enabled, a seeded owner account, and an Anthropic API key. Two paths:

### Local (pnpm dev:ai)

`pnpm dev:ai` runs watch mode across `n8n`, `n8n-core`, and `@n8n/n8n-nodes-langchain` in parallel — the set you need when iterating on Instance AI or the eval framework.

1. **Create `.env.local`** at the repo root with at minimum:
   ```env
   N8N_INSTANCE_AI_MODEL_API_KEY=sk-ant-...
   N8N_EVAL_EMAIL=nathan@n8n.io
   N8N_EVAL_PASSWORD=PlaywrightTest123
   # Optional — see "Environment variables" for the full list
   LANGSMITH_API_KEY=...
   CONTEXT7_API_KEY=...
   ```

2. **Start the instance**:
   ```bash
   dotenvx run -f .env.local -- pnpm dev:ai
   ```

3. **Create the owner account**. First time only: open `http://localhost:5678`, sign up with the email/password from your `.env.local`. If you'd rather reset to a known state (useful after deleting the DB or between iterations), start the server with `E2E_TESTS=true` and `curl` the reset endpoint:
   ```bash
   E2E_TESTS=true dotenvx run -f .env.local -- pnpm dev:ai
   # then in another shell:
   curl -sf -X POST http://localhost:5678/rest/e2e/reset \
     -H "Content-Type: application/json" \
     -d '{"owner":{"email":"nathan@n8n.io","password":"PlaywrightTest123","firstName":"Eval","lastName":"Owner"},"admin":{"email":"admin@n8n.io","password":"PlaywrightTest123","firstName":"Admin","lastName":"User"},"members":[],"chat":{"email":"chat@n8n.io","password":"PlaywrightTest123","firstName":"Chat","lastName":"User"}}'
   ```

4. **Run evals** from `packages/@n8n/instance-ai/`:
   ```bash
   dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter contact-form --verbose
   ```

### Docker

Useful when you don't want a live watch process — e.g. reproducing a CI failure. The container starts empty, so owner creation is part of the flow:

```bash
# Build the image
INCLUDE_TEST_CONTROLLER=true pnpm build:docker

# Start a container (E2E_TESTS=true exposes /rest/e2e/reset)
docker run -d --name n8n-eval \
  -e E2E_TESTS=true \
  -e N8N_ENABLED_MODULES=instance-ai \
  -e N8N_AI_ENABLED=true \
  -e N8N_INSTANCE_AI_MODEL_API_KEY=your-key \
  -p 5678:5678 \
  n8nio/n8n:local

# Seed the owner
curl -sf -X POST http://localhost:5678/rest/e2e/reset -H "Content-Type: application/json" -d '{"owner":{"email":"nathan@n8n.io","password":"PlaywrightTest123","firstName":"Eval","lastName":"Owner"},"admin":{"email":"admin@n8n.io","password":"PlaywrightTest123","firstName":"Admin","lastName":"User"},"members":[],"chat":{"email":"chat@n8n.io","password":"PlaywrightTest123","firstName":"Chat","lastName":"User"}}'

# Run evals against it
pnpm eval:instance-ai --base-url http://localhost:5678 --verbose
```

## CLI reference

Invoke from `packages/@n8n/instance-ai/`:

```bash
# All test cases
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --verbose

# Single test case (filename substring match)
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter contact-form --verbose

# Keep built workflows for inspection after the run
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter contact-form --keep-workflows

# Multi-iteration for pass@k / pass^k metrics
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --iterations 3

# Workflow-builder reports over local workflow-builder regression fixtures
dotenvx run -f ../../../.env.local -- pnpm eval:workflow-builder --verbose

# Same fixtures through the generic pairwise-compatible runner
dotenvx run -f ../../../.env.local -- pnpm eval:pairwise --filter workflow-builder- --verbose
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--verbose` | `false` | Log build/execute/verify timing and SSE events |
| `--filter` | — | Filter test cases by filename substring. Comma-separated values mean OR (e.g. `contact-form,deduplication`) |
| `--exclude` | — | Skip test cases whose filename matches any of the substrings. Same comma-separated shape as `--filter`; applied after `--filter` |
| `--prebuilt-workflows` | — | Path to a JSON manifest mapping test-case slugs to existing workflow IDs. Skips the orchestrator build for matched test cases — see [Running evals against pre-built workflows](#running-evals-against-pre-built-workflows) |
| `--keep-workflows` | `false` | Don't delete built workflows after the run |
| `--base-url` | `http://localhost:5678` | n8n instance URL |
| `--email` | E2E test owner | Override login email (or `N8N_EVAL_EMAIL`) |
| `--password` | E2E test owner | Override login password (or `N8N_EVAL_PASSWORD`) |
| `--timeout-ms` | `900000` | Per-test-case timeout |
| `--output-dir` | cwd | Where to write `eval-results.json` |
| `--dataset` | `instance-ai-workflow-evals` | LangSmith dataset name |
| `--concurrency` | `16` | Max concurrent scenarios (builds are separately capped at 4) |
| `--experiment-name` | auto | LangSmith experiment prefix (defaults to `{branch}-{sha}` in CI or `local-{branch}-{sha}-dirty?` locally) |
| `--iterations` | `1` | Run each test case N times with fresh builds |

**pass@k / pass^k**: with `--iterations N`, each scenario runs N times. `pass@k` is the fraction of scenarios that passed *at least once*; `pass^k` is the fraction that passed *every* time. `pass@k` shows whether something is *possible*; `pass^k` shows whether it's *reliable*.

### Pairwise-compatible reporting

`pnpm eval:pairwise` keeps the historical pairwise CLI affordance and output
shape while building through Instance AI's main orchestrator. By default it reads
the `instance-ai-builder-from-plans` LangSmith dataset. Pass
`--filter workflow-builder-` to run the local workflow-builder regression
fixtures in `evaluations/data/workflows/`, or use `pnpm eval:workflow-builder`.

```bash
pnpm eval:workflow-builder --iterations 3 --output-dir .output/pairwise/local-workflow-builder
pnpm eval:pairwise:report --output-root .output/pairwise
pnpm eval:pairwise:compare --ee-dir ../ai-workflow-builder.ee/evaluations/.output/pairwise/<ts> --ia-dir .output/pairwise/local-workflow-builder --out .output/pairwise/comparison.html
```

### Outputs

Every run produces:

- **Console** — live progress, per-scenario pass/fail with `[failure_category]` tag, and a grouped summary.
- **`eval-results.json`** — structured results in `--output-dir` (or cwd). Consumed by the CI PR comment.
- **`.data/workflow-eval-report.html`** — self-contained debugging view with per-node execution traces, intercepted requests, mock responses, Phase 1 hints, verifier reasoning, and the per-built-workflow check rubric (see below).
- **LangSmith experiment** — only when `LANGSMITH_API_KEY` is set. See the caveat in [Environment variables](#environment-variables).

### Workflow checks (per built workflow)

After every successful build, the eval grades the workflow JSON against the binary-check rubric in `binaryChecks/checks/`. Each named check is yes/no with a structured N/A for "no subject to evaluate in this workflow" (e.g. an agent-only check on a workflow with no agent).

The 28 checks are grouped into 7 WHAT-side rubric dimensions (the 8th, `execution_outcome`, is served by the existing execution verifier):

| Dimension | Checks |
|---|---|
| `structure` | 4 — workflow shape (nodes, triggers, start) |
| `connection_topology` | 4 — graph reachability, branch wiring, multi-item handling |
| `parameter_correctness` | 8 — node config, expressions, field references |
| `intent_match` | 1 — workflow fulfills the user's request |
| `ai_nodes` | 6 — agent / memory / vector-store / tool wiring |
| `nodes_craftsmanship` | 3 — naming, no-code preference, response honesty |
| `security` | 2 — hardcoded credentials, inbound auth defaults |

The signal surfaces in:

- **HTML report** — a "Workflow checks" disclosure on each test case, grouped by dimension. Pass / fail / N/A counts per group and per-check rows.
- **PR comment / `eval-results.json`** — a "Workflow checks" table with pass / fail / N/A counts and pass rate per check, sorted by dimension, aggregated across every successful build in the run.
- **LangSmith Feedback** — one `evals.workflows.<dimension>.<check_name>` Feedback per non-N/A outcome per scenario row (score 1 for pass, 0 for fail). N/A is omitted so per-experiment column averages reduce to per-check pass-rate cleanly. The dotted key sorts naturally in LangSmith's column UI.

Operational details:

- Checks run **once per built workflow**, not per scenario — every scenario row in LangSmith carries the same outcomes for its build.
- Failures don't flip `scenario_pass`; they're independent signals per the rubric design.
- LLM checks (`fulfills_user_request`, `valid_data_flow`, `correct_node_operations`, `handles_multiple_items`, `descriptive_node_names`, `response_matches_workflow_changes`) reuse the same Sonnet model as the verifier — auto-skipped (N/A) when no Anthropic key is set.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_INSTANCE_AI_MODEL_API_KEY` | Yes | Anthropic API key for the agent, mock generation, and verification |
| `N8N_EVAL_EMAIL` | No | n8n login email (defaults to E2E test owner) |
| `N8N_EVAL_PASSWORD` | No | n8n login password (defaults to E2E test owner) |
| `LANGSMITH_API_KEY` | No | Enables experiment tracking + tracing. **See caveat below.** |
| `LANGSMITH_ENDPOINT` | No | Region (`https://api.smith.langchain.com` US, `https://eu.api.smith.langchain.com` EU) |
| `LANGSMITH_REVISION_ID` | No | Commit SHA to tag the experiment with (auto-set in CI) |
| `LANGSMITH_BRANCH` | No | Branch name to tag the experiment with (auto-set in CI) |
| `CONTEXT7_API_KEY` | No | Context7 key for API-doc lookups. Improves mock realism for less-common services; the LLM falls back to training data when unset |
| `N8N_AI_ASSISTANT_BASE_URL` | No | Set to `""` to bypass the hosted AI proxy and hit Anthropic directly — useful to avoid per-tenant quota during large batch runs |

**LangSmith caveat:** if `LANGSMITH_API_KEY` is set in `.env.local`, local runs also land in the shared `instance-ai-workflow-evals` dataset. Unset it (or run without `dotenvx`) to keep exploratory runs out of team results.

## Regression detection

When `LANGSMITH_API_KEY` is set, every eval run automatically compares its results against the most recent pinned baseline (any experiment whose name starts with `instance-ai-baseline-`). Two output files are written:

- `eval-results.json` — structured data only, including `comparison.result` when a baseline was found.
- `eval-pr-comment.md` — the full PR comment rendered as markdown, including the alert, aggregate, comparison sections, per-test-case results, and failure details. Always written; falls back to a no-baseline summary when no comparison ran.

The CI PR-comment step uses `eval-pr-comment.md` as the entire comment body (no jq assembly in the workflow). The console output uses a separate aligned-text formatter — same data, no markdown noise in the terminal.

### Refreshing the baseline

There is no auto-refresh — refresh explicitly when you want a new reference point, ideally with high N for low noise:

```bash
# From packages/@n8n/instance-ai/, on master at the version you want to pin
LANGSMITH_API_KEY=... dotenvx run -f ../../../.env.local -- \
  pnpm eval:instance-ai --experiment-name instance-ai-baseline --iterations 10
```

LangSmith appends a random suffix (e.g. `instance-ai-baseline-7abc1234`); the most recently started one becomes the comparison target on the next eval run. The comparison is silently skipped on the baseline-creation run itself.

### How scenarios are tiered

Each scenario lands in one of three regression tiers, evaluated in order of strictness:

- **Regression** — high-confidence flag, gating-grade. The drop must be statistically significant (chance of seeing it by noise < 5%), at least 30 percentage points in size, and the baseline must have been reliable (≥ 70% pass rate).
- **Likely regression** — looser bar for visibility on borderline cases. Looser confidence threshold (chance by noise < 20%), drop ≥ 15 percentage points, baseline ≥ 50%. Frequently natural variance — worth a glance only if your changes touch related code paths.
- **Worth watching** — any scenario whose pass rate moved by ≥ 35 percentage points but wasn't flagged as a regression (hard or likely tier). Pure visibility, no implication of cause.

Other verdicts: `improvement` (PR significantly better, skips the reliability gate), `unreliable_baseline` (confident drop but baseline was too flaky to call a regression — surfaced but not flagged), `stable`, `insufficient_data`.

Why these tiers and not a flat percentage threshold? At the small N PR runs use (typically 3 iterations), a flat threshold can't tell a real regression from coin-flip noise. The confidence cutoff filters out gaps that could plausibly happen by chance, and the reliability gate avoids chasing noise on already-flaky scenarios. Implementation lives in `comparison/statistics.ts` (Fisher's exact test for the confidence check, Wilson interval for the headline aggregate band). Tune the likely-regression tier first if the false-positive rate looks off — keep the hard tier strict.

### Failure-category drift

When both sides captured per-trial `failureCategory` values, the comparison also surfaces a run-level table of category rates (PR vs baseline). A category is marked **notable** when its absolute rate delta is ≥ 5 percentage points _and_ the count change beyond what scenario-count scaling would predict is ≥ 3 trials. This catches cross-scenario shifts (e.g. mock-generation breaking, or a model getting weaker overall) that per-scenario flags can miss.

### Best-effort

Comparison is logged and skipped on any LangSmith failure — it never fails the eval. It is also skipped when no baseline experiment exists yet.

## Running evals against pre-built workflows

The eval framework normally builds each workflow with Instance AI and then verifies it. With `--prebuilt-workflows <path>`, the build step is skipped for matched test cases — the harness fetches the existing workflow from the n8n instance and runs verification against it instead. Use this to score workflows authored by other tools (an MCP-driven session, a hand-built reference, an older Instance AI snapshot) on the same dataset and the same verifier.

The manifest is a JSON file mapping test-case file slugs to workflow IDs:

```json
{
  "contact-form-automation": ["W1abc", "W2def", "W3ghi"],
  "deduplication-trigger": ["W4jkl"]
}
```

- **Keys** are test-case file slugs — the JSON filename without `.json` (e.g. `contact-form-automation` for `evaluations/data/workflows/contact-form-automation.json`). The `--filter` flag uses the same identifier.
- **Values** are arrays of workflow IDs that already exist in the target n8n instance. Multiple iterations rotate through the list with `iteration % ids.length`, so an `--iterations 5` run with 5 IDs gets 5 distinct builds.

Test cases not present in the manifest fall back to the regular Instance AI build path. To run *only* the prebuilt set, pair with `--exclude` to skip the rest, or `--filter` to narrow the run.

```bash
# Score the prebuilt cohort, skipping anything not in the manifest
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai \
  --prebuilt-workflows ./mcp-manifest.json \
  --filter contact-form-automation,deduplication-trigger \
  --iterations 5 \
  --experiment-name mcp-cohort
```

The harness leaves prebuilt workflows alone after the run (no auto-delete), so the manifest can be re-used across multiple eval runs.

### Producing a manifest

`pnpm eval:build-mcp-manifest` (`evaluations/cli/build-mcp-manifest.ts`) drives `claude -p` against an MCP server — defaults to n8n's instance MCP — and writes a manifest in the schema this flag expects, plus a `manifest-stats.json` sidecar with per-cohort cost / turn / duration aggregates. The output is validated against the same Zod schema the loader uses, so shape regressions surface here rather than at eval time.

**Prerequisites**: `claude` CLI installed; `~/.claude.json` has the MCP server block configured (project-scoped under `.projects[<repo-root>].mcpServers[<name>]` or globally under `.mcpServers[<name>]`); n8n instance reachable at the URL the MCP block points at. Default MCP server name is `"n8n-mcp (instance)"` — override with `--mcp-server`.

```bash
# Build N=5 per test case, 4 in parallel
pnpm eval:build-mcp-manifest -n 5 -j 4 --output-dir ./mcp-cohort

# Then score the cohort
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai \
  --prebuilt-workflows ./mcp-cohort/manifest.json \
  --iterations 5 \
  --experiment-name mcp-cohort
```

For runs that need to leave the n8n repo (for example, driving the build from a separate Claude project where you have skills configured), three flags decouple the script from its default assumptions:

- `--workflow-dir <path>` — read test-case JSONs from a directory other than the n8n repo's `evaluations/data/workflows/`. When set, the script no longer needs `git rev-parse` to find the repo.
- `--build-cwd <path>` — set the working directory the `claude` subprocess spawns from. Affects which `~/.claude.json` `projects` entry (and which skills) Claude loads.
- `--project-id <id>` — instructs the model to pass `projectId` to `create_workflow_from_code` so workflows land in a specific n8n project instead of the user's personal one.

Run `pnpm eval:build-mcp-manifest --help` for the full flag list.

## Discovery evals

Discovery evals run the orchestrator in-process and assert first-hop tool
routing from captured `tool-call`, `tool-result`, `tool-error`, and
`agent-spawned` events. Use them when a regression is about which path the
agent chooses, not whether a generated workflow executes.

To inspect runtime skill loading, run a focused verbose pass:

```bash
pnpm eval:discovery --filter data-table-skill-loading --trials 3 --verbose --fail-on-zero-pass
```

Verbose output lists each trial's completed tool calls with argument previews.
For data-table routing, look for `load_skill(skillId="data-table-manager")`
and `data-tables(action="list")`, and verify there are no planner or delegate
entries in the spawned-agent section. Workflow building routing is covered by
orchestrator discovery fixtures that require `load_skill("workflow-builder")`
and direct `workflows(action="create"|"update")` calls.

## How the e2e harness works

1. **Build** — sends the test case prompt to Instance AI, which builds a workflow
2. **Phase 1** — analyzes the workflow and generates consistent mock data hints (one Sonnet call per scenario)
3. **Phase 2** — executes the workflow with all HTTP requests intercepted. Each request goes to an LLM that generates a realistic API response using the node's configuration and API documentation from Context7
4. **Verify** — an LLM evaluates whether the scenario's success criteria were met and categorizes any failure by root cause (see Failure categories below)

### What gets mocked

- **Mocked nodes** — any node that makes HTTP requests (Gmail, Slack, Google Sheets, HTTP Request, Notion, etc.). The request is intercepted before it leaves the process. An LLM generates the response.
- **Pinned nodes** — nodes that don't go through the HTTP layer: trigger/webhook nodes, LangChain/AI nodes (they use SDKs directly), database nodes. These receive LLM-generated data as pin data.
- **Real nodes** — logic nodes (Code, Set, Merge, Filter, IF, Switch) execute their actual code on the mocked/pinned data.

No real credentials or API connections are needed. ~95% of node types are covered; the main gaps are binary-data nodes (file attachments, image generation) and streaming nodes.

## LangSmith integration

When `LANGSMITH_API_KEY` is set, each run is recorded as a LangSmith experiment against the `instance-ai-workflow-evals` dataset (synced from the JSON files before each run). Experiments against the same dataset can be compared side-by-side to spot regressions.

## Adding test cases

Test cases live in `evaluations/data/workflows/*.json`. Drop a file in, the CLI and LangSmith sync picks it up — no registration step. Workflow-builder regression cases live here too now; they run through the same orchestrator path as production.

```json
{
  "conversation": [
    {
      "role": "user",
      "text": "Create a workflow that..."
    }
  ],
  "complexity": "medium",
  "tags": ["build", "webhook", "gmail"],
  "triggerType": "webhook",
  "executionScenarios": [
    {
      "name": "happy-path",
      "description": "Normal operation",
      "dataSetup": "The webhook receives a submission from Jane (jane@example.com)...",
      "successCriteria": "The workflow executes without errors. An email is sent to jane@example.com..."
    }
  ]
}
```

**One JSON file = one LangSmith split.** Scenarios in the same file share a split; split names derive from the filename slug. Pick a slug you're happy to also use as a `--filter` target.

**Prompt tips**

- Be specific about node configuration — document IDs, sheet names, channel names, chat IDs. The agent won't ask for these in eval mode (no multi-turn yet).
- Add "Configure all nodes as completely as possible and don't ask me for credentials, I'll set them up later."
- If a built-in node doesn't expose a field you need (e.g. the Linear node doesn't query `creator.email`), tell the agent to use HTTP Request instead.

**Scenario tips**

- Don't specify exact counts that depend on mock data ("exactly 7 posts remain"). The LLM is non-deterministic. Say "fewer than the original 10" instead.
- `dataSetup` steers the mock — describe what each service should return, not the exact JSON.
- For error scenarios, describe the condition: "The Telegram node returns an error indicating the chat was not found."
- `successCriteria` is what the verifier reads. Be specific: "None of the titles in the Slack message should contain the word 'qui'."

**Which scenarios to include**

- `happy-path` — everything works as expected
- Edge cases — empty data, missing fields, single vs multiple items
- Error scenarios only if the workflow is expected to handle them gracefully. Most agent-built workflows don't include error handling, so "the workflow crashes on invalid input" is a legitimate finding, not a test-case failure.

### Adding a new credential type

`credentials/seeder.ts` seeds generic creds (HTTP Header, HTTP Basic) on every run, plus env-gated creds (GitHub, Gmail, Teams, Linear…) when the matching env var is set. If your scenario needs a credential type that isn't there, add it to the appropriate list in `seeder.ts` — env-gated if it requires a real token, generic if a placeholder is fine.

## Failure categories

When a scenario fails, the verifier categorizes the root cause:

- **builder_issue** — the agent misconfigured a node, chose the wrong node type, or built the wrong structure.
- **mock_issue** — the LLM mock returned incorrect data (`_evalMockError`, wrong response shape).
- **framework_issue** — Phase 1 failed (empty trigger content) or the eval framework itself cascaded an error.
- **verification_failure** — the verifier couldn't produce a valid result.
- **build_failure** — Instance AI failed to build the workflow or a scenario timed out.

Suite pass rates typically sit between 40–65%; most failures are `builder_issue` on scenarios that require error handling the agent doesn't produce by default.

## Troubleshooting

**`Wrong username or password` on login.** Your instance has no owner. Run the `rest/e2e/reset` curl from [Quick start](#quick-start) (needs `E2E_TESTS=true` on the server).

**`Have reached end of quota` mid-run.** You're hitting the hosted AI proxy's per-tenant quota. Set `N8N_AI_ASSISTANT_BASE_URL=""` to hit Anthropic directly with your `N8N_INSTANCE_AI_MODEL_API_KEY`. Also consider lowering `--concurrency`.

**All scenarios timing out.** Check that the server is up (`curl localhost:5678/healthz`) and that `N8N_INSTANCE_AI_MODEL_API_KEY` is set. A full build is ~60–180s; timeouts past `--timeout-ms` usually mean the agent is looping.

**Flood of `framework_issue` failures.** Phase 1 is returning empty hints — some nodes will degrade to `_evalMockError`. Check server logs for Anthropic errors; occasionally a rate-limit spike.

**Port 5678 already in use.** A previous `pnpm dev` is still running. `lsof -iTCP:5678 -sTCP:LISTEN` to find the PID, `kill` it.

**Debugging a specific failure.** Open the `.data/workflow-eval-report.html` artifact — it has per-node execution traces, the exact intercepted request, the mock response the LLM generated, and the verifier's reasoning. Start from the failing node.

## CI

Evals run automatically on PRs that change Instance AI code (path-filtered). The workflow starts a single Docker container and runs the CLI against it. See `.github/workflows/test-evals-instance-ai.yml`.

The job is **non-blocking**. Results are posted as a PR comment and uploaded as artifacts. When `LANGSMITH_API_KEY` is set via the `EVALS_LANGSMITH_API_KEY` secret, runs also land as LangSmith experiments tagged with commit SHA + branch, so you can compare against master side-by-side.

## Architecture

```
evaluations/
├── index.ts              # Public API
├── cli/                  # CLI entries for instance-ai eval runs
├── clients/              # n8n REST + SSE clients
├── checklist/            # LLM verification with retry
├── credentials/          # Test credential seeding
├── data/workflows/       # e2e workflow test case JSON files
├── data/discovery/       # orchestrator tool-discovery scenarios
├── harness/              # Runners and production-faithful stub services
├── langsmith/            # Dataset sync + experiment setup
├── outcome/              # SSE event parsing, workflow discovery
├── report/               # HTML report generator
└── system-prompts/       # LLM prompts for verification

packages/cli/src/modules/instance-ai/eval/
├── execution.service.ts  # Phase 1 + Phase 2 orchestration
├── workflow-analysis.ts  # Hint generation (Phase 1)
├── mock-handler.ts       # Per-request mock generation (Phase 2)
├── api-docs.ts           # Context7 API doc fetcher
├── node-config.ts        # Node config serializer
└── pin-data-generator.ts # LLM pin data for bypass nodes (Phase 1.5)
```

## Known limitations

- **LangChain/AI nodes** — use their own SDKs, not the HTTP mock layer. They fail with credential errors; use pin data instead.
- **Binary / file nodes** — minimal-valid synthetic fixtures (PDF, PNG, JPEG, OGG/Opus, WAV, MP3, MP4, ZIP, plaintext) are generated per content type and round-trip correctly through `prepareBinaryData`. Image-content correctness and OOXML formats (docx/xlsx — currently mime-sniffed as `application/zip`) remain out of scope. See [Binary / file scenarios](#binary--file-scenarios) for the synthesis path.
- **Streaming nodes** — mocks return complete responses, not streams.
- **GraphQL APIs** — response shape depends on the query, not just the endpoint. Quality depends on the LLM knowing the API schema.
- **Non-determinism** — the agent builds different workflows each run. Pass rates vary between 40–65%.
- **Large workflows** — verification artifacts include full execution traces. For 12+ node workflows this can hit token limits. See TRUST-43 for the tool-based verifier approach.
