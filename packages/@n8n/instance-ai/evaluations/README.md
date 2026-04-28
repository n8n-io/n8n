# Workflow evaluation framework

Tests whether workflows built by Instance AI actually work by executing them with LLM-generated mock HTTP responses. No real credentials or external services are involved.

## How it works

Each run:

1. **Build** — the test case prompt goes to Instance AI, which builds a workflow.
2. **Phase 1** — the server analyzes the workflow and generates consistent mock data hints (one Sonnet call per scenario).
3. **Phase 2** — the workflow executes with every HTTP request intercepted and answered by an LLM using the node's configuration and API docs from Context7.
4. **Verify** — an LLM evaluates whether the scenario's success criteria were met and categorizes any failure by root cause (see [Failure categories](#failure-categories)).

### What gets mocked

- **Mocked nodes** — anything that makes HTTP requests (Gmail, Slack, Google Sheets, HTTP Request, Notion…). The request is intercepted before it leaves the process; an LLM generates the response.
- **Pinned nodes** — nodes that don't go through the HTTP layer (triggers/webhooks, LangChain/AI nodes, database nodes). They receive LLM-generated pin data.
- **Real nodes** — logic nodes (Code, Set, Merge, Filter, IF, Switch) execute on the mocked data.

~95% of node types are covered. See [Known limitations](#known-limitations) for the gaps.

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
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--verbose` | `false` | Log build/execute/verify timing and SSE events |
| `--filter` | — | Filter test cases by filename substring (e.g. `contact-form`) |
| `--keep-workflows` | `false` | Don't delete built workflows after the run |
| `--base-url` | `http://localhost:5678` | n8n instance URL |
| `--email` | E2E test owner | Override login email (or `N8N_EVAL_EMAIL`) |
| `--password` | E2E test owner | Override login password (or `N8N_EVAL_PASSWORD`) |
| `--timeout-ms` | `600000` | Per-test-case timeout |
| `--output-dir` | cwd | Where to write `eval-results.json` |
| `--dataset` | `instance-ai-workflow-evals` | LangSmith dataset name |
| `--concurrency` | `16` | Max concurrent scenarios (builds are separately capped at 4) |
| `--experiment-name` | auto | LangSmith experiment prefix (defaults to `{branch}-{sha}` in CI or `local-{branch}-{sha}-dirty?` locally) |
| `--iterations` | `1` | Run each test case N times with fresh builds |

**pass@k / pass^k**: with `--iterations N`, each scenario runs N times. `pass@k` is the fraction of scenarios that passed *at least once*; `pass^k` is the fraction that passed *every* time. `pass@k` shows whether something is *possible*; `pass^k` shows whether it's *reliable*.

### Outputs

Every run produces:

- **Console** — live progress, per-scenario pass/fail with `[failure_category]` tag, and a grouped summary.
- **`eval-results.json`** — structured results in `--output-dir` (or cwd). Consumed by the CI PR comment.
- **`.data/workflow-eval-report.html`** — self-contained debugging view with per-node execution traces, intercepted requests, mock responses, Phase 1 hints, and verifier reasoning.
- **LangSmith experiment** — only when `LANGSMITH_API_KEY` is set. See the caveat in [Environment variables](#environment-variables).

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

## Writing test cases

Test cases live in `evaluations/data/workflows/*.json`. Drop a file in, the CLI and LangSmith sync pick it up — no registration step.

```json
{
  "prompt": "Create a workflow that...",
  "complexity": "medium",
  "tags": ["build", "webhook", "gmail"],
  "triggerType": "webhook",
  "scenarios": [
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
├── cli/                  # CLI entry point, arg parsing, CI metadata
├── clients/              # n8n REST + SSE clients
├── checklist/            # LLM verification with retry
├── credentials/          # Test credential seeding
├── data/workflows/       # Test case JSON files
├── harness/              # Runner: buildWorkflow, executeScenario, cleanupBuild
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
- **Binary / file nodes** — media attachments, image generation, file downloads. Mock metadata works; realistic binary content is out of scope.
- **Streaming nodes** — mocks return complete responses, not streams.
- **GraphQL APIs** — response shape depends on the query, not just the endpoint. Quality depends on the LLM knowing the API schema.
- **Non-determinism** — the agent builds different workflows each run. Pass rates vary between 40–65%.
- **Large workflows** — verification artifacts include full execution traces. For 12+ node workflows this can hit token limits. See TRUST-43 for the tool-based verifier approach.
