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
- [Robustness and Maintenance](#robustness-and-maintenance)
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

Enabled by `E2E_TESTS=true` (set automatically by the Playwright fixture base):

| Endpoint | Purpose |
|----------|---------|
| `POST /rest/instance-ai/test/tool-trace` | Load trace events into n8n memory |
| `GET /rest/instance-ai/test/tool-trace/:slug` | Retrieve recorded events |
| `DELETE /rest/instance-ai/test/tool-trace/:slug` | Clear between tests |

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

### Local-build mode (no docker, real Anthropic key)

For fast iteration against a local n8n build — skips the container and proxy
stack entirely. Tests hit the real Anthropic API directly. This mode does
**not** record proxy expectations.

```bash
cd packages/testing/playwright
export ANTHROPIC_API_KEY=sk-ant-...
pnpm test:local:instance-ai                  # full suite
pnpm test:local:instance-ai --grep "preview" # single test
```

Extra args flow through to `playwright test`:

```bash
# Single file
pnpm test:local:instance-ai instance-ai-workflow-preview.spec.ts

# Multiple instances in parallel — each gets its own random port + temp DB
pnpm test:local:instance-ai --grep "preview" &
pnpm test:local:instance-ai --grep "sidebar"  &
wait

# Pin the port (e.g. for browser inspection at http://localhost:5680)
N8N_BASE_URL=http://localhost:5680 pnpm test:local:instance-ai --grep "preview"

# Headed browser for visual debugging
pnpm test:local:instance-ai --grep "preview" --headed
```

`test:local:instance-ai` is a thin wrapper that pre-fills the instance-ai env
vars over the generic `test:local:isolated` runner, which provides random free
ports, a throwaway `N8N_USER_FOLDER` (so `~/.n8n` is never touched), and
process-group cleanup. See the
[Playwright README](../../../testing/playwright/README.md) for full details on
`test:local:isolated`.

> **Cost note:** Each run makes real Anthropic calls. Scope with `--grep` or
> a filename while iterating; reserve full-suite runs for fixture refreshes.

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

## Robustness and Maintenance

This section explains what the replay system is resilient to, what breaks it, and how to keep tests stable as Instance AI evolves.

### What Does NOT Require Re-Recording

The architecture is deliberately tolerant of many common changes:

| Change | Why It's Safe |
|--------|---------------|
| **Prompt wording changes** (within the same 80-char prefix) | Proxy matches on an 80-character substring of the system prompt, not the full text. Minor rewording that doesn't alter this prefix passes through unchanged. |
| **Tool output differences** (new fields, different execution data) | Proxy ignores request bodies entirely — tool results flow into LLM request bodies as `tool_result` blocks, but the proxy matches by path and prompt prefix only. The `IdRemapper` compares by field path, so extra fields are ignored. |
| **Database auto-increment IDs** | This is the core problem the `IdRemapper` solves. IDs like `workflowId`, `executionId`, `credentialId` are automatically remapped between the recorded session and the current run. |
| **Frontend component changes** | Tests assert on data-testid attributes and semantic content, not CSS or layout. Frontend refactors that preserve test IDs don't affect recordings. |
| **Node catalog changes** (new community nodes, updated descriptions) | Community node API expectations have been removed — the proxy doesn't replay these. Only Anthropic API calls are replayed. |
| **New optional tool input fields** (with defaults) | The frozen LLM response won't include the new field, but the tool executes fine because it has a default value. Neither the proxy nor the `TraceIndex` validate input shape. |
| **New tool output fields** | The `IdRemapper` compares recorded vs actual output by field path. Extra fields in the actual output are simply ignored — no false mappings are created. |
| **Unrelated tool additions** | Adding tools that aren't called by existing test scenarios has no effect — the `TraceIndex` only validates tools the agent actually calls. |

### What DOES Require Re-Recording

LLM responses are frozen — the replay serves the exact same bytes regardless of runtime changes. These changes break replay because the runtime can no longer correctly execute what the frozen responses instruct:

| Change | Why It Breaks | Detection |
|--------|---------------|-----------|
| **System prompt changes** (different 80-char prefix) | The proxy's body matcher uses an 80-character substring of the system prompt. If this prefix changes, MockServer can't match the request to a recorded response and returns a 404. | Test fails with HTTP error from proxy or empty LLM response. |
| **Tool schema changes** (renamed fields, changed types, new required inputs) | Recorded tool inputs/outputs have the old shape. Renamed ID fields (e.g. `workflowId` → `wfId`) break `IdRemapper` path matching. New **required** input fields break because the frozen LLM response can't provide them — tool Zod validation rejects the input. New **optional** input fields (with defaults) are safe — the tool executes fine without them. | Renamed IDs: `IdRemapper` fails to learn mappings → "workflow not found". New required fields: Zod validation error in tool execute. |
| **Tool removal or renaming** | The frozen LLM response still references the old tool name. If the agent runtime can't find the tool to dispatch to, the call fails. The `TraceIndex` also expects the old name and would report a mismatch if a different tool executes in its place. | Tool dispatch error or "Tool mismatch at step N" from `TraceIndex.next()`. |
| **Agent orchestration code changes** (tool distribution, delegation routing) | The recorded LLM responses are fixed, but the code that *acts on* them can change. For example, if a tool moves from the orchestrator to a sub-agent, or `delegate` now routes to a different role, the per-role trace cursors diverge because tools execute under different `agentRole` keys than the recording expects. | "Trace exhausted for role X" or tool mismatch. |

### Design Decisions That Maximize Robustness

1. **80-character prompt prefix matching** — Long enough to distinguish between call types (title generation vs. orchestrator vs. sub-agent) but short enough that minor prompt edits don't break replay. The prefix is extracted during recording by the fixture's `transform` callback.

2. **Field-name-aware ID extraction** — The `IdRemapper` only compares fields named `id` or ending with `Id` (e.g., `workflowId`, `executionId`). This prevents false mappings from execution output data, web content, or other string fields that happen to differ between runs.

3. **Per-role trace cursors** — The `TraceIndex` groups events by `agentRole` with independent cursors. This handles interleaved orchestrator and sub-agent calls naturally, without requiring a single global sequence that breaks when parallelism changes.

4. **Shared state across runs** — The `TraceIndex` and `IdRemapper` are shared across all runs within one test (orchestrator run, background task follow-up, delegated sub-agent). This means a workflowId learned in run 1 is available for remapping in run 2.

5. **Request body stripping** — During recording, LLM request bodies are replaced with just the prompt prefix. This means the recorded expectations don't encode tool results, conversation history, or any other dynamic content. Replay stays deterministic regardless of what tools return.

### Keeping Tests Stable

- **Prefer small, focused test scenarios.** A test that sends "build a workflow that sends an email" exercises fewer tools than "build a workflow, run it, debug the failure, and fix it". Fewer tools = fewer points of divergence.
- **Re-record the specific test that broke**, not all tests. Each test has independent recordings.
- **After re-recording, always verify replay** by running without the API key. A successful recording doesn't guarantee a successful replay — the `IdRemapper` needs to learn the right mappings.
- **When changing prompts**, check if the first 80 characters of the system prompt changed. If they did, all tests using that agent type need re-recording.

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
