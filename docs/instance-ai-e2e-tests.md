# Instance AI E2E Tests

End-to-end tests for the Instance AI feature, using recorded LLM responses replayed through a MockServer proxy. Tests run without an API key in CI while producing real database state for full frontend verification.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [How Recording Works](#how-recording-works)
- [How Replay Works](#how-replay-works)
- [The ID Problem and Tool Wrapping](#the-id-problem-and-tool-wrapping)
- [Two-Tier Tool Strategy](#two-tier-tool-strategy)
- [Trace Format](#trace-format)
- [Proxy Expectations](#proxy-expectations)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Re-Recording Tests](#re-recording-tests)
- [Adding New Tests](#adding-new-tests)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

Instance AI tests exercise a multi-agent LLM system that builds and executes n8n workflows. Each test sends a chat message, the LLM orchestrates tool calls (build-workflow, run-workflow, etc.), and the test asserts on the resulting UI state.

The challenge: LLM API calls are expensive, non-deterministic, and unavailable in CI. The solution is a record/replay architecture with two layers:

```
                        Recording (local dev)              Replay (CI)
                        =====================              ===========

LLM calls           →  Real Anthropic API              →  MockServer returns
                        (proxied + recorded)               recorded responses

Tool execution      →  Real execution                  →  Real execution
                        (input/output → trace.jsonl)       with ID remapping

Frontend            →  Real DB state                   →  Real DB state
                        (preview iframe works)             (preview iframe works)
```

### Why Not Pure Mocking?

The Instance AI frontend loads workflow previews via an iframe that fetches real workflow data from the n8n API. If tools are fully mocked, the database has no workflows, and the preview shows nothing. By executing tools for real during replay, the database contains actual workflows, executions, and credentials that the frontend can render.

## How Recording Works

When running locally with a real `ANTHROPIC_API_KEY`:

1. **Proxy captures LLM traffic**: All HTTP from the n8n container routes through a MockServer proxy (`HTTP_PROXY`/`HTTPS_PROXY`). Anthropic API calls (`POST /v1/messages`) are intercepted and recorded.

2. **Tool calls are traced**: Every tool invocation is recorded to a `TraceWriter` with the tool name, agent role, input, and output. Suspend/resume events (human-in-the-loop approvals) are recorded separately.

3. **Fixture teardown saves both artifacts**:
   - Proxy expectations → individual JSON files per HTTP exchange
   - Tool trace → `trace.jsonl` (one JSON object per line)

Both are saved under `expectations/instance-ai/<test-slug>/`.

## How Replay Works

In CI (no API key):

1. **Fixture setup loads artifacts**: The `instanceAiProxySetup` auto-fixture reads proxy expectations and trace events from disk, uploads them to MockServer and the n8n container respectively.

2. **LLM calls hit MockServer**: The proxy returns pre-recorded responses in sequence. Each expectation fires once (`remainingTimes: 1`), except the last `/v1/messages` expectation which is unlimited (fallback for any extra calls).

3. **Tools execute for real with ID remapping**: When the LLM response triggers a tool call, the tool runs against the real database. But IDs from the recorded session won't match the current run's IDs. The `IdRemapper` translates between them.

4. **Frontend works normally**: Since tools produced real DB state with real IDs, the workflow preview iframe loads actual workflows.

## The ID Problem and Tool Wrapping

This is the core challenge that motivated the trace replay infrastructure.

### The Problem

Consider a test that builds and runs a workflow:

```
Recording session:
  build-workflow → { workflowId: "5" }
  run-workflow({ workflowId: "5" }) → { executionId: "exec-100" }

Replay session:
  build-workflow → { workflowId: "12" }     ← different auto-increment ID
  run-workflow({ workflowId: "5" }) → ERROR  ← LLM still says "5" (from recorded response)
```

The LLM response is pre-recorded and contains the old `workflowId: "5"`. But in the replay session, `build-workflow` created workflow `"12"`. When the LLM tells the agent to run workflow `"5"`, it doesn't exist.

### The Solution: IdRemapper

The `IdRemapper` maintains a bidirectional mapping of old IDs to new IDs, learned incrementally as tools execute:

```
1. build-workflow executes → output: { workflowId: "12" }
2. IdRemapper compares recorded output { workflowId: "5" } with real output { workflowId: "12" }
3. Learns mapping: "5" → "12"
4. Next tool call: run-workflow({ workflowId: "5" })
5. IdRemapper translates input: run-workflow({ workflowId: "12" })
6. Tool executes successfully with the real ID
```

ID extraction is **field-name aware** — only fields named `id` or ending with `Id` (e.g., `workflowId`, `executionId`, `credentialId`) are compared. This prevents false mappings from unrelated data like execution output, web content, or file blobs.

### Why the Proxy Can Ignore Request Bodies

During recording, the fixture's `transform` callback strips LLM request bodies down to an 80-character system prompt substring. This means MockServer matches requests by path and prompt prefix only, not by the full body. Since tool results flow into LLM request bodies (as tool_result content blocks), and those results now contain different IDs, the proxy would fail to match if it compared full bodies. By ignoring bodies, the proxy stays deterministic regardless of tool output content.

### Shared State Across Runs

A single test may trigger multiple n8n "runs" — the orchestrator run, a background task follow-up, or a delegated sub-agent. The `TraceIndex` and `IdRemapper` are shared across all runs within one test (keyed by the test slug), so cursor positions and ID mappings persist correctly.

## Two-Tier Tool Strategy

Tools are categorized by whether they can execute in CI:

### Tier 1: Real Execution + ID Remapping (default)

Tools that only need the n8n database and engine. They execute for real, and the `IdRemapper` translates IDs in both directions.

| Tool | Why Real Execution |
|------|-------------------|
| `build-workflow` | Creates real workflow in DB for preview |
| `run-workflow` | Creates real execution for status display |
| `setup-workflow` | Configures workflow nodes |
| `search-nodes` | Queries node catalog (local) |
| `get-execution` | Reads execution results |
| Credential tools | Creates real credentials |
| Data table tools | Creates real data tables |
| `ask-user` | May contain IDs in response |

The wrapping flow:

```typescript
// Simplified — see langsmith-tracing.ts for full implementation
async execute(input, context) {
  const event = traceIndex.next(agentRole, toolName);  // Get recorded event
  const remappedInput = idRemapper.remapInput(input);   // Translate old IDs → new
  const realOutput = await tool.execute(remappedInput);  // Execute for real
  idRemapper.learn(event.output, realOutput);            // Discover new mappings
  return realOutput;                                      // Return real output
}
```

### Tier 2: Pure Replay (external dependency tools)

Tools that need internet access or external services. They skip real execution entirely and return the recorded output (with ID remapping applied).

| Tool | Why Pure Replay |
|------|----------------|
| `web-search` | No internet in CI |
| `fetch-url` | No internet in CI |
| `test-credential` | Needs external service |

The wrapping flow:

```typescript
async execute(input, context) {
  const event = traceIndex.next(agentRole, toolName);  // Validate tool sequence
  return idRemapper.remapOutput(event.output);          // Return recorded output
}
```

### Not Wrapped

Some tools pass through without wrapping:

| Tool | Why |
|------|-----|
| `plan` | Pure text orchestration, no IDs |
| `delegate` | Must spawn real sub-agent (which gets its own wrapping) |
| `update-tasks` | Orchestration bookkeeping |

## Trace Format

Each test's tool calls are recorded in `trace.jsonl` (newline-delimited JSON):

```jsonl
{"kind":"header","version":1,"testName":"should-approve-workflow-execution","recordedAt":"2026-04-09T12:00:00Z"}
{"stepId":1,"kind":"tool-call","agentRole":"orchestrator","toolName":"search-nodes","input":{...},"output":{...}}
{"stepId":2,"kind":"tool-call","agentRole":"workflow-builder","toolName":"build-workflow","input":{...},"output":{"workflowId":"5"}}
{"stepId":3,"kind":"tool-suspend","agentRole":"orchestrator","toolName":"run-workflow","input":{"workflowId":"5"},"output":{"denied":true},"suspendPayload":{...}}
{"stepId":4,"kind":"tool-resume","agentRole":"orchestrator","toolName":"run-workflow","input":{"workflowId":"5"},"output":{"executionId":"exec-100"}}
```

### Event Types

- **`header`** — metadata (version, test name, timestamp)
- **`tool-call`** — normal tool invocation with input and output
- **`tool-suspend`** — human-in-the-loop tool paused for approval (includes suspend payload)
- **`tool-resume`** — tool resumed after user approval/denial (includes resume data)

### TraceIndex

The `TraceIndex` groups events by `agentRole` with independent cursors per role. This handles interleaved orchestrator and sub-agent calls:

```
orchestrator: [search-nodes, run-workflow-suspend, run-workflow-resume]
                ^cursor=0
workflow-builder: [build-workflow]
                   ^cursor=0
```

When a tool is called, `traceIndex.next(role, toolName)` advances that role's cursor and validates the tool name matches. A mismatch means the agent diverged from the recorded path — the test fails with a clear error.

## Proxy Expectations

Each test's HTTP exchanges are stored as individual JSON files:

```
expectations/instance-ai/should-send-message-and-receive-assistant-response/
  1775805992870-unknown-host-POST-_v1_messages-8a23f6c2.json    ← Anthropic API call
  1775805993100-api-staging.n8n.io-GET-_api_community_nodes-272f77d5.json  ← Node catalog
  trace.jsonl                                                     ← Tool trace
```

### File Naming

`<timestamp>-<host>-<method>-<path_slugified>-<8char_sha256>.json`

- `unknown-host` = Anthropic API (CONNECT tunneling hides the real host)
- `api-staging.n8n.io` = n8n community nodes API

### Sequential Loading

Expectations are loaded with `sequential: true`, which sets `remainingTimes: 1` on each. They fire in order, one-shot. The last `/v1/messages` expectation is made `unlimited: true` to act as a fallback for any extra LLM calls caused by tool execution divergence.

### Request Body Matching

LLM request bodies are replaced during recording with an 80-character substring of the system prompt. This is enough to distinguish between different types of calls (title generation vs. orchestrator vs. sub-agent) without being so specific that minor prompt changes break replay.

## Test Infrastructure

### Key Files

| File | Purpose |
|------|---------|
| `packages/testing/playwright/tests/e2e/instance-ai/fixtures.ts` | Test fixtures — proxy setup, recording/replay orchestration |
| `packages/@n8n/instance-ai/src/tracing/trace-replay.ts` | `TraceIndex`, `IdRemapper`, `TraceWriter`, JSONL parsing |
| `packages/@n8n/instance-ai/src/tracing/langsmith-tracing.ts` | Tool wrapping — `replayWrapTools`, `recordWrapTools` |
| `packages/@n8n/instance-ai/src/tracing/types.ts` | `InstanceAiTraceContext`, `TraceReplayMode` |
| `packages/cli/src/modules/instance-ai/instance-ai.service.ts` | Trace mode initialization, shared state management |
| `packages/cli/src/modules/instance-ai/instance-ai.controller.ts` | Test-only REST endpoints for trace delivery |
| `packages/testing/containers/services/proxy.ts` | `ProxyServer` class (MockServer client) |

### Test-Only Endpoints

Enabled by `N8N_INSTANCE_AI_TRACE_REPLAY=true`:

| Endpoint | Purpose |
|----------|---------|
| `POST /rest/instance-ai/test/tool-trace` | Load trace events into n8n memory |
| `GET /rest/instance-ai/test/tool-trace/:slug` | Retrieve recorded events |
| `DELETE /rest/instance-ai/test/tool-trace/:slug` | Clear between tests |
| `POST /rest/instance-ai/test/drain-background-tasks` | Cancel leftover background tasks |

### Page Objects

- **`InstanceAiPage`** — chat input, send button, message selectors, preview iframe, artifact cards, confirmation panels
- **`InstanceAiSidebar`** — thread list, new thread button, thread-by-title lookup, rename input, action menu

### Test Suites

| Spec File | Tests | What's Covered |
|-----------|-------|----------------|
| `instance-ai-chat-basics.spec.ts` | 4 | Empty state, send/receive, message timeline, persistence across reload |
| `instance-ai-sidebar.spec.ts` | 4 | Create thread, switch threads, rename, delete |
| `instance-ai-artifacts.spec.ts` | 2 | Artifact card display, click-to-open preview |
| `instance-ai-timeline.spec.ts` | 1 | Artifact cards after workflow build |
| `instance-ai-workflow-preview.spec.ts` | 3 | Auto-open preview, canvas nodes, close button |
| `instance-ai-confirmations.spec.ts` | 2 | Approve/deny workflow execution |

## Running Tests

### Replay Mode (CI / no API key)

```bash
pnpm build:docker
pnpm --filter=n8n-playwright test:container:sqlite --grep "Instance AI"
```

### Record Mode (local with real API key)

```bash
ANTHROPIC_API_KEY=sk-... pnpm --filter=n8n-playwright test:container:sqlite --grep "Instance AI"
```

This overwrites `expectations/instance-ai/<test-slug>/` with fresh recordings.

## Re-Recording Tests

When Instance AI prompts, tools, or behavior change, recordings may need updating:

1. Ensure you have a valid `ANTHROPIC_API_KEY`
2. Run the specific test(s) to re-record:
   ```bash
   ANTHROPIC_API_KEY=sk-... pnpm --filter=n8n-playwright test:container:sqlite \
     --grep "should send message and receive assistant response"
   ```
3. Verify the new recordings replay correctly (without the API key):
   ```bash
   pnpm --filter=n8n-playwright test:container:sqlite \
     --grep "should send message and receive assistant response"
   ```
4. Commit the updated expectation files and trace.jsonl

### What Triggers Re-Recording

- System prompt changes (the 80-char body matcher may no longer match)
- Tool schema changes (recorded inputs/outputs may have different shapes)
- New tools added to an agent (tool sequence in trace diverges)
- Agent orchestration changes (different tool call order)

## Adding New Tests

1. **Write the spec** in `tests/e2e/instance-ai/` using the existing fixtures:
   ```typescript
   import { test, expect, instanceAiTestConfig } from './fixtures';
   test.use(instanceAiTestConfig);
   ```

2. **Record** by running with `ANTHROPIC_API_KEY`. The fixture automatically saves proxy expectations and trace.jsonl.

3. **Verify replay** by running without the key.

4. **Classify any new tools**: If the test exercises tools that need external services, add them to `PURE_REPLAY_TOOLS` in `trace-replay.ts`.

5. **Use identity-based assertions** for thread lookups — `getThreadByTitle()` instead of positional selectors like `.last()`. Tests run in parallel and share containers; positional selectors break when other tests create threads.

## Troubleshooting

### "Trace exhausted for role X"

The agent made more tool calls than were recorded. The LLM response diverged, possibly due to a prompt change. Re-record the test.

### "Tool mismatch at step N"

The agent called a different tool than expected at this point in the sequence. The agent took a different path than the recording. Re-record the test.

### ECONNRESET from MockServer

Transient error when multiple parallel workers load expectations simultaneously. The `ProxyServer.withRetry()` handles this with exponential backoff (3 retries, 500ms/1s/2s). If persistent, check MockServer container health.

### Missing expectations directory

Tests without recorded proxy expectations (e.g., "should display empty state") have no expectations folder. The `loadExpectations` method handles `ENOENT` gracefully by skipping.

### Thread assertions failing in parallel

If using `.last()`, `.first()`, or count-based assertions on sidebar threads, they will be flaky when tests run in parallel. Always use `getThreadByTitle()` with the LLM-generated title from the recording.

### Preview iframe not loading

If Tier 1 tools aren't creating real DB state, the preview iframe will show nothing. Check that the `IdRemapper` is learning mappings correctly — look for `workflowId` in the trace.jsonl and verify the tool is executing (not pure-replaying).
