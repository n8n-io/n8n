# Workflow evaluation framework

Tests whether workflows built by Instance AI actually work by executing them with LLM-generated mock HTTP responses.

## Running evals

### CLI

```bash
# From packages/@n8n/instance-ai/, with n8n running via pnpm dev:ai

# Run all test cases
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --verbose

# Run a single test case
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter contact-form --verbose

# Keep built workflows for inspection
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai --filter contact-form --keep-workflows --verbose
```

Results are printed to the console and written to `eval-results.json`.

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

# Run evals against it
pnpm eval:instance-ai --base-url http://localhost:5678 --verbose
```

### CI

Evals run automatically on PRs that change Instance AI code (path-filtered). The CI workflow starts a single Docker container and runs the CLI against it. See `.github/workflows/test-evals-instance-ai.yml`.

The eval job is **non-blocking**. Results are posted as a PR comment and uploaded as artifacts.

### Environment variables

Set these in `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_INSTANCE_AI_MODEL_API_KEY` | Yes | Anthropic API key for the Instance AI agent, mock generation, and verification |
| `N8N_EVAL_EMAIL` | No | n8n login email (defaults to E2E test owner) |
| `N8N_EVAL_PASSWORD` | No | n8n login password (defaults to E2E test owner) |
| `CONTEXT7_API_KEY` | No | Context7 API key for higher rate limits on API doc lookups. Free tier is 1,000 req/month |

## How it works

Each test run:

1. **Build** — sends the test case prompt to Instance AI, which builds a workflow
2. **Phase 1** — analyzes the workflow and generates consistent mock data hints (one Sonnet call per scenario)
3. **Phase 2** — executes the workflow with all HTTP requests intercepted. Each request goes to an LLM that generates a realistic API response using the node's configuration and API documentation from Context7
4. **Verify** — an LLM evaluates whether the scenario's success criteria were met and categorizes any failure by root cause (see Failure categories below)

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
├── cli/                  # CLI entry point and args parsing
├── clients/              # n8n REST + SSE clients
├── checklist/            # LLM verification with retry
├── credentials/          # Test credential seeding
├── data/workflows/       # Test case JSON files
├── harness/              # Runner: buildWorkflow, executeScenario, cleanupBuild
├── outcome/              # SSE event parsing, workflow discovery
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
- **GraphQL APIs** — response shape depends on the query, not just the endpoint. Quality depends on the LLM knowing the API schema.
- **Context7 quota** — free tier is 1,000 requests/month, 60/hour. A full suite run uses ~100 requests. When quota is exceeded, the LLM falls back to its training data.
- **Non-determinism** — the agent builds different workflows each run. Pass rates vary between 40-65%.
- **Large workflows** — the verification artifact includes full execution traces. For complex workflows (12+ nodes) this can hit token limits. See TRUST-43 for the tool-based verifier approach.
