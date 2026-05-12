# n8n Hub — Implementation Plan (Hackathon)

**Source:** `docs/superpowers/specs/2026-05-10-n8n-hub-design.md`
**Date:** 2026-05-10
**Scope:** hackathon-week deliverable; production hardening explicitly deferred.

This is the engineer-facing checklist. Every task lists files, the code shape to write, acceptance criteria, and a copy-paste manual test.

---

## Start here (fresh session)

If you're picking this up cold:

1. **Read this file end-to-end** (~10 minutes). It's the only doc you need to start coding.
2. **The design spec** at `docs/superpowers/specs/2026-05-10-n8n-hub-design.md` is the product context — why we're building this. Read if curious; skip if you trust the plan.
3. **The live walkthrough** at `docs/n8n-hub-visualization.html` is an interactive demo of the design — useful for understanding the agent / SDK / CLI surfaces visually.
4. **The kanban tracker** at `docs/n8n-hub-plan.html` mirrors this plan with checkboxes + the dev environment commands. Open it in a browser; tick tasks as you go.

### The 60-second mental model

- **One new endpoint:** `POST /executions/node` on the n8n server. Synthesizes a 2-node workflow (`ManualTrigger → ActionNode`) and runs it via the existing `ManualExecutionService.runManually()`. Real DB row, real engine, real observability.
- **Three new MCP tools:** `n8n_search_tools`, `n8n_execute_tool`, `n8n_list_credentials`. Powered by the existing `NodeCatalogService`.
- **One new package:** `packages/@n8n/cli/` — standalone, `npx @n8n/cli auth login ...`. Tiny dep tree. NOT inside `packages/cli` (that's the 500MB server).
- **One new package:** `packages/@n8n/sdk/` — TS SDK with autocomplete for ~480 nodes via build-time codegen from `nodes.json`.
- **Three new OAuth scopes** on the existing `/mcp-oauth/*` provider: `node:execute`, `credential:read`, `tool:search`.
- **UI work:** make single-node executions show up in the existing executions list with caller attribution, and make the detail view work without a workflow entity.

That's the whole hackathon.

### Where to start coding

**Phase 0** is plumbing. Start there.

**The very first thing** is the smoke test in Phase 1.1 (~30 minutes). It validates the load-bearing assumption — that `manualExecutionService.runManually()` accepts an in-memory 2-node workflow and produces output we can read. If it passes, the plan is locked. If not, fall back to the longer pre-seeded-`nodeExecutionStack` path documented in the Phase 1.1 `<details>` block.

### Hard rules

- **TDD everywhere.** Write the failing test first, run it, watch it fail for the right reason, then implement. See "TDD discipline" below.
- **No `as any`.** The codebase forbids it (see `AGENTS.md`). Use type guards.
- **Don't put CLI code in `packages/cli`.** That's the server. Use the new `@n8n/cli` package.
- **Don't extend `BaseCommand` in the new CLI.** It boots the whole server. The new CLI uses commander/yargs/hand-rolled argv parsing.
- **Don't copy `test-workflow.tool.ts` verbatim** for the execute-node endpoint. It requires a trigger node. We synthesize a 2-node workflow with a Manual Trigger to sidestep the issue.

---

## TDD discipline

Every implementation task in this plan follows the same loop:

1. **Write the failing test first.** The test file is named in the task. Write the assertion that captures the acceptance criteria.
2. **Run it. Confirm it fails for the right reason** (e.g., "function not implemented" or "expected X, got undefined"). Not "module not found" — that means you haven't even imported correctly.
3. **Implement the minimal code** to make the test pass. Don't over-build.
4. **Run the test again. Confirm green.**
5. **Refactor if needed.** Run the test again. Still green.

### Test layers in n8n

| Layer | Framework | Pattern | Run command |
| --- | --- | --- | --- |
| Backend unit | Jest | Files alongside source: `foo.service.test.ts`. Mock external deps. Use shared `mock<T>()` for typed fixtures. | `pnpm --filter n8n test path/to/file.test.ts` |
| Frontend unit | vitest | `*.spec.ts` next to component | `pnpm --filter @n8n/editor-ui test path/to/file.spec.ts` |
| E2E | Playwright | `packages/testing/playwright/tests/e2e/` | `pnpm --filter=n8n-playwright test:local <path>` |
| API integration | Jest | `__tests__/*.api.test.ts` | `pnpm --filter n8n test path/to/file.api.test.ts` |

### One non-negotiable example

For Phase 1.1's `ExecuteNodeService`, the test goes first:

```ts
// packages/cli/src/executions/__tests__/execute-node.service.test.ts
describe('ExecuteNodeService', () => {
  it('executes a Set node and returns its output', async () => {
    const service = new ExecuteNodeService(/* mocked deps */);
    const result = await service.execute({
      user: mockUser,
      nodeType: 'n8n-nodes-base.set',
      parameters: { values: { string: [{ name: 'hello', value: 'world' }] } },
    });
    expect(result.status).toBe('success');
    expect(result.output).toEqual([{ hello: 'world' }]);
  });
});
```

Run: `pnpm --filter n8n test execute-node.service.test.ts` → fails with `Cannot find module './execute-node.service'`. Now you have permission to write code. Implement until green.

This isn't ceremony — it's the only way to catch the `manualExecutionService.runManually()` shape-mismatch surprises before they eat half a day.

---

## Operations parity across surfaces

A user shouldn't hit a dead end because one surface is missing a primitive. Every operation must be available on every surface:

| Operation | MCP | HTTP API | SDK | CLI |
| --- | --- | --- | --- | --- |
| Search nodes/tools | `n8n_search_tools` | `GET /rest/nodes/search` | `n8n.nodes.search()` | `n8n node search` |
| Get node/tool schema | inline in search results | `GET /rest/nodes/:id` | `n8n.nodes.get(id)` | `n8n node get` |
| List credentials | `n8n_list_credentials` | `GET /rest/credentials` (exists) | `n8n.credentials.list()` | `n8n credentials list` |
| Execute tool | `n8n_execute_tool` | `POST /rest/executions/node` | `n8n.<node>.<op>(...)` | `n8n exec` |
| Get execution | `get_execution` (exists) | `GET /rest/executions/:id` (exists) | `n8n.executions.get(id)` | `n8n executions get` |

---

## Dev environment & watch mode

Three terminals, hot reload on every save.

### Terminal A — n8n server + editor-ui in watch mode

```bash
cd /Users/filipetavares/git/n8n
pnpm install                    # first time only
pnpm dev                        # turbo dev across the workspace (server + frontend)
```

Open `http://localhost:5678`. Logs are noisy — filter with `pnpm dev 2>&1 | grep -v '^\[nodes-base\]'` if needed.

### Terminal B — SDK in watch mode

Once `@n8n/sdk` exists (Phase 0.4):

```bash
pnpm --filter @n8n/sdk dev      # tsc --watch (add this script in 0.4)
```

To consume from a test project:

```bash
cd packages/@n8n/sdk && pnpm build && pnpm link --global
cd ~/path/to/test-project && pnpm link --global @n8n/sdk
```

### Terminal C — testing

This is where `curl`, the CLI, `tsx <script>`, and the MCP inspector run.

### How to test the auth flow

```bash
./packages/@n8n/cli/bin/n8n auth login --url=http://localhost:5678
# CLI prints loopback URL, opens browser
# Approve in browser → redirect to localhost
# CLI prints "Logged in as <email>"
cat ~/.n8n/config.json   # verify token saved
```

Failure modes: browser doesn't open → copy URL from CLI output, paste manually. Loopback rejected (corporate firewall) → `--pat=<token>` fallback.

### How to test the CLI commands

```bash
# discover
./packages/@n8n/cli/bin/n8n node search "post slack"

# inspect tool
./packages/@n8n/cli/bin/n8n node get slack.message.send

# list credentials
./packages/@n8n/cli/bin/n8n credentials:list --node-type=slack

# execute (dry run)
./packages/@n8n/cli/bin/n8n exec:run slack.message.send \
  --credential <cred-id> \
  --param channel='<channel-id>' \
  --param text='hello' --dry-run
# expect: status=dry_run, wouldExecute populated

# execute for real
./packages/@n8n/cli/bin/n8n exec:run slack.message.send \
  --credential <cred-id> --param channel='<channel-id>' --param text='hello'
# expect: executionId, message arrives in Slack

# inspect execution
./packages/@n8n/cli/bin/n8n executions:get <executionId>
```

### How to test the SDK

```ts
// test-sdk.ts
import { createClient } from '@n8n/sdk';
const n8n = createClient({ baseUrl: 'http://localhost:5678', token: process.env.N8N_TOKEN! });
const result = await n8n.set.execute({ values: { string: [{ name: 'hello', value: 'world' }] } });
console.log(result);   // { hello: 'world' }
```

```bash
N8N_TOKEN=<token> pnpm tsx test-sdk.ts
```

### How to test the MCP server

**A. Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "n8n-local": { "url": "http://localhost:5678/mcp-server/http", "type": "http" }
  }
}
```

Restart Claude Desktop. Prompt: "Search n8n for Slack tools" → expect `n8n_search_tools` call.

**B. MCP inspector** — `npx @modelcontextprotocol/inspector http://localhost:5678/mcp-server/http`

### How to verify scope expansion

```bash
curl -s http://localhost:5678/.well-known/oauth-authorization-server | jq .scopes_supported
# expect: ["tool:listWorkflows","tool:getWorkflowDetails","node:execute","credential:read","tool:search"]
```

---

## Validation findings (peer review)

Six must-fix items before kickoff. Plan corrected inline; flagged here for visibility:

1. **Phase 1.1**: do NOT copy `test-workflow.tool.ts` verbatim — it requires a trigger node. Use `processRunExecutionData` with a pre-seeded `nodeExecutionStack[0]` pointing at the action node directly. (Recipe inline in 1.1.)
2. **Phase 0.3**: drop `RemoteBaseCommand`. The `@Command()` decorator forces DI regardless of base class. Write plain `@Command` classes that don't override `init`.
3. **Phase 4.3 codegen**: cut on day 1, not "if we lose a day." Hand-roll `.d.ts` for the 8 demo nodes; that IS the path.
4. **Phase 1.4 consent strings**: existing consent UI doesn't render scopes at all. Real work = 6h frontend+backend. For hackathon, **skip**; show the existing allow/deny.
5. **`@GlobalScope` decorator** on `POST /executions/node` is required by project policy.
6. **Scope enforcement in MCP middleware** — adding to `SUPPORTED_SCOPES` ≠ enforced. ~2h. Hackathon-OK to skip, ship-blocker.

Effort adjustments: 0.1 → 2-4h, 1.1 → 6-8h, 1.4 → cut, Phase 4 → 6-8h (codegen out), Phase 5 → 8-10h. Single-engineer total: ~10 days. Three-engineer parallel: ~6 days.

---

## Sequencing & parallelism overview

```
Phase 0 (Foundation)
  └── gates everything
       ├── Phase 1 (Server endpoint + scopes)        ┐
       ├── Phase 4 (SDK skeleton + codegen)          ├── parallel after P0
       └── Phase 3 (CLI: cli-client + RemoteBaseCmd) ┘
              │
              └── Phase 1 must land before:
                    ├── Phase 2 (MCP meta-tools — calls /executions/node)
                    ├── Phase 3.b (CLI commands that call the endpoint)
                    └── Phase 4.b (SDK proxy execution)

Phase 5 (UI attribution) — depends on Phase 1's metadata writes.
Phase 6 (Demo polish) — gates on everything.
```

**Parallel tracks recommended:** one engineer on Phases 1+5 (server/UI), one on Phase 2 (MCP tools), one on Phases 3+4 (client-side). Phase 0 done jointly day 1.

**Total honest estimate:** ~5 engineer-days for a working demo if three engineers run parallel; ~8 days for one engineer alone.

---

## Design issues — addressed

Each issue from the planning pass is resolved with a concrete decision below. Anything marked "deferred" lives in the post-hackathon production track at the end of this doc.

### 1. `single-node` mode requires auditing mode-discriminator sites

**Status:** resolved (audit complete)
**Decision:** alias `'single-node'` to `'manual'` everywhere **except telemetry and statistics**. Single-node is semantically a test/debug context — running one node in isolation — so it behaves like manual for execution hooks, persistence (soft-delete unsaved), credentials, logging, queue routing, push notifications. It's distinguished only where we want measurement to differ.

**Audit results: 21 discriminator sites.** Effort: **3-4h**.

**Alias-manual (treat exactly like manual)** — 13 sites:

| File:line | What it controls |
| --- | --- |
| `cli/src/workflow-runner.ts:291-295` | Post-execution promise handling in queue mode |
| `cli/src/workflow-runner.ts:675-688` | `needsFullExecutionData()` |
| `core/src/execution-engine/node-execution-context/utils/custom-data.ts:27,38` | Metadata error strictness |
| `cli/src/credentials-helper.ts:399` | Dynamic credential resolution skip |
| `cli/src/execution-lifecycle/execution-lifecycle-hooks.ts:536` | Static data save policy |
| `cli/src/execution-lifecycle/execution-lifecycle-hooks.ts:553` | Soft-delete unsaved executions |
| `cli/src/execution-lifecycle/execution-lifecycle-hooks.ts:572` | Skip error-workflow trigger |
| `cli/src/execution-lifecycle/execution-lifecycle-hooks.ts:594,671` | `pushRef` in waiting state |
| `cli/src/execution-lifecycle/execution-lifecycle-hooks.ts:609,657` | Static data save (sub-execution path) |
| `cli/src/execution-lifecycle/execution-lifecycle-hooks.ts:740` | Push notifications in worker mode |
| `cli/src/execution-lifecycle/execution-lifecycle-hooks.ts:782` | Soft-delete on completion |
| `cli/src/execution-lifecycle/execution-lifecycle-hooks.ts:801` | Skip error-workflow on failure |
| `core/src/execution-engine/node-execution-context/execute-context.ts:214` | Log routing to UI |
| `core/src/execution-engine/node-execution-context/supply-data-context.ts:368` | Log routing to UI |
| `cli/src/utils.ts:30` | Sub-workflow trigger error (alias-cli equivalent — same behavior) |

**Pattern:** wrap each check in a helper `isInteractiveExecution(mode)` that returns true for `'manual'` and `'single-node'`. One PR, one helper, one mass-edit. Existing call sites flip from `=== 'manual'` to `isInteractiveExecution(mode)`. ✅ DONE (Task 4).

**Own-branch (distinct behavior required)** — 5 sites:

| File:line | What it controls | Decision for single-node |
| --- | --- | --- |
| `cli/src/concurrency/concurrency-control.service.ts:202-220` | Queue routing (production / evaluation / none) | **No queue** (like manual/cli — transient calls shouldn't take queue slots) |
| `cli/src/workflows/workflow-execution.service.ts:233` | Queue offloading | **Do not offload** (run inline; we want low latency) |
| `cli/src/workflow-execute-additional-data.ts:210` (`isManualOrChatExecution`) | Draft vs. published sub-workflow versions | **Return false** for single-node — use published. Single-node calls shouldn't iterate on draft sub-workflows. |
| `cli/src/events/relays/telemetry.event-relay.ts:912` | `is_manual` telemetry flag | **`is_manual=false`**, add new `is_single_node=true` property |
| `cli/src/events/relays/log-streaming.event-relay.ts:241,271` | `isManual` log payload | Same — distinguish in logs |
| `cli/src/services/workflow-statistics.service.ts:35-56,104-105` | Root-execution classification | **`isModeRootExecution['single-node'] = false`** — debugging artifact, not a billed root execution |

**Safe-to-ignore** — 2 sites:

| File:line | Why |
| --- | --- |
| `cli/src/manual-execution.service.ts:106` | `=== 'evaluation'` branch — orthogonal |
| `cli/src/modules/mcp/tools/workflow-tool-factory.ts:247` | Agent-specific metadata; doesn't affect execution |

**Trigger/poll execution** (`core/src/execution-engine/workflow-execute.ts:1103,1123`, `triggers-and-pollers.ts:45`) — **N/A**. Hub is action-nodes-only; we never execute triggers. If somehow a trigger-typed node sneaks through, throwing is fine.

**Test first:**

```ts
// packages/workflow/src/__tests__/execution-modes.test.ts
import { isInteractiveExecution } from '../utils/execution-modes';
describe('isInteractiveExecution', () => {
  it.each([
    ['manual', true],
    ['single-node', true],
    ['trigger', false],
    ['webhook', false],
  ])('%s → %s', (mode, expected) => {
    expect(isInteractiveExecution(mode as WorkflowExecuteMode)).toBe(expected);
  });
});
```

Run: `pnpm --filter n8n-workflow test execution-modes.test.ts` → fails ("Cannot find module"). Implement the helper, run again, green. Then sweep call sites.

**Verification step:** after the mass-edit, run `pnpm typecheck` and the existing suite. Then a smoke test that single-node execution doesn't appear in `is_manual=true` telemetry, doesn't get queued, doesn't show as a root execution in statistics.

### 2. `@n8n/workflow-sdk` is the wrong shape

**Status:** resolved (with codegen restored)
**Decision:** SDK runtime is greenfield. **SDK codegen reuses workflow-sdk's utilities** to generate types for the full ~480-node catalog — not the 8 hand-rolled subset I'd initially cut.

The validator flagged the translation layer as 6-10h. That's accurate, but the alternative — hand-rolling 8 nodes — leaves 472 nodes without autocomplete and tells a bad story for the SDK pitch. **2 days for the full catalog vs 4h for 8 nodes is clearly the right trade.**

**Approach:** new `scripts/generate-types.ts` (~300 lines) in `@n8n/sdk`:

1. Read `packages/nodes-base/dist/types/nodes.json` (same source workflow-sdk uses).
2. Import workflow-sdk's property-to-TS converters from `@n8n/workflow-sdk/src/generate-types/*`.
3. For each action node, parse the resource/operation discriminator pattern (which workflow-sdk already does — we read its `buildDiscriminatorTree` output).
4. For each (resource, operation) tuple, emit a method signature:
   ```ts
   declare namespace Slack {
     namespace message {
       function send(params: { credentialId: string; channel: string; text: string; threadTs?: string }): Promise<SlackMessageSendOutput>;
     }
   }
   ```
5. Emit a runtime registry mapping `n8n.slack.message.send` → `{ nodeType: 'n8n-nodes-base.slack', resource: 'message', operation: 'post' }` so the Proxy knows how to dispatch.

**Coverage:** the ~80% of nodes that translate cleanly get full autocomplete. The ~20% touching `resourceLocator` / `loadOptions` / `resourceMapper` get types with `string` / `Record<string, unknown>` fallbacks for those specific properties — the rest of the operation still types correctly.

**Effort:** ~2 days (16h). Replaces "hand-roll 8 nodes ~4h."

### 3. `searchNodes` returns a string blob; `ParsedNodeType` missing fields

**Status:** resolved
**Decision:** Phase 2.1 adds `NodeCatalogService.searchNodesStructured(queries, opts)` that calls `NodeTypeParser.searchNodeTypes()` directly (returns `ParsedNodeType[]`, no LLM wrapper).
**Drop from v1 response shape:** `categories`, `score`. If categories are needed for filter UI later, fetch per-result via `parser.getNodeType()` — separate call, cached client-side. Score isn't exposed by the search engine; agents rely on returned order.

### 4. DCR conflict + `enforceClientLimit`

**Status:** resolved
**Decision:** dynamic registration on first `auth login`. Per-machine `client_id` stored in `~/.n8n/config.json`. No migration.
**Setup note (Phase 6.1 pre-flight):** verify `mcpMaxRegisteredClients` config on the demo instance is high enough — default is fine for one user + Claude Desktop + one CLI machine, but if you've been demoing repeatedly, registrations accumulate and you'll hit the cap. Cleanup command needed (parked).

### 5. Caller attribution is 8-10h, not 6h

**Status:** resolved
**Decision:** Phase 5 effort = 8-10h. Scope **trimmed**: keep the caller column on the executions list (the demo-load-bearing piece). The mode-filter chip ("Single-node calls") moves to the cut list. If we lose a day, the chip goes first.

### 6. `POST /executions/node` returns big payloads

**Status:** deferred
**Decision:** acceptable for hackathon — single-node calls in the demo return small payloads (Slack response, Linear list of 6 items). **Production phase 7:** streaming response (SSE or chunked transfer) for long-running nodes.

### 7. `RemoteBaseCommand` doesn't help

**Status:** resolved
**Decision:** **dropped**. The `@Command()` decorator (`packages/@n8n/decorators/src/command/command.ts:6-18`) calls `Service()(target)` unconditionally, so DI instantiation happens regardless of base class. The "lighter base" buys nothing.
**Replacement:** auth/tools/exec/credentials/executions commands are plain `@Command` classes that **don't override `init`** (so they skip `BaseCommand`'s DB setup). They boot in ~500ms because most `@Service` constructors are lazy.
**Phase 0.3 deleted.** Phase 3 task descriptions updated accordingly.

### 8. Consent UI doesn't render scopes at all

**Status:** deferred
**Decision:** **cut from hackathon.** The existing single allow/deny prompt stays as-is. Phase 1.4 ("consent screen strings") becomes a 5-minute task: update the well-known `scopes_supported` array and the existing prompt's static copy. Real per-scope rendering (plumb scopes through `OAuthSessionPayload` + `getConsentDetails` + Vue template + i18n keys = 6h) **moves to production phase 7**.

### 9. Scope enforcement at MCP tool layer

**Status:** deferred
**Decision:** **Phase 1.7 deferred to production must-fix list.** Hackathon demo works because we control both client and server — the OAuth flow grants the scopes we ask for; the server doesn't yet check them per tool. Anyone authenticated by any path gets the new tools, which is fine in a controlled demo.
**Production phase 7 task:** MCP middleware checks `authInfo.scopes.includes('node:execute' | 'tool:search' | 'credential:read')` per tool. ~2h.

### 10. `@GlobalScope` decorator required on new routes

**Status:** resolved
**Decision:** Phase 1.2 controller MUST decorate `POST /executions/node` with `@GlobalScope('node:execute')`. If `node:execute` doesn't exist in `@n8n/permissions`, **add it first** as Phase 1.2.a (a 30min sub-task before the controller task itself).

### 11. Slack channel `resourceLocator` (and similar in demo nodes)

**Status:** resolved
**Decision:** the hackathon convention is **always pass IDs, never names**. ID-only inputs at every resourceLocator boundary. Pre-flight (Phase 6.1) verifies real IDs for every resourceLocator-using node in the demo set:
- **Slack** `channel` → channel ID (`C0123ABC`)
- **Linear** `team`, `project` → IDs
- **GitHub** `repository` → `owner/repo` string
- **Notion** `database` → database ID
- **Gmail** `labelIds` → label IDs

Pre-flight script: a 10-line bash snippet that hits each connected credential, lists the relevant resources, and prints IDs to copy into the demo prompts. Lives in `packages/cli/src/commands/_demo/preflight.ts` (Phase 6.1).

---

## Hackathon shortcuts — production handoff

Every corner we cut to fit the week is listed below. Each entry: what the hackathon does (so the production team can find it), what production should do, rough effort. This is the canonical handoff doc — if it's not on this list, it isn't a shortcut.

### Auth & security

| Shortcut | Hackathon behavior | Production fix | Effort |
| --- | --- | --- | --- |
| **No scope enforcement at MCP tool layer** | Any authenticated client gets the three new tools regardless of granted scopes. We control both sides in the demo. | MCP middleware checks `authInfo.scopes.includes(...)` per tool. | ~2h |
| **No per-scope consent UI** | Existing single allow/deny prompt. Talk track mentions the new scopes. | Plumb scopes through `OAuthSessionPayload` + `getConsentDetails` + Vue template + i18n keys. | ~6h |
| **CLI tokens stored unencrypted** | `~/.n8n/config.json` with file mode 0600. | OS keychain via `keytar` or equivalent. | ~4h |
| **No retry on OAuth flow failure** | First failure shows error, exits. | Backoff + clearer recovery prompts. | ~2h |
| **No per-token credential scoping** | Tokens get all the user's credentials. | `allowedCredentialIds: string[] \| null` column + middleware check + UI for selection. | 1-2 weeks |
| **No rate limiting on `POST /executions/node`** | Endpoint accepts any rate. | Per-token, per-credential limits using existing `Throttle` decorator. | ~1d |

### Engine

| Shortcut | Hackathon behavior | Production fix | Effort |
| --- | --- | --- | --- |
| **`single-node` aliases `manual`** | Identical execution behavior (queue dispatch, redaction, quotas). Telemetry distinguishes. | Audit whether single-node needs distinct quotas, retry policies, or rate-limit buckets. | ~1d audit |
| **No streaming response** | Full payload buffered + returned. | SSE or chunked transfer for long-running nodes. | ~1 week |
| **No execution payload size limits** | Return full output regardless of size. | Cap output, return truncated + `outputUrl` to download full. | ~3h |

### Catalog & search

| Shortcut | Hackathon behavior | Production fix | Effort |
| --- | --- | --- | --- |
| **Search drops `categories` and `score`** | v1 returns `{ nodeId, displayName, description }` only. | Join via `parser.getNodeType()` for categories; expose ranking score. | ~2h |
| **Keyword + tag match ranking** | No semantic ranking. | Embedding-based reranking via existing AI infra. | ~1 week |
| **`displayOptions` ignored in `inputSchema`** | Agents see all fields; rely on field descriptions to figure out applicability. | Encode in JSON Schema with `allOf`/`if`/`then`. | ~1 week |
| **`loadOptions` not exposed** | Agents pass raw IDs; no companion list operations. | Per-node `<node>_list_<resource>` companion tools. | ~1 week |
| **`resourceLocator` ID-only** | Hackathon convention: always pass IDs, never names. Pre-flight verifies. | Union type with `byName`/`byId`/`byUrl` helpers + extraction. | ~3d |
| **`resourceMapper` typed as `Record<string, unknown>`** | Runtime validates only. | Fetch schema at SDK call time + validate before dispatch. | ~1 week |

### SDK

| Shortcut | Hackathon behavior | Production fix | Effort |
| --- | --- | --- | --- |
| **Hand-rolled `.d.ts` for 8 hero nodes** | Slack, Linear, GitHub, Notion, Google Sheets, Gmail, HTTP Request, Postgres. Other nodes work at runtime via Proxy but no types. | Codegen from `nodes.json` for the full catalog. | ~1 week |
| **No client-side schema validation** | Server validates; errors come back as exceptions. | Optional client-side via shipped Zod schemas to fail fast. | ~3d |
| **No `pull` command for custom-node types** | Users with custom nodes use untyped fallback. | `npx @n8n/sdk pull --instance <url>` regenerates types per instance. | ~3d |
| **SDK methods pinned to specific node versions** | Whatever was in `nodes.json` at build time. | Version negotiation + multiple-version overloads. | ~3d |

### CLI

| Shortcut | Hackathon behavior | Production fix | Effort |
| --- | --- | --- | --- |
| **Cross-platform browser-open quirks** | If browser doesn't open, copy URL manually. | Detect and prompt clearly per OS. | ~2h |
| **No DCR cleanup** | Repeated `auth:login` registers new clients; cap reached eventually. | Admin command to GC unused clients (`n8n admin:oauth:clean --older-than=30d`). | ~3h |

### UI

| Shortcut | Hackathon behavior | Production fix | Effort |
| --- | --- | --- | --- |
| **No mode-filter chip on executions list** | Caller column only; users see single-node executions mixed in. | Filter chip for "single-node calls" in `ExecutionsFilter.vue`. | ~4h |
| **No Connected Apps page** | Tokens managed via CLI; no in-product visibility into who's connected. | Dedicated page listing authorized OAuth clients with revoke. | ~1 week |
| **No audit trail UI** | Metadata written to DB but no dedicated viewer. | Execution detail panel surfaces caller, parameters, output cleanly. | ~3d |

### Tests & quality

| Shortcut | Hackathon behavior | Production fix | Effort |
| --- | --- | --- | --- |
| **Unit tests for the new endpoint only** | Smoke tests confirm hot path. | Full unit + integration suites across all new code. | ~1 week |
| **No load tests** | Single-user demo. | Load test concurrent SDK calls + MCP sessions. | ~3d |

**Total production hardening:** ~4-6 engineer-weeks on top of the hackathon week.


---

## Phase 0 — Foundation (Day 1, ~6h)

**Goal:** unblock all parallel tracks. Add the execution mode value, sketch package layouts, stub new files so other tracks can import.

### 0.1 Add `'single-node'` to `WorkflowExecuteModeList` ✅ DONE

**Files:**
- `packages/workflow/src/execution-context.ts` — append `'single-node'`.
- `packages/workflow/src/__tests__/` — update list tests.

**Acceptance:** `pnpm typecheck` passes monorepo-wide.

**Test:**
```bash
pnpm --filter n8n-workflow build
pnpm --filter @n8n/db build
pnpm --filter n8n typecheck
```

**Effort:** 30min · **Risk:** low · **Blocks:** Phases 1, 5.

### 0.2 Scaffold `packages/@n8n/cli/` (standalone CLI package) ✅ DONE (already exists)

**Adaptation:** the package already exists (oclif-based, API-key auth at `~/.n8n-cli/config.json`, bin `n8n-cli`). We **reuse it** rather than scaffolding a parallel package. New commands (`node search`, `node get`, `exec run`, `executions get`) are added to the existing structure. OAuth login is added as an alternative auth method alongside the existing API-key login.

**Files (new, stubs):**
- `packages/@n8n/cli/package.json` — name `@n8n/cli`, bin `n8n`, deps `axios`/`open`/arg-parser only.
- `packages/@n8n/cli/tsconfig.json`
- `packages/@n8n/cli/bin/n8n` — shebang + require dist/index.js
- `packages/@n8n/cli/src/index.ts` — empty argv dispatcher
- `packages/@n8n/cli/src/{config,http-client,oauth-flow}.ts` — stubs

**Acceptance:** `pnpm --filter @n8n/cli build` succeeds; bin runs and prints help text.

**Effort:** 1h.

### 0.3 ~~Scaffold `RemoteBaseCommand`~~ — DROPPED

The `@Command()` decorator forces DI regardless of base class — see design issue #7. We sidestep this entirely by putting CLI code in the new `@n8n/cli` package, which doesn't use `@n8n/decorators` at all. Plain TypeScript functions dispatched by an argv parser.

<details>
<summary>Original Phase 0.3 task (kept for reference)</summary>

```ts
export abstract class RemoteBaseCommand<F = never> {
  readonly flags: F;
  protected http!: ReturnType<typeof createHttpClient>;
  async init() { /* load config, build http client */ }
  abstract run(): Promise<void>;
  async finally() {}
}
```

**Critical:** do not extend `BaseCommand`. Do not import `@n8n/db`, `load-nodes-and-credentials`, `active-executions`. The point is to skip booting the server.

**Acceptance:** test command runs in <500ms vs `BaseCommand`'s ~5s.

**Effort:** 1h · **Risk:** medium (decorator may pull DI).

</details>

### 0.4 Scaffold `packages/@n8n/sdk/` ✅ DONE

**Files:** `package.json`, `tsconfig.json`, `src/{client,proxy,auth,pull}.ts`, `scripts/generate-types.ts`, `README.md`.

**Acceptance:** `pnpm --filter @n8n/sdk build` succeeds.

**Effort:** 1h.

### 0.5 Decision: CLI OAuth client = dynamic registration on first login

No migration. Per-machine `client_id` stored in `~/.n8n/config.json`. The CLI's `auth login` calls `POST /mcp-oauth/register` with `client_name: "n8n-cli@<hostname>"`, then runs the loopback authorization code grant.

---

## Phase 1 — Server: `POST /executions/node` + scope expansion (Day 2, ~10h)

**Goal:** the foundational endpoint every other phase depends on.

### 1.1 Build `ExecuteNodeService` — hackathon shortcut ✅ DONE

**File:** `packages/cli/src/executions/execute-node.service.ts`

**Shape:** `execute({ user, nodeType, nodeVersion?, parameters, credentialId, dryRun? })`

**The simplest path that works:** synthesize a **2-node workflow** — `ManualTrigger → ActionNode` — and use `ManualExecutionService.runManually()` exactly as it's written today. The engine demands a trigger; we give it a no-op one. Sidesteps the "no trigger" trap entirely.

**Effort: ~3h. Risk: low** (no novel code path; reuses existing flow verbatim).

**The shortcut explained:**

```ts
const workflowData = {
  id: uuid(),
  name: '__single-node__',
  nodes: [
    {
      name: 'Trigger',
      type: 'n8n-nodes-base.manualTrigger',  // no-op trigger
      typeVersion: 1,
      parameters: {},
      position: [0, 0],
    },
    {
      name: 'Action',
      type: nodeType,                         // the user's actual node
      typeVersion: nodeVersion ?? latestVersion,
      parameters,
      credentials: credentialId
        ? { [credentialType]: { id: credentialId, name: credentialName } }
        : {},
      position: [200, 0],
    },
  ],
  connections: {
    'Trigger': { main: [[{ node: 'Action', type: 'main', index: 0 }]] },
  },
  active: false, pinData: {}, settings: {},
};
return manualExecutionService.runManually({ workflowData, userId: user.id, executionMode: 'single-node' });
```

**Test first:**

```ts
// packages/cli/src/executions/__tests__/execute-node.service.test.ts
describe('ExecuteNodeService', () => {
  it('runs a Set node via Manual Trigger and returns its output', async () => {
    const result = await service.execute({
      user: mockUser,
      nodeType: 'n8n-nodes-base.set',
      parameters: { values: { string: [{ name: 'hello', value: 'world' }] } },
    });
    expect(result.status).toBe('success');
    expect(result.output[0].json).toEqual({ hello: 'world' });
    expect(result.executionId).toMatch(/^[a-f0-9-]+$/);
  });

  it('returns dry_run result without invoking the node', async () => {
    const result = await service.execute({ ...args, dryRun: true });
    expect(result.status).toBe('dry_run');
    expect(result.wouldExecute).toBeDefined();
  });

  it('rejects credential whose type does not match node', async () => {
    await expect(service.execute({ ...args, credentialId: 'wrong-type-cred' }))
      .rejects.toThrow(/credential type/i);
  });
});
```

Run: `pnpm --filter n8n test execute-node.service.test.ts` → all red. Implement. Watch them turn green one by one.

**Steps:**
1. Resolve node by `nodeTypes.getByNameAndVersion(type, version)`.
2. Credential check: `credentialsService.getOne(user, credentialId)`; verify `credential.type ∈ node.description.credentials[]`.
3. Build the 2-node workflow object (above).
4. `dryRun: true` → validate parameters, return `{ status: 'dry_run', wouldExecute: { ... } }`. No invocation.
5. Else, `await manualExecutionService.runManually({...})`. Engine handles the rest.
6. `await activeExecutions.getPostExecutePromise(executionId)`.
7. After completion, write caller metadata to `ExecutionMetadata`: `caller.kind`, `caller.name`, `caller.clientId`, `nodeType`, `operation`, `credentialId`.
8. Return `{ executionId, status, output, executionUrl }`. **`output`** = `runData['Action'][0].data.main[0]` (the action node's first output; ignore the trigger's empty output).

**What this gets us for free:**
- Real `ExecutionEntity` row with `data.resultData.runData['Action']` containing input + output.
- Real timing (`startedAt`/`stoppedAt`).
- Real lifecycle hooks fire.
- Credential decryption via the standard `additionalData.getCredentials` path.
- The Phase 5 detail view hides the trigger node from the single-node panel (one extra line in 5.3 — easy).

**Documented shortcut (production handoff):** Phase 7 task — replace the 2-node synthesis with a pure 1-node execution by pre-seeding `nodeExecutionStack[0]` in a custom `WorkflowRunner` invocation. Pure cleanup — no behavior change. ~3-4h. Listed in the Shortcuts table below.

<details>
<summary>Original "correct" recipe (post-hackathon — for reference only)</summary>

The proper 1-node execution path (route through `WorkflowRunner.run` with pre-seeded execution data, not `runManually`'s trigger-finding path):

1. Resolve `nodeType` via `nodeTypes.getByNameAndVersion(type, version)`. Read `description.credentials[]` for the expected credential type.
2. **Credential type check:** if `credentialId` provided, fetch via `credentialsService.getOne(user, id)` and verify its `type` is in the node's expected credentials. Reject if not (otherwise an attacker can pass any cred and crash inside the node).
3. Authorization: `credentialsService.getOne` already throws `NotFound` for inaccessible credentials. Let it throw.
4. Synthesize the workflow object:
   ```ts
   const workflowData = {
     id: uuid(),
     name: '__single-node__',
     nodes: [{
       id: uuid(),
       name: 'Node',
       type: nodeType,
       typeVersion: nodeVersion ?? latestVersion,
       parameters,
       credentials: credentialId ? { [credentialType]: { id: credentialId, name } } : {},
       position: [0, 0] as [number, number],
     }],
     connections: {},
     active: false,
     pinData: {},
     settings: {},
   };
   ```
5. **Build `executionData` with `nodeExecutionStack[0]` pointing at the action node directly:**
   ```ts
   const runExecutionData: IRunExecutionData = {
     startData: {},
     resultData: { runData: {} },
     executionData: {
       contextData: {},
       nodeExecutionStack: [{
         node: workflowData.nodes[0],
         data: { main: [[{ json: {} }]] },
         source: null,
       }],
       metadata: {},
       waitingExecution: {},
       waitingExecutionSource: {},
     },
   };
   ```
   This routes via `WorkflowExecute.processRunExecutionData()` (see `workflow-runner.ts:409-418`) and skips the trigger-finding step entirely.
6. `dryRun: true` → validate parameters against node schema, do NOT run. Return `{ status: 'dryRun', validated: true, plannedNode: workflowData.nodes[0] }`.
7. Else, `await workflowRunner.run({ executionMode: 'single-node', workflowData, executionData: runExecutionData, userId: user.id })`. Get `executionId`.
8. `await activeExecutions.getPostExecutePromise(executionId)` for completion. (Verified at `workflow-runner.ts:297`.)
9. **After** post-execute, write `ExecutionMetadata` rows: `caller.kind`, `caller.id`, `caller.name`, `nodeType`, `operation`, `credentialId`. Don't write mid-execution — you'd race lifecycle hooks.
10. Return `{ executionId, status, output }`.

**Reference:** `packages/cli/src/workflow-runner.ts:409-418`, `manual-execution.service.ts`.

**Hardest part:** verifying `processRunExecutionData` accepts our minimal `executionData` shape. Run a smoke test with a `Set` node first (no credentials, deterministic output) before testing with Slack.

### 1.2 Controller route + `@GlobalScope` ✅ DONE

**Test first:**

```ts
// packages/cli/src/executions/__tests__/executions.controller.api.test.ts
it('POST /executions/node returns 200 + executionId for valid request', async () => {
  const res = await api.post('/rest/executions/node')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ nodeType: 'n8n-nodes-base.set', parameters: { values: { string: [{ name: 'k', value: 'v' }] } } });
  expect(res.status).toBe(200);
  expect(res.body.executionId).toMatch(/.+/);
});

it('returns 401 without auth', async () => {
  expect((await api.post('/rest/executions/node').send({})).status).toBe(401);
});

it('returns 403 without node:execute scope', async () => {
  const res = await api.post('/rest/executions/node')
    .set('Authorization', `Bearer ${tokenWithoutScope}`).send({});
  expect(res.status).toBe(403);
});

it('rejects malformed body with 400', async () => {
  const res = await api.post('/rest/executions/node')
    .set('Authorization', `Bearer ${userToken}`).send({ nodeType: '' });
  expect(res.status).toBe(400);
});
```

Run → red. Implement controller + DTO + scope decorator → green.

**Files:**
- `packages/cli/src/executions/executions.controller.ts` — `@Post('/node')` handler with `@GlobalScope('node:execute')`.
- `packages/cli/src/executions/dto/execute-node-request.dto.ts` — Zod body: `{ nodeType, nodeVersion?, parameters, credentialId?, dryRun? }`.
- `packages/@n8n/permissions/...` — add `node:execute` if not present.

**Manual smoke (post-green):**
```bash
curl -X POST http://localhost:5678/rest/executions/node \
  -H "X-N8N-API-KEY: <pat>" \
  -H "Content-Type: application/json" \
  -d '{"nodeType":"n8n-nodes-base.set","parameters":{"values":{"string":[{"name":"hello","value":"world"}]}}}'
# expect: {"executionId":"...","status":"success","output":[{"json":{"hello":"world"}}]}
```

### 1.3 Expand OAuth scopes ✅ DONE

**Files:**
- `packages/cli/src/modules/mcp/mcp-oauth-service.ts` — `SUPPORTED_SCOPES = ['tool:listWorkflows','tool:getWorkflowDetails','node:execute','credential:read','tool:search']`.
- Update `__tests__/mcp.oauth.controller.api.test.ts`, `mcp-oauth-service.test.ts`.

### 1.4 Consent screen strings ✅ ROLLED INTO 1.3

The current consent service (`mcp-oauth-consent.service.ts`) and consent UI render only `{ clientName, clientId }` — no per-scope strings. Per design issue #8, per-scope rendering is deferred to production phase 7. The "5-minute task" of updating well-known `scopes_supported` is already covered by Task 1.3 (which adds the scopes to `SUPPORTED_SCOPES`, the source the well-known endpoint reads). No additional changes needed for hackathon.

**File:** `packages/cli/src/modules/mcp/mcp-oauth-consent.service.ts` (or editor-ui equivalent).

Strings:
- `node:execute` → "Execute n8n nodes on your behalf using your connected credentials"
- `credential:read` → "List your connected credentials (names and types only — never secret data)"
- `tool:search` → "Search the n8n node catalog"

**Test:**
```bash
pnpm --filter n8n start
curl -s http://localhost:5678/.well-known/oauth-authorization-server | jq .scopes_supported
# expect: node:execute, credential:read, tool:search present
```

### 1.5 REST parity endpoints ✅ DONE

**Files:**
- `packages/cli/src/controllers/nodes.controller.ts` (new) — `GET /rest/nodes/search?q=...&hasCredential=...` and `GET /rest/nodes/:id`. Both wrap `NodeCatalogService.searchNodesStructured` and a new `getNodeSchema(nodeId)` method. Same shape the MCP meta-tool returns.

`GET /rest/credentials` and `GET /rest/executions/:id` already exist in the public API; no new code needed there.

**Acceptance:** `curl /rest/nodes/search?q=slack` returns the same shape `n8n_search_tools` does over MCP.

**Effort:** 2h.

**Phase 1 total:** ~12h · **Hardest:** 1.1 step 4 · **Risk:** high if credential resolution doesn't work first try · **Gates:** Phases 2, 3.b, 4.b.

---

## Phase 2 — MCP meta-tools (Day 2-3 parallel, ~6h)

### 2.1 `searchNodesStructured` on `NodeCatalogService` ✅ DONE

**Test first:**

```ts
// packages/cli/src/node-catalog/__tests__/node-catalog.service.test.ts
it('searchNodesStructured returns structured results, not a string blob', async () => {
  const results = await service.searchNodesStructured(['slack']);
  expect(Array.isArray(results)).toBe(true);
  expect(results[0]).toMatchObject({
    nodeId: expect.stringMatching(/slack/i),
    displayName: expect.any(String),
    description: expect.any(String),
  });
});
```

**File:** `packages/cli/src/node-catalog/node-catalog.service.ts`. Call `NodeTypeParser.searchNodeTypes()` directly. Drop `categories`/`score` from v1 (per design decision #3). Return `Array<{ nodeId, displayName, description }>`.

### 2.2 `n8n_search_tools` tool ✅ DONE

**Test first:**

```ts
// packages/cli/src/modules/mcp/tools/__tests__/n8n-search-tools.tool.test.ts
it('returns inline user credentials matching the node type', async () => {
  const result = await tool.execute({ query: 'slack', filters: { hasCredential: true } });
  expect(result.results[0].userCredentials).toContainEqual({
    id: expect.any(String),
    name: expect.stringMatching(/slack/i),
  });
});

it('result.id is "<nodeType>.<operation>" shape', async () => {
  const result = await tool.execute({ query: 'slack' });
  expect(result.results[0].id).toMatch(/^[a-z0-9]+\.[a-z0-9.]+$/i);
});

it('inputSchema is JSON Schema, not a TS code string', async () => {
  const result = await tool.execute({ query: 'slack' });
  expect(result.results[0].inputSchema.type).toBe('object');
  expect(result.results[0].inputSchema.properties).toBeDefined();
});
```

**File:** `packages/cli/src/modules/mcp/tools/n8n-search-tools.tool.ts`. Enrich each result via `credentialsService.getMany(user, { filter: { type } })`. `inputSchema` v1 from `description.properties[*]`, skipping `displayOptions`/`loadOptions`/`resourceLocator`/`resourceMapper`.

### 2.3 `n8n_execute_tool` tool ✅ DONE

**Test first:**

```ts
// packages/cli/src/modules/mcp/tools/__tests__/n8n-execute-tool.tool.test.ts
it('parses id into nodeType + operation, calls ExecuteNodeService', async () => {
  const spy = jest.spyOn(executeNodeService, 'execute');
  await tool.execute({ id: 'slack.message.send', credentialId: 'c1', params: { channel: '#x', text: 'hi' } });
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({
    nodeType: expect.stringContaining('slack'),
    parameters: expect.objectContaining({ resource: 'message', operation: 'send' }),
  }));
});

it('passes dryRun through', async () => {
  await tool.execute({ id: 'slack.message.send', dryRun: true, params: {} });
  expect(executeNodeService.execute).toHaveBeenCalledWith(
    expect.objectContaining({ dryRun: true }),
  );
});
```

**File:** `packages/cli/src/modules/mcp/tools/n8n-execute-tool.tool.ts`. Thin shim.

### 2.4 `n8n_list_credentials` tool ✅ DONE

**Test first:**

```ts
// packages/cli/src/modules/mcp/tools/__tests__/n8n-list-credentials.tool.test.ts
it('filters by nodeType resolved to credential type', async () => {
  const result = await tool.execute({ nodeType: 'slack' });
  result.credentials.forEach(c => expect(c.type).toMatch(/slack/i));
});

it('never returns secret material', async () => {
  const result = await tool.execute({});
  result.credentials.forEach(c => {
    expect(c).not.toHaveProperty('data');
    expect(c).not.toHaveProperty('apiKey');
  });
});
```

**File:** `packages/cli/src/modules/mcp/tools/n8n-list-credentials.tool.ts`. Different name from existing `list_credentials` so both coexist.

### 2.5 Register the three ✅ DONE

**File:** `packages/cli/src/modules/mcp/mcp.service.ts` — `getServer()`, top of registration list.

**Test:**
```bash
# Claude Desktop + n8n MCP connected:
# Prompt: "Search n8n for tools related to Slack"
#   → expect n8n_search_tools call, Slack operations returned
# Prompt: "Send 'hello' to #test in Slack using credential <id>"
#   → expect n8n_execute_tool call, message arrives
```

**Phase 2 total:** ~6h · **Hardest:** 2.1 (parser surface buried in ai-workflow-builder) · **Risk:** medium.

---

## Phase 3 — `@n8n/cli` (new standalone package) (Day 2-3 parallel, ~10h)

**Goal:** a tiny standalone CLI package — `npx @n8n/cli auth login` installs in seconds, not minutes. The current `packages/cli` IS the n8n server (DB drivers, all 480+ nodes, the execution engine); installing it just to hit an HTTP endpoint is absurd.

**Package shape:**

```text
packages/@n8n/cli/                  # new workspace package
├── package.json                    # name: "@n8n/cli", bin: { n8n: "./bin/n8n" }
├── tsconfig.json
├── bin/
│   └── n8n                         # shebang + require dist/index.js
├── src/
│   ├── index.ts                    # arg parsing dispatcher
│   ├── config.ts                   # ~/.n8n/config.json
│   ├── http-client.ts              # axios + token injection
│   ├── oauth-flow.ts               # PKCE + loopback callback
│   └── commands/
│       ├── auth/{login,logout}.ts
│       ├── tools/{search,get}.ts
│       ├── exec/run.ts
│       ├── credentials/list.ts
│       └── executions/get.ts
└── README.md
```

**Dependencies (the entire dep tree):**

- `axios` (HTTP)
- `open` (browser-open)
- Some arg parser — `commander` (~50KB) or hand-rolled (`process.argv` parsing, ~40 lines)
- Optional: `picocolors` for terminal colors
- That's it. No DI container, no DB drivers, no node-execution engine.

**Total install: ~5-10 MB**, vs. the server's ~500 MB.

**No `@n8n/decorators`, no `@Command()`, no `BaseCommand`.** We're escaping the DI framework entirely by leaving the server package — which also resolves the validator's "RemoteBaseCommand buys nothing" finding. Plain TypeScript classes / functions, dispatched by a hand-rolled `argv` parser.

**Usage patterns:**

```bash
# Try once
npx @n8n/cli auth login --url=https://n8n.company.io

# Install persistently
npm i -g @n8n/cli
n8n auth login --url=https://n8n.company.io
n8n node search slack
n8n exec slack.message.send --credential cred_xyz --param channel=C0123 --param text='hi'

# During hackathon dev
pnpm --filter @n8n/cli build
./packages/@n8n/cli/bin/n8n auth login --url=http://localhost:5678
```

All Phase 3 work lives in **`packages/@n8n/cli/`** (the new standalone package). Tests use Jest. Mock the HTTP layer with `nock` or `msw`. **Do NOT** import from `packages/cli/` — that's the server, and pulling it in defeats the whole point of the separate package.

### 3.1 `cli-client/config.ts`

**Test first:**

```ts
// packages/@n8n/cli/src/__tests__/config.test.ts
it('saveConfig writes to ~/.n8n/config.json with mode 0600', async () => {
  await saveConfig({ baseUrl: 'http://x', accessToken: 'abc' });
  const stat = await fs.stat(`${os.homedir()}/.n8n/config.json`);
  expect(stat.mode & 0o777).toBe(0o600);
  expect(await loadConfig()).toMatchObject({ baseUrl: 'http://x', accessToken: 'abc' });
});

it('loadConfig returns null when file is missing', async () => {
  await clearConfig();
  expect(await loadConfig()).toBeNull();
});
```

Type: `{ baseUrl, clientId?, accessToken?, refreshToken?, tokenExpiresAt? }`. Three functions: `loadConfig`, `saveConfig`, `clearConfig`.

### 3.2 `cli-client/http-client.ts`

**Test first:**

```ts
// packages/@n8n/cli/src/__tests__/http-client.test.ts
it('adds Authorization: Bearer <token> to every request', async () => {
  nock('http://x').get('/anything').matchHeader('authorization', 'Bearer abc').reply(200, {});
  const c = createHttpClient({ baseUrl: 'http://x', token: 'abc' });
  await c.get('/anything');
});

it('refreshes once on 401 and retries', async () => {
  nock('http://x').get('/anything').reply(401);
  nock('http://x').post('/mcp-oauth/token').reply(200, { access_token: 'new' });
  nock('http://x').get('/anything').matchHeader('authorization', 'Bearer new').reply(200, {});
  const c = createHttpClient({ baseUrl: 'http://x', token: 'old', refreshToken: 'r' });
  await c.get('/anything');
});
```

### 3.3 `cli-client/oauth-flow.ts`

**Test first:**

```ts
// packages/@n8n/cli/src/__tests__/oauth-flow.test.ts
it('completes the loopback PKCE flow end-to-end with a mocked server', async () => {
  // mock /mcp-oauth/register, /authorize (auto-approve), /token
  nock('http://x').post('/mcp-oauth/register').reply(200, { client_id: 'cli-1' });
  // simulate authorize redirect by hitting the loopback URL directly in test
  // assert browser-open was called with correct query params
  // assert /mcp-oauth/token called with verifier + code
  const tokens = await runLoopbackAuthCodeFlow({ baseUrl: 'http://x', scopes: ['node:execute'] });
  expect(tokens.access_token).toBeDefined();
});
```

Steps:
1. `http.createServer` on port 0 (random free port).
2. If no `clientId` in config, `POST /mcp-oauth/register` with `client_name: "n8n-cli@<hostname>"`, `redirect_uris: ["http://127.0.0.1:<port>/callback"]`, `grant_types: ["authorization_code","refresh_token"]`, `token_endpoint_auth_method: "none"`.
3. PKCE verifier + challenge.
4. Open browser to `<baseUrl>/mcp-oauth/authorize?response_type=code&client_id=...&redirect_uri=...&code_challenge=...&code_challenge_method=S256&scope=node:execute+credential:read+tool:search&state=<random>`.
5. Wait for callback, validate state, extract code.
6. `POST /mcp-oauth/token` with code + verifier.
7. Store tokens. Print "Logged in as <email>" from `/rest/me`.

**Hardest:** cross-platform browser open. Use `open` npm package.

### 3.4 `commands/auth/{login,logout}.ts`

**Test first:**

```ts
// packages/@n8n/cli/src/commands/auth/__tests__/login.test.ts
it('writes tokens to config and prints "Logged in to <url>"', async () => {
  jest.spyOn(oauthFlow, 'runLoopbackAuthCodeFlow').mockResolvedValue({ access_token: 'a', refresh_token: 'r' });
  await runLogin({ url: 'http://x' });
  expect((await loadConfig())?.accessToken).toBe('a');
  expect(stdout).toContain('Logged in to http://x');
});
```

**Shape** (no `@Command` decorator — we're in `@n8n/cli`, not the server):

```ts
// packages/@n8n/cli/src/commands/auth/login.ts
export async function runLogin(args: { url: string }) {
  const tokens = await runLoopbackAuthCodeFlow({ baseUrl: args.url, ... });
  await saveConfig({ baseUrl: args.url, ...tokens });
  console.log(`Logged in to ${args.url}`);
}
```

Dispatcher in `src/index.ts` parses `argv` (use `commander` or hand-roll), routes `auth login` → `runLogin`, `auth logout` → `runLogout` (which calls `clearConfig()` + token revoke).

**Manual smoke:**
```bash
./packages/@n8n/cli/bin/n8n auth login --url=http://localhost:5678
# browser opens, click consent, returns
# expect: "Logged in to http://localhost:5678"
cat ~/.n8n/config.json   # tokens present
./packages/@n8n/cli/bin/n8n auth logout
cat ~/.n8n/config.json   # tokens cleared
```

### 3.5 `commands/node/search.ts`

**Test first:**

```ts
// packages/@n8n/cli/src/commands/node/__tests__/search.test.ts
it('hits GET /rest/tools/search and prints a table', async () => {
  nock('http://x').get('/rest/nodes/search').query({ q: 'slack' })
    .reply(200, { results: [{ id: 'slack.message.send', displayName: 'Send Slack' }] });
  await runToolsSearch({ query: 'slack' });
  expect(stdout).toContain('slack.message.send');
});
```

### 3.6 `commands/exec.ts`

**Test first:**

```ts
// packages/@n8n/cli/src/commands/exec/__tests__/run.test.ts
it('POSTs to /rest/executions/node with parsed params', async () => {
  nock('http://x').post('/rest/executions/node', {
    nodeType: 'slack', operation: 'message.send', credentialId: 'c1',
    parameters: { channel: '#test', text: 'hi' },
  }).reply(200, { executionId: 'e1', status: 'success', output: {} });
  await runExec({ toolId: 'slack.message.send', params: ['channel=#test', 'text=hi'], credential: 'c1' });
  expect(stdout).toMatch(/executionId: e1/);
});

it('--dry-run sends dryRun: true', async () => {
  nock('http://x').post('/rest/executions/node', body => body.dryRun === true).reply(200, {});
  await runExec({ ..., dryRun: true });
});
```

`n8n exec <toolId> --param key=value --credential <id> [--dry-run] [--input @file.json]`.

### 3.7 `commands/node/get.ts`

`n8n node get <toolId>` → `GET /rest/nodes/:id`, prints input schema as a doc. Test: assert pretty-print contains schema properties.

### 3.8 `commands/credentials/list.ts`

**Test first:**

```ts
it('lists credentials, optionally filtered by node-type', async () => {
  nock('http://x').get('/rest/credentials').query({ type: 'slackOAuth2Api' })
    .reply(200, [{ id: 'c1', name: 'Slack', type: 'slackOAuth2Api' }]);
  await runCredentialsList({ nodeType: 'slack' });
  expect(stdout).toContain('Slack');
});
```

`n8n credentials list [--node-type=<type>]` → `GET /rest/credentials` with optional filter. Table output.

### 3.9 `commands/executions/get.ts`

`n8n executions get <id>` → `GET /rest/executions/:id`. Pretty-prints tool, credential, status, latency, caller, mode, output. Test: assert formatted output includes all fields.

**End-to-end parity test:**
```bash
./packages/@n8n/cli/bin/n8n auth login --url=http://localhost:5678
./packages/@n8n/cli/bin/n8n node search slack
./packages/@n8n/cli/bin/n8n node get slack.message.send
./packages/@n8n/cli/bin/n8n credentials list --node-type=slack
./packages/@n8n/cli/bin/n8n exec slack.message.send \
  --credential <slack-cred-id> \
  --param channel='<channel-id>' --param text='hello from CLI'
# → executionId printed
./packages/@n8n/cli/bin/n8n executions get <executionId>
# expect: full details, caller='n8n-cli@<hostname>', mode=single-node
```

**Phase 3 total:** ~13h · **Hardest:** 3.3 OAuth loopback (cross-platform `open`) · **Risk:** medium · **Depends on:** Phase 1.

---

## Phase 4 — SDK package (Day 3-4, ~10h)

### 4.1 SDK auth + client

**Test first:**

```ts
// packages/@n8n/sdk/src/__tests__/client.test.ts
it('createClient returns an object with expected namespaces', () => {
  const n8n = createClient({ baseUrl: 'http://x', token: 't' });
  expect(typeof n8n.slack).toBe('object');
  expect(typeof n8n.linear).toBe('object');
});

it('throws if token is missing', () => {
  expect(() => createClient({ baseUrl: 'http://x', token: '' })).toThrow();
});
```

**Files:** `src/auth.ts`, `src/client.ts`. `createClient({ baseUrl, token })` builds the auth layer and wraps it in the Proxy.

### 4.2 Proxy runtime ✅ DONE

**Test first:**

```ts
// packages/@n8n/sdk/src/__tests__/proxy.test.ts
it('n8n.slack.message.send dispatches to POST /executions/node with correct body', async () => {
  nock('http://x').post('/rest/executions/node', {
    nodeType: 'n8n-nodes-base.slack',
    parameters: { resource: 'message', operation: 'send', channel: '#x', text: 'hi' },
    credentialId: 'c1',
  }).reply(200, { executionId: 'e1', status: 'success', output: [{ json: { ok: true } }] });

  const n8n = createClient({ baseUrl: 'http://x', token: 't' });
  const result = await n8n.slack.message.send({ credentialId: 'c1', channel: '#x', text: 'hi' });
  expect(result.ok).toBe(true); // output normalized — no .json wrapper
});

it('returns executionUrl alongside output', async () => {
  nock('http://x').post('/rest/executions/node').reply(200, { executionId: 'e1', status: 'success', output: [] });
  const n8n = createClient({ baseUrl: 'http://x', token: 't' });
  const result = await n8n.slack.message.send({ credentialId: 'c1', channel: '#x', text: 'hi' });
  expect(result.executionUrl).toBe('http://x/executions/e1');
});

it('throws N8nValidationError on 400', async () => {
  nock('http://x').post('/rest/executions/node').reply(400, { error: 'bad params' });
  const n8n = createClient({ baseUrl: 'http://x', token: 't' });
  await expect(n8n.slack.message.send({ credentialId: 'c1', channel: '#x', text: '' }))
    .rejects.toThrow(N8nValidationError);
});
```

Two-level JS Proxy. L1 (`n8n.slack`) → namespace proxy. L2 (`n8n.slack.message.send`) → function dispatching to `POST /executions/node` with `{ nodeType, parameters: { resource, operation, ...args } }`. Output normalization: unwrap `Array<{ json, binary, pairedItem }>` → plain `json`.

L1→L2 mapping comes from `dist/runtime/registry.json` generated by 4.3.

### 4.3 `scripts/generate-types.ts` (full-catalog codegen) ⏸ DEFERRED

Per "What to cut if we lose a day" item 3. The SDK proxy (4.2) is runtime-generic — it dispatches `n8n.<service>.<op>(args)` to `POST /rest/executions/node` regardless of types. Hand-rolled `.d.ts` for the 8 hero nodes (Slack/Linear/GitHub/Notion/Sheets/Gmail/HTTP/Postgres) lands in a later task if time permits.

### 4.3 (original)

**Test first:**

```ts
// packages/@n8n/sdk/scripts/__tests__/generate-types.test.ts
it('emits a registry entry for every (node, resource, operation) tuple', async () => {
  await generateTypes({ source: 'fixtures/nodes.json', out: '/tmp/sdk-out' });
  const registry = JSON.parse(await fs.readFile('/tmp/sdk-out/registry.json', 'utf8'));
  expect(registry['slack.message.send']).toEqual({
    nodeType: 'n8n-nodes-base.slack',
    resource: 'message',
    operation: 'send',
  });
});

it('emits a .d.ts file per node with method signatures', async () => {
  await generateTypes({ source: 'fixtures/nodes.json', out: '/tmp/sdk-out' });
  const dts = await fs.readFile('/tmp/sdk-out/types/slack.d.ts', 'utf8');
  expect(dts).toContain('namespace message');
  expect(dts).toContain('function send(params:');
  expect(dts).toContain('credentialId: string');
});

it('falls back to Record<string, unknown> for resourceMapper/loadOptions fields', async () => {
  const dts = await fs.readFile('/tmp/sdk-out/types/airtable.d.ts', 'utf8');
  expect(dts).toMatch(/Record<string, unknown>/); // for the resourceMapper field
});
```

Reads `packages/nodes-base/dist/types/nodes.json`. Reuses `@n8n/workflow-sdk` property converters. Emits per-node `.d.ts` + `registry.json` for the proxy. Covers ~480 nodes; loose-types for the ~20% with `resourceMapper`/`loadOptions`.

### 4.4 `pull` command (stretch)

`npx @n8n/sdk pull --instance <url> --token <pat>` → fetches `/rest/types/nodes.json` from live instance, regenerates types into `node_modules/@n8n/sdk/dist/types/`.

Defer if time runs out.

### 4.5 Demo script ✅ DONE

**File:** `packages/@n8n/sdk/examples/oneonone-prep.ts`

```ts
import { createClient } from '@n8n/sdk';
const n8n = createClient({ baseUrl: process.env.N8N_URL!, token: process.env.N8N_TOKEN! });

const issues = await n8n.linear.searchIssues({
  credentialId: 'cred_linear',
  filter: { assignee: 'me', updatedAt: { gte: '2026-05-09' } },
});
const prs = await n8n.github.searchPullRequests({
  credentialId: 'cred_github',
  query: 'author:@me created:>=2026-05-09',
});
const summary = `Issues: ${issues.length}, PRs: ${prs.length}`;
await n8n.slack.sendMessage({
  credentialId: 'cred_slack',
  channel: '#1on1-prep',
  text: summary,
});
```

**Test:**
```bash
pnpm --filter @n8n/sdk build
N8N_URL=http://localhost:5678 N8N_TOKEN=<pat> \
  pnpm --filter @n8n/sdk node dist/examples/oneonone-prep.js
# expect 3 executions, slack message arrives
```

**Phase 4 total:** ~10h (4h proxy, 4h codegen for 10 nodes, 2h example) · **Hardest:** 4.3 codegen · **Skip path:** hand-rolled `.d.ts` (2h).

---

## Phase 5 — Observability: single-node executions are first-class (Day 4, ~10-12h)

**Goal:** an agent-triggered or SDK-triggered execution looks like a workflow execution in the UI. Same list, same detail view, same input/output rendering, same timing. The only thing different is the caller column (Claude Desktop, CLI, SDK script).

**What's automatic** (because we use the existing execution engine):
- Input data per node — stored in `ExecutionEntity.data.resultData.runData`
- Output data per node — same
- Timing: `startedAt`, `stoppedAt` — populated by lifecycle hooks
- Status: `success`, `error`, `running` — same
- Direct URL access: `http://localhost:5678/executions/<id>` already routes to the detail view

**What needs work:**

### 5.1 Surface caller metadata in DTO (4-layer plumbing) — ~4h ✅ DONE

**Test first:**

```ts
// packages/cli/src/executions/__tests__/execution.service.test.ts
it('populates caller field for single-node executions', async () => {
  // seed an execution with mode='single-node' and metadata rows
  const dto = await service.getExecution(executionId, user);
  expect(dto.caller).toEqual({ kind: 'cli', name: 'n8n-cli@host', clientId: expect.any(String) });
});

it('omits caller field for workflow executions', async () => {
  const dto = await service.getExecution(workflowExecutionId, user);
  expect(dto.caller).toBeUndefined();
});
```

**Files:**
- `packages/@n8n/db/src/repositories/execution.repository.ts` — extend summary + detail projections to include caller from `ExecutionMetadata` for `mode='single-node'`.
- `packages/@n8n/api-types/src/schemas/...` — add optional `caller?: { kind: 'mcp'|'sdk'|'cli'; name: string; clientId?: string }`.
- `packages/cli/src/executions/execution.service.ts` — populate field in both summary + detail DTOs.

**Manual smoke:** `curl /rest/executions/<id>` returns `caller` for single-node executions; null/absent for workflow executions.

### 5.2 List view: node identity replaces workflow name — ~2h

`packages/frontend/editor-ui/src/features/execution/executions/views/ExecutionsView.vue`

| | Workflow row (today) | Single-node row (new) |
| --- | --- | --- |
| Headline | "Daily digest" (workflow name) | "slack.message.send" |
| Sub-line | `2026-05-10 14:32 · 4.2s` | `2026-05-10 14:32 · 412ms · via Claude Desktop` |
| Status dot | green / yellow / red | same |
| Click | opens execution detail | opens execution detail |

### 5.3 Detail view works for single-node executions — ~4h (hardest)

The existing detail view loads `ExecutionEntity` by ID and renders per-node tabs with input/output. For single-node executions:

- **Verify it loads at all.** The detail loader may assume `workflowId` is non-null or fetch the workflow definition. Fix to handle absence gracefully.
- **Header line.** Today: "Workflow: <name> · Run #N". Single-node: "Node call: `slack.message.send` · via Claude Desktop · cred_3a8f". No "Edit workflow" button.
- **Per-node panel.** One node only; tab strip collapses to a header. Show input + output + timing inline. Reuse the existing input/output renderer — no new rendering work.
- **Back nav.** "← Back to workflow" doesn't apply. Replace with "← Back to executions list".

**Files:** `packages/frontend/editor-ui/src/features/execution/views/ExecutionPreview.vue` (or whatever the detail page is named) + possibly `executions.controller.ts` to ensure the detail endpoint returns useful data.

**Test:** `http://localhost:5678/executions/<single-node-exec-id>` → see node name, caller, timestamp, input JSON, output JSON, latency. No 500s.

### 5.4 Direct-link URLs from CLI and SDK — ~1h ✅ DONE (rolled into 4.2 and 3.x)

- `commands/exec.ts` — after success, print `View: <baseUrl>/executions/<id>`.
- `commands/executions/get.ts` — include URL in output.
- `@n8n/sdk` — return `{ executionId, executionUrl }` from every node call.

**Test:** `n8n exec slack.message.send ...` → output has clickable URL → opens detail page that works.

### 5.5 Filter by source/caller (stretch — cut first if we lose a day) — ~3h

Filter chips: "Single-node calls", "Workflow runs". Plus a caller dropdown (Claude Desktop / CLI / SDK).

**Phase 5 total:** ~10-12h · **Hardest:** 5.3 detail view fixes (depends on what the loader assumes). **The first four sub-tasks are the load-bearing observability story; 5.5 is polish.**

---

## Phase 6 — Demo polish (Day 5, ~4h)

### 6.1 Pre-flight

- [ ] Demo instance running with Linear, GitHub, Slack credentials connected and named obviously.
- [ ] PAT in env.
- [ ] Claude Desktop has n8n MCP registered (OAuth tested).
- [ ] CLI on PATH.
- [ ] `@n8n/sdk` built; example script works.
- [ ] Executions UI tab open, filtered single-node.

### 6.2 Demo sequence

**Beat 1 — Claude Desktop:**
> "I have my 1:1 with Sarah at 3pm. Pull her open Linear issues and any PRs she opened or reviewed in the last week, then post a prep summary to #1on1-sarah."

Expected flow: `search_tools` → `list_credentials` × 3 → `execute_tool` × 3.

Refresh executions tab. Show three new rows with caller "Claude Desktop". Click into one for I/O.

**Beat 2 — SDK script:**
```bash
N8N_URL=http://localhost:5678 N8N_TOKEN=$N8N_PAT \
  node packages/@n8n/sdk/examples/oneonone-prep.ts
```

Show the 15-line script. "Imagine writing this against four vendor SDKs."

**Beat 3 — CLI:**
```bash
n8n node search "post slack message"
n8n exec slack.postMessage \
  --credential $SLACK_CRED \
  --param channel='#engineering' --param text='Demo complete'
```

Closing line: "One auth, one credential store, three surfaces. Same execution row in the same audit log."

### 6.3 Failure-mode prep

- Loom backup pre-recorded.
- Second terminal with curl fallbacks.
- Pre-warm credentials (run something in the last hour) to avoid live OAuth refresh.

---

## Risks ranked

1. **`additionalData` wiring (1.1) doesn't decrypt credentials.** Most likely blocker. Mitigation: spike day 1 by copying `test-workflow.tool.ts` verbatim.
2. **Tool-search ranking is mediocre.** Mitigation: rank-boost connected credentials, limit to top 8.
3. **Phase 4 codegen drags.** Mitigation: hand-roll `.d.ts` for 8 hero nodes.
4. **OAuth loopback fails behind VPN.** Mitigation: PAT fallback for CLI + SDK.
5. **Claude Desktop transport hiccups during demo.** Mitigation: Loom backup, curl fallback.
6. **Single-node mode breaks unexpected consumer.** Mitigation: full `pnpm typecheck` after Phase 0.

---

## What to cut if we lose a day

In priority order, cut from the bottom:

1. Phase 4.4 SDK `pull` against live instance.
2. Phase 5 mode filter chip (caller column is load-bearing).
3. Phase 4.3 full codegen (8 hand-rolled `.d.ts` for demo).
4. Phase 3.5 table formatting (JSON output fine).
5. Phase 1.4 consent screen polish.

**Do not cut:** Phase 1.1, Phase 2, Phase 6.2 demo run-through.

---

## Critical files

- `packages/cli/src/executions/execute-node.service.ts` (new — Phase 1.1, load-bearing)
- `packages/cli/src/executions/executions.controller.ts` (modify — Phase 1.2)
- `packages/cli/src/modules/mcp/mcp.service.ts` (modify — Phase 2.5)
- `packages/cli/src/node-catalog/node-catalog.service.ts` (modify — Phase 2.1)
- `packages/@n8n/cli/src/oauth-flow.ts` (new — Phase 3.3)
- `packages/@n8n/sdk/src/proxy.ts` (new — Phase 4.2)
