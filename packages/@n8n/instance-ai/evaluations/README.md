# Workflow evaluation framework

Tests whether workflows built by Instance AI actually work by executing them with LLM-generated mock HTTP responses.

## Quick start

```bash
# From packages/@n8n/instance-ai/

# Run all test cases
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai workflows --verbose

# Run a single test case
dotenvx run -f ../../../.env.local -- pnpm eval:instance-ai workflows --filter contact-form --verbose
```

The n8n server must be running with `N8N_ENABLED_MODULES=instance-ai`.

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

## Understanding the report

Each run generates a timestamped HTML report in `.data/` plus a stable `workflow-eval-report.html`.

### Failure categories

When a scenario fails, the verifier categorizes the root cause:

- **builder_issue** (amber) — the agent misconfigured a node, chose the wrong node type, or the workflow structure doesn't match what was asked. Examples: Switch node missing required `conditions.options`, Linear node not querying `creator.email`, missing error handling.
- **mock_issue** (red) — the LLM mock returned incorrect data. Examples: `_evalMockError` (JSON parse failure), wrong response shape for the endpoint, identical responses for repeated calls.
- **legitimate_failure** — the workflow genuinely doesn't meet the success criteria. Neither builder nor mock is at fault.
- **verification_gap** — not enough information to determine the cause.

### Report sections

- **Dashboard** — pass rate, counts at a glance
- **Scenario indicators** — inline pass/fail on the collapsed test case card
- **Built workflow** — node list with execution modes and config issues
- **Agent output** — raw workflow JSON for cross-run comparison
- **Execution trace** — per-node detail with request/response pairs for mocked nodes
- **Mock data plan** — Phase 1 hints (global context, trigger content, per-node hints)
- **Diagnosis** — verifier reasoning with failure category and root cause

## Known limitations

- **LangChain/AI nodes** — use their own SDKs, not intercepted by the HTTP mock layer. These nodes will fail with credential errors. Use pin data for these (tracked in AI-2297).
- **GraphQL APIs** — response shape depends on the query, not just the endpoint. The mock handles this when the request body (containing the query) is passed to the LLM, but quality depends on the LLM knowing the API schema.
- **Context7 quota** — free tier is 1,000 requests/month, 60/hour. A full suite run uses ~100 requests. Set `CONTEXT7_API_KEY` for sustained use. When quota is exceeded, a warning is logged and the LLM falls back to its training data.
- **Non-determinism** — the agent builds different workflows each run. Some configurations work, some don't. Contact Form is stable at 5/5. Other test cases vary based on how the agent configures nodes.
- **Switch/IF nodes** — the agent sometimes builds these without the required `conditions.options` block, causing a `caseSensitive` runtime crash. This is a known agent builder issue.

## Architecture

```
evaluations/
├── cli/                  # CLI entry point and args parsing
├── clients/              # n8n REST + SSE clients
├── checklist/            # Verification (programmatic + LLM)
├── credentials/          # Test credential seeding
├── data/
│   ├── prompts.ts        # Original prompt-based eval prompts
│   └── workflows/        # Workflow test case JSON files
├── harness/              # Runner orchestration
├── outcome/              # Outcome extraction (original flow)
├── execution/            # Post-build execution (original flow)
├── report/               # HTML report generators
└── system-prompts/       # LLM prompts (builder-* for original flow, mock-* for mock execution)

packages/cli/src/modules/instance-ai/eval/
├── execution.service.ts    # Phase 1 + Phase 2 orchestration
├── workflow-analysis.ts    # Hint generation (Phase 1)
├── mock-handler.ts         # Per-request mock generation (Phase 2)
├── api-docs.ts             # Context7 API doc fetcher
├── node-config.ts          # Node config serializer
├── pin-data-generator.ts   # LLM pin data for bypass nodes (Phase 1.5)

packages/core/src/execution-engine/
├── eval-mock-helpers.ts        # HTTP interception utilities
```

Two evaluation approaches coexist:
- **Original** (`pnpm eval:instance-ai`) — prompt-based builder evaluation using checklists
- **Workflow test cases** (`pnpm eval:instance-ai workflows`) — mock execution evaluation
