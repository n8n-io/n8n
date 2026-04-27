# Workflow evaluation framework

Tests whether workflows built by Instance AI actually work by executing them with LLM-generated mock HTTP responses.

## Running evals

### CLI

Two harnesses (`eval:instance-ai` and `eval:subagent`) drive a running n8n
instance over HTTP. Start n8n locally with `N8N_ENABLED_MODULES=instance-ai`
before running either one. The sub-agent harness also requires `E2E_TESTS=true`
on the n8n instance — the `/eval/run-sub-agent` endpoint is disabled otherwise.

```bash
# From packages/@n8n/instance-ai/, with n8n running via pnpm dev:ai

# End-to-end workflow evaluation (builder + mock execution + verification)
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --verbose
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter contact-form --verbose
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter contact-form --keep-workflows --verbose

# Sub-agent evaluation (builder only, real tools on live n8n, binary checks)
dotenvx run -f ../../../.env.local -- pnpm eval:subagent --filter webhook-to-slack --verbose
```

### Outputs

Every run produces three artifacts:

- **Console** — live progress, per-scenario pass/fail with `[failure_category]` tag, and a grouped summary at the end.
- **`eval-results.json`** — structured results in the current working directory. Consumed by the CI PR comment.
- **`.data/workflow-eval-report.html`** — rich debugging view with per-node execution traces, intercepted requests, mock responses, Phase 1 hints, and verifier reasoning. Self-contained HTML you can open in a browser.

If `LANGSMITH_API_KEY` is set, results are also sent to LangSmith as an experiment for historical comparison.

### CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--verbose` | `false` | Log build/execute/verify timing and SSE events |
| `--filter` | — | Filter test cases by filename substring (e.g. `contact-form`) |
| `--keep-workflows` | `false` | Don't delete built workflows after the run |
| `--base-url` | `http://localhost:5678` | n8n instance URL |
| `--email` | E2E test owner | Override login email (also via `N8N_EVAL_EMAIL`) |
| `--password` | E2E test owner | Override login password (also via `N8N_EVAL_PASSWORD`) |
| `--timeout-ms` | `600000` | Per-test-case timeout |
| `--output-dir` | cwd | Where to write `eval-results.json` |
| `--dataset` | `instance-ai-workflow-evals` | LangSmith dataset name |
| `--concurrency` | `16` | Max concurrent scenarios (builds are separately capped at 4) |
| `--experiment-name` | auto | LangSmith experiment prefix (defaults to `{branch}-{sha}` in CI or `local-{branch}-{sha}-dirty?` locally) |
| `--iterations` | `1` | Run each test case N times with fresh builds — powers pass@k / pass^k metrics |

### Docker (without pnpm dev:ai)

```bash
# Build the Docker image
INCLUDE_TEST_CONTROLLER=true pnpm build:docker

# Start a container
docker run -d --name n8n-eval \
  -e E2E_TESTS=true \
  -e N8N_ENABLED_MODULES=instance-ai \
  -e N8N_AI_ENABLED=true \
  -e N8N_INSTANCE_AI_MODEL_API_KEY=your-key \
  -p 5678:5678 \
  n8nio/n8n:local

# Seed the test user
curl -sf -X POST http://localhost:5678/rest/e2e/reset \
  -H "Content-Type: application/json" \
  -d '{"owner":{"email":"nathan@n8n.io","password":"PlaywrightTest123","firstName":"Eval","lastName":"Owner"},"admin":{"email":"admin@n8n.io","password":"PlaywrightTest123","firstName":"Admin","lastName":"User"},"members":[],"chat":{"email":"chat@n8n.io","password":"PlaywrightTest123","firstName":"Chat","lastName":"User"}}'

# Run evals against it
pnpm eval:instance-ai --base-url http://localhost:5678 --verbose
pnpm eval:subagent --base-url http://localhost:5678 --verbose
```

### CI

Evals run automatically on PRs that change Instance AI code (path-filtered). The CI workflow starts a single Docker container and runs the CLI against it. See `.github/workflows/test-evals-instance-ai.yml`.

The eval job is **non-blocking**. Results are posted as a PR comment and uploaded as artifacts. When `LANGSMITH_API_KEY` is set (via the `EVALS_LANGSMITH_API_KEY` secret), the run also lands as an experiment in LangSmith with commit SHA + branch tagged.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_EVAL_BASE_URL` | No | n8n base URL. Defaults to `http://localhost:5678`. |
| `N8N_EVAL_EMAIL` | No | n8n login email (defaults to E2E test owner). |
| `N8N_EVAL_PASSWORD` | No | n8n login password (defaults to E2E test owner). |
| `N8N_INSTANCE_AI_MODEL_API_KEY` | On server | Anthropic key for the Instance AI agent, mock generation, and verification. Set on the n8n instance, not the eval CLI — the sub-agent runs inside n8n. |
| `E2E_TESTS` | On server, for `eval:subagent` | Must be `true` on the n8n instance. The `/eval/run-sub-agent` endpoint returns 403 otherwise. |
| `LANGSMITH_API_KEY` | For `--dataset` mode | Enables LangSmith experiment tracking + tracing. Without it, the CLI still runs and writes JSON/HTML. Required for `eval:subagent --dataset` mode. |
| `LANGSMITH_ENDPOINT` | No | LangSmith region endpoint (`https://api.smith.langchain.com` for US, `https://eu.api.smith.langchain.com` for EU). |
| `LANGSMITH_REVISION_ID` | No | Commit SHA to tag the experiment with (set automatically in CI). |
| `LANGSMITH_BRANCH` | No | Branch name to tag the experiment with (set automatically in CI). |
| `CONTEXT7_API_KEY` | No | Higher API-doc rate limits. Set on the n8n instance. Free tier is 1,000 req/month. |

### Sub-agent evaluation flags

| Flag | Description |
|------|-------------|
| `--base-url <url>` | n8n base URL (overrides `N8N_EVAL_BASE_URL`) |
| `--filter <substring>` | Run only test cases whose file name matches |
| `--prompt <text>` | Run a single ad-hoc prompt |
| `--dataset <name>` | Run against a LangSmith dataset |
| `--experiment <name>` | LangSmith experiment label |
| `--subagent <role>` | Sub-agent role. Default: `builder` |
| `--max-steps <n>` | Max agent steps. Default: 40 |
| `--timeout <ms>` | Per-test timeout. Default: 120000 |
| `--concurrency <n>` | Parallel test cases. Default: 5 |
| `--keep-workflows` | Do not archive/delete workflows created during the run |
| `--verbose` | Verbose output |

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

## How the sub-agent harness works

1. The CLI logs in to n8n with `N8N_EVAL_EMAIL` / `N8N_EVAL_PASSWORD`.
2. For each test case it POSTs `/rest/instance-ai/eval/run-sub-agent`.
3. The server builds a real `InstanceAiContext` via `InstanceAiAdapterService.createContext`, wraps the workflow service to record created IDs, resolves the `builder` (or other) role's system prompt, instantiates the sub-agent with the full `createAllTools(context)` tool surface, and runs it to completion.
4. The server returns `{ text, toolCalls, toolResults, capturedWorkflowIds, ... }`.
5. The CLI fetches each captured workflow via `GET /rest/workflows/:id` (this doubles as a round-trip check through the real importer), scores it with the binary-check suite, and archives+deletes it (unless `--keep-workflows`).

No tools, services, or workflow imports are mocked. The server path exercised here is the same one the orchestrator takes when it spawns a builder sub-agent.

## LangSmith integration

When `LANGSMITH_API_KEY` is set, each run is recorded as a LangSmith experiment against the `instance-ai-workflow-evals` dataset (synced from the JSON files before each run). Experiments against the same dataset can be compared side-by-side to spot regressions.

## Adding test cases

Test cases live in `evaluations/data/workflows/*.json`:

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

### Writing good test cases

**Prompt tips:**
- Be specific about node configuration — include document IDs, sheet names, channel names, chat IDs. The agent won't ask for these in eval mode (no multi-turn support yet).
- Say "Configure all nodes as completely as possible and don't ask me for credentials, I'll set them up later."
- If a built-in node doesn't expose the fields you need (e.g., Linear node doesn't query `creator.email`), tell the agent to use an HTTP Request node with a custom API call instead.

**Scenario tips:**
- Don't specify exact counts that depend on mock data (e.g., "exactly 7 posts remain"). The LLM generates data non-deterministically. Instead say "some posts are filtered out — fewer remain than the original 10."
- The `dataSetup` field steers the mock data generation. Describe what each service should return, not the exact JSON.
- For error scenarios, describe the error condition: "The Telegram node returns an error indicating the chat was not found."
- The `successCriteria` is what the verification LLM checks. Be specific about what constitutes success — "None of the titles in the Slack message should contain the word 'qui'."

**Scenarios to include:**
- `happy-path` — everything works as expected
- Edge cases — empty data, missing fields, single vs multiple items
- Error scenarios only if the workflow is expected to handle them gracefully. Most agent-built workflows don't include error handling, so testing "the workflow crashes on invalid input" is a legitimate finding, not a test case failure.

## Failure categories

When a scenario fails, the verifier categorizes the root cause:

- **builder_issue** — the agent misconfigured a node, chose the wrong node type, or the workflow structure doesn't match what was asked
- **mock_issue** — the LLM mock returned incorrect data (e.g., `_evalMockError`, wrong response shape)
- **framework_issue** — Phase 1 failed (empty trigger content), cascading errors from the eval framework itself
- **verification_failure** — the LLM verifier couldn't produce a valid result
- **build_failure** — Instance AI failed to build the workflow or a scenario timed out

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

- **LangChain/AI nodes** — use their own SDKs, not intercepted by the HTTP mock layer. These nodes will fail with credential errors. Use pin data for these.
- **Binary / file nodes** — media attachments, image generation, file downloads. Mock metadata works but realistic binary content is out of scope.
- **Streaming nodes** — our mock returns complete responses, not streams.
- **GraphQL APIs** — response shape depends on the query, not just the endpoint. Quality depends on the LLM knowing the API schema.
- **Context7 quota** — free tier is 1,000 requests/month, 60/hour. A full suite run uses ~100 requests. When quota is exceeded, the LLM falls back to its training data.
- **Non-determinism** — the agent builds different workflows each run. Pass rates vary between 40-65%.
- **Large workflows** — the verification artifact includes full execution traces. For complex workflows (12+ nodes) this can hit token limits. See TRUST-43 for the tool-based verifier approach.
