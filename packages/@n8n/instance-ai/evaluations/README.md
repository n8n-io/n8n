# Workflow evaluation framework

Tests whether workflows built by Instance AI actually work by executing them with LLM-generated mock HTTP responses.

## Running evals

### Playwright (primary — used in CI)

```bash
# From repo root, with n8n running via pnpm dev:ai

# Run all test cases (4 workers)
dotenvx run -f .env.local -- pnpm --filter=n8n-playwright test:instance-ai-workflow-evals:local

# Run a single test case
dotenvx run -f .env.local -- pnpm --filter=n8n-playwright test:instance-ai-workflow-evals:local -- --grep "contact-form"
```

Results are printed to the console via a custom reporter and written to `eval-results.json`.

### CLI (alternative — quick local iteration)

```bash
# From packages/@n8n/instance-ai/
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai workflows --verbose

# Single test case
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai workflows --filter contact-form --verbose
```

Generates an HTML report in `.data/workflow-eval-report.html`.

### Docker (local without pnpm dev:ai)

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

# Reset DB and create user
curl -X POST http://localhost:5678/rest/e2e/reset \
  -H "Content-Type: application/json" \
  -d '{"owner":{"email":"admin@n8n.io","password":"password","firstName":"Eval","lastName":"Owner"},"admin":{"email":"admin2@n8n.io","password":"password","firstName":"Admin","lastName":"User"},"members":[],"chat":{"email":"chat@n8n.io","password":"password","firstName":"Chat","lastName":"User"}}'

# Run evals against it
pnpm --filter=n8n-playwright test:instance-ai-workflow-evals:local
```

### CI

Evals run automatically on PRs that change Instance AI code (path-filtered). The CI workflow starts a single Docker container and runs tests against it — same as local mode. See `.github/workflows/test-evals-instance-ai.yml`.

The eval job is **non-blocking** — it doesn't prevent PR merges. Results are uploaded as artifacts and visible in the GitHub Actions step summary.

### Environment variables

Set these in `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_INSTANCE_AI_MODEL_API_KEY` | Yes | Anthropic API key — shared with the Instance AI agent and used for Phase 1 hints, Phase 2 mock generation, and verification |
| `N8N_EVAL_EMAIL` | Yes | n8n login email for the eval runner |
| `N8N_EVAL_PASSWORD` | Yes | n8n login password |
| `CONTEXT7_API_KEY` | No | Context7 API key for higher rate limits on API doc lookups. Free tier is 1,000 req/month |

## How it works

Each test run:

1. **Build** — sends the test case prompt to Instance AI, which builds a workflow
2. **Phase 1** — analyzes the workflow and generates consistent mock data hints (one Sonnet call per scenario)
3. **Phase 2** — executes the workflow with all HTTP requests intercepted. Each request goes to an LLM that generates a realistic API response using the node's configuration and API documentation from Context7
4. **Verify** — an LLM evaluates whether the scenario's success criteria were met, categorizes any failure as `builder_issue`, `mock_issue`, `legitimate_failure`, or `verification_gap`

### What gets mocked

- **Mocked nodes** — any node that makes HTTP requests (Gmail, Slack, Google Sheets, HTTP Request, etc.). The request is intercepted before it leaves the process. An LLM generates the response.
- **Pinned nodes** — trigger/start nodes get LLM-generated input data injected as pin data
- **Real nodes** — logic nodes (Code, Set, Merge, Filter, Sort, IF, Switch) execute their actual code on the mocked/pinned data

No real credentials or API connections are needed.

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

Adding a scenario to the JSON automatically creates a new Playwright test — no spec file changes needed.

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
- **build_failure** — Instance AI failed to build the workflow (timeout, agent error)
- **timeout** — scenario execution exceeded the timeout

## Architecture

```
evaluations/
├── index.ts              # Public API (used by Playwright specs + CLI)
├── cli/                  # CLI entry point and args parsing
├── clients/              # n8n REST + SSE clients
├── checklist/            # LLM verification with retry
├── credentials/          # Test credential seeding
├── data/workflows/       # Test case JSON files
├── harness/              # Runner: buildWorkflow, executeScenario, cleanupBuild
├── outcome/              # SSE event parsing, workflow discovery
├── report/               # HTML report generator (CLI only)
└── system-prompts/       # LLM prompts for verification

packages/testing/playwright/
├── tests/e2e/instance-ai-workflow-evals/
│   ├── fixtures.ts       # EvalClient, container/local mode
│   ├── eval-spec-helper.ts  # Test generation from JSON
│   ├── build-cache.ts    # Cross-worker build coordination
│   └── *.spec.ts         # One per test case (3 lines each)
└── reporters/
    └── instance-ai-workflow-eval-reporter.ts  # Console + JSON + GitHub summary

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
- **GraphQL APIs** — response shape depends on the query, not just the endpoint. Quality depends on the LLM knowing the API schema.
- **Context7 quota** — free tier is 1,000 requests/month, 60/hour. A full suite run uses ~100 requests. When quota is exceeded, the LLM falls back to its training data.
- **Non-determinism** — the agent builds different workflows each run. Pass rates vary between 40-65%.
- **Large workflows** — the verification artifact includes full execution traces. For complex workflows (12+ nodes) this can hit token limits. See TRUST-43 for the tool-based verifier approach.
