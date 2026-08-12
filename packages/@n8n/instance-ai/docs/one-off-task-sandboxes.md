# One-Off Task Sandboxes

> **Status:** Hackathon design. Not implemented. This document describes the
> concept, the decisions made, and the path from hackathon prototype to
> production.

## The Concept

Instance AI can already do one-off tasks, but only through a workflow. A
workflow is the wrong tool for a task that runs once — "create a Google Sheet
with these columns" does not need a trigger, a canvas, or persistence.

The idea: Instance AI delegates one-off tasks to an **ephemeral sandbox** that
runs a **pre-bundled coding harness** ([pi](https://pi.dev)). The harness
writes code against the provider's SDK, executes it, verifies the result, and
returns a structured report. Then the sandbox is destroyed.

The core division of roles:

- **Instance AI is the planner.** It writes the task contract: the goal, the
  guardrails, and which credentials to use. It does not write code.
- **The harness is the executor.** It runs the full coding loop — write, run,
  fix, verify — inside the sandbox.

This boundary is the most important design decision. Keep it strict.

```mermaid
graph LR
    User --> IA["Instance AI<br/>(planner)"]
    IA -->|"task contract<br/>(prompt via RPC)"| Harness["pi harness<br/>(executor)"]
    subgraph SB["Ephemeral sandbox"]
        Harness --> Code["SDK code<br/>write → run → fix"]
        Code --> Verify["Read-back<br/>verification"]
    end
    Verify -->|"structured report"| IA
    IA -->|"answer + artifact links"| User
    SB -.->|"destroyed after task"| X(("✕"))

    style IA fill:#f3e8ff,stroke:#7c3aed
    style SB fill:#fef3c7,stroke:#d97706
```

## Why the Sandbox Is Ephemeral

The sandbox holds decrypted credentials. Therefore its lifetime equals the
lifetime of the secrets. This is a hard guarantee, not a preference:

- Destroy the sandbox on success.
- Destroy the sandbox on failure.
- Destroy the sandbox on timeout, on abort, and on crash.

This differs from the existing thread-scoped sandbox (see
[sandboxing.md](./sandboxing.md)), which persists across a conversation. A
one-off task sandbox is created per task and never reused.

## The Sandbox

Provider: the **n8n sandbox service** (the default provider). Two findings
shape the provisioning story:

1. **Pre-warmed snapshots are Daytona-only today.** The `SnapshotManager` is
   built on the Daytona SDK, and `create-workspace.ts` skips the snapshot path
   for the `n8n-sandbox` provider. The sandbox service API
   (`@n8n/sandbox-client`) has no image or snapshot parameter — the service
   runs one fixed runner image, chosen at service deployment.
2. **This is a match, not a blocker.** All one-off task sandboxes use the same
   image anyway. Per-sandbox image selection is not needed.

### Hackathon path: bootstrap at creation

Create a sandbox, then run a bootstrap script through the exec and filesystem
APIs:

- `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`
- Write `SYSTEM.md`, `AGENTS.md`, and the guardrail extension files.

Zero changes outside this repo. Cost: tens of seconds of startup per task.
Acceptable for a demo, not for production.

### Production path: bake into the runner image

Add pi, the config files, the extensions, and the most common SDKs
(googleapis, Slack, …) to the sandbox service's runner image
(n8n-io/n8n-sandbox-service). Every sandbox the service creates is then
pre-warmed by definition. Sandbox start stays fast, which matters — the user
waits in a chat.

### Hard limits

- Maximum sandbox lifetime (wall clock).
- Token budget for the harness.
- Maximum wait time on a human-in-the-loop request (see credential flow).
- On any limit: abort the harness, destroy the sandbox, report the task as
  incomplete. A stuck loop must not hold decrypted credentials.

## The Harness

[pi](https://pi.dev) is a minimal terminal coding harness with the exact
mechanisms this design needs.

### Integration: RPC mode

Instance AI drives pi through **RPC mode** (`pi --mode rpc`) — a JSONL
protocol over stdin/stdout:

- Send the task: `{"type": "prompt", "message": "<task contract>"}`
- Receive streamed events: `tool_execution_start`, `message_update`, …
- Done signal: `agent_settled`
- Kill switch: `{"type": "abort"}`

This gives live progress for the user, a clean completion signal, and the
abort mechanism the hard limits require. One-shot mode (`pi -p "<task>"`) is
the fallback.

### Instruction layers

Static instructions are baked; only the task changes per run.

| Layer | Mechanism | Content |
| --- | --- | --- |
| Role and rules | `~/.pi/agent/SYSTEM.md` (baked) | Identity: "You execute one one-off task. You read credentials from the environment by name. You verify by read-back. You produce a final report. You never print secret values." |
| Conventions | `AGENTS.md` context file (baked) | Credential catalog format, how to request a new credential, report format. |
| The task | RPC prompt (per run) | The task contract from Instance AI. |

### Guardrail extensions

Pi extensions are TypeScript modules baked into the image
(`.pi/extensions/`). They intercept every tool call before it executes and
every tool result before the model sees it.

| Extension hook / tool | Purpose | Strength |
| --- | --- | --- |
| `tool_call` hook | Block obvious env-dumping commands (`env`, `printenv`, `echo $SECRET_*`). | **Soft.** A tripwire, not a wall — code can always read `process.env`. Do not oversell it. |
| `tool_result` hook | Redact secret values from every tool output before the LLM sees them (`[REDACTED:NAME]`). The injector writes the secret env var names to a manifest; the hook compares outputs against the actual values, which are already inside the sandbox. | **Strong.** Even when the model or its code prints a token, the value never enters model context, transcript, or report. |
| `list_credentials` tool | Returns credential names and types only. The model has no reason to poke at the environment — availability is a tool call, not a shell command. | Convenience + risk reduction. |
| `report_result` tool | Fixed schema: actions taken, verification evidence, artifact links. The system prompt requires it as the harness's last act. | Enforces the result contract by schema, not by hoping the model formats text. |
| `lookup_docs` tool | Calls the Context7 API directly for current SDK docs. Pi has no documented native MCP support; a direct HTTP tool is simpler than bridging an MCP client. | Capability. |

## Credentials

The security core of the design, stated explicitly:

> **The harness knows credential names and types. It never sees credential
> values in its context.** Values exist only in the pi process environment.
> The LLM transcript, the logs, and the report never contain a value.

### Injection: per-exec environment

The sandbox client's `ExecRequest` already supports
`env: Record<string, string>`. Decrypted values are passed as environment
variables **only to the exec call that starts the pi process**. They are
never written to a file and never baked into the sandbox. No service change
is needed.

### Two request paths

**Path 1 — existing credential.** The harness reads the catalog (names and
types only) via `list_credentials`. When the task needs one, it sends a
structured request to Instance AI. The user approves. Instance AI decrypts
the credential and injects it. Explicit approval per credential per task is
the consent mechanism — do not skip it, even when the need is obvious. It is
the only gate for now.

**Path 2 — new credential.** The harness requests a credential that does not
exist. This reuses the **Templated Custom Auth** recipe flow
(`src/tools/credentials.tool.ts`): the model builds a recipe from provider
docs (placeholders, labels, masked inputs, `docsUrl`, `testUrl`), the user
pastes only the secret values into the setup card, and the credential is
tested via `testUrl` before injection. Three hard problems come solved with
this reuse:

1. The paste bypasses the model context (masked setup card, not a chat
   message).
2. The credential is verified before use — the harness does not burn tokens
   discovering that a key is wrong.
3. `docsUrl` guides the user to the exact page where they create the key.

At paste time, ask the user: "Save this for later, or use it once?" The
use-once option dies with the sandbox — a security feature the workflow path
does not have, and a natural fit for one-off tasks.

The placeholder names double as the environment contract: a recipe with
`{{api_key}}` tells the harness "read `API_KEY` from the environment" without
the harness ever knowing the value.

Note: in the existing flow, n8n applies the auth template at request time. In
the sandbox, the harness calls the SDK directly, so the template execution is
mostly unused. What is reused is the request–card–paste–verify UX and the
"values never enter model context" guarantee.

### The wait state

A mid-task credential request pauses the harness while already-injected
credentials sit in the sandbox. Set a wait timeout: if the user does not
respond in N minutes, destroy the sandbox and report the task as incomplete.
The user can restart; secrets must not sit idle.

```mermaid
sequenceDiagram
    participant U as User
    participant IA as Instance AI
    participant SB as Sandbox (pi)

    IA->>SB: create sandbox + bootstrap
    IA->>SB: start pi (RPC), env = approved credentials
    SB->>SB: write code, run, fix
    SB->>IA: credential request (name/type or recipe)
    IA->>U: approval or setup card (masked)
    U->>IA: approve / paste values
    Note over IA: testUrl probe (new credentials)
    IA->>SB: restart pi exec, env += new credential
    SB->>SB: complete task
    SB->>SB: read-back verification
    SB->>IA: report_result (actions, evidence, links)
    IA->>SB: destroy sandbox
    IA->>U: answer + artifact links
```

## Verification

Mandatory, and defined concretely so the harness cannot claim success
cheaply:

- **Verification means read-back.** After a write, the harness reads the
  resource through the API and compares the state with the goal. "The create
  call returned 200" is not verification. "I read the sheet and it has the 4
  columns you asked for" is.
- **Evidence goes in the report.** What was checked and what was found, plus
  the artifact link. The user can click the link and see for themselves —
  the final verification layer, and it is free.
- **Write operations get a gate.** For destructive actions, the harness makes
  a short plan first and Instance AI shows it to the user before execution. A
  failed retry can create the sheet twice; a wrong plan can delete data.

## The Result Contract

The harness must not return free text only. The `report_result` schema
carries:

- Actions taken (which API calls, against what).
- Verification evidence (what was read back, what matched).
- Artifacts (URLs to created resources).

This doubles as an audit log. Keep the final report after the sandbox dies:
if the user asks "do that again next month," Instance AI starts a fresh
one-off task with the old report as a hint — knowledge reuse without any
workflow machinery.

## Instance AI Integration

The existing architecture has slots for every integration point. Nothing new
is invented at the protocol level.

### Skill plus tool

The workflow builder already uses the pattern: a skill teaches the
orchestrator when and how, an orchestration tool does the spawning.

- **A `one-off-task` skill** teaches the orchestrator to write a good task
  contract: the goal, the constraints, which catalog credentials fit, and
  what "verified" means for this task. It also carries the routing rule —
  recurring work → workflow, run-once work → sandbox — with user override.
- **A thin `run-one-off-task` orchestration tool** creates the sandbox,
  bootstraps it, and starts pi as a background task. Per the engineering
  rules, the tool validates input, calls the service, returns output — the
  contract quality lives in the skill, not the tool.

### Streaming: reuse the event schema

The streaming protocol already supports multiple agent branches: every event
carries an `agentId`, spawned background agents carry a `parentId`, and the
frontend renders those branches (see
[streaming-protocol.md](./streaming-protocol.md)). The integration is a
translation layer: pi RPC events map onto existing event types under the
sandbox agent's ID.

| pi RPC event | Instance AI event |
| --- | --- |
| `message_update` (text deltas) | `text-delta` |
| `tool_execution_start` / `end` | tool events in the agent branch |
| milestone progress | `status` ("Creating the sheet…") |
| `agent_settled` | task completion → report card |

Raw tool activity streams into the collapsible agent branch; occasional
`status` lines keep the main view readable. Redaction happens below this
layer — the pi `tool_result` hook scrubs secrets before events reach the
stream.

### Abort: inherit both cancel paths, add reaping

Background tasks already have two cancel paths: the global stop
(`cancelRun` → `cancelBackgroundTasks(threadId)`) and the
`cancel-background-task` tool for "stop that" requests. The sandbox harness
runs as a background task and inherits both. The one-off addition: for this
sandbox type, **cancellation is a security event** — the cancel handler
sends pi the RPC `abort`, then destroys the sandbox.

Crash paths need a third mechanism. The thread-scoped workspace already
derives sandbox identity deterministically (UUIDv5 from thread ID) so a
restarted process reattaches; use the same trick in reverse — deterministic
IDs or labels on one-off sandboxes so a startup sweep reaps orphans that
outlived their run.

### Confirmation and result UI

- The destructive-write gate renders through the existing confirmation
  mechanism (severity levels via `instanceAiConfirmationSeveritySchema`) —
  not a new UI.
- The `report_result` payload renders as a card: actions, verification
  evidence, artifact links. This is the moment the user judges whether the
  feature is trustworthy — not a text blob.
- On a limit kill (timeout, token budget, credential wait expiry) the user
  gets a **partial report** — what was done before the stop. The harness may
  have half-created things; the user must know what exists.

### Follow-up turns

The report arrives, the sandbox dies, the user replies "actually, make it 5
columns." That is a **new task**: new sandbox, approvals inherited from the
same thread, previous report passed as context. This keeps the security
story clean (no idle sandbox holding credentials "just in case") and reuses
the keep-the-report decision. The alternative — a short grace period — is
what users may intuitively expect, so this stays an explicit product
decision.

### LLM access for the harness

The harness runs its own LLM loop, so it needs model access. Decision:
**reuse the same provider and model as Instance AI.** The harness does real
coding work, so the same Opus-class model is justified, and one model config
means no new settings surface. Per deployment shape:

| Deployment | Instance AI model source | pi mechanism |
| --- | --- | --- |
| Self-hosted, built-in provider (`N8N_INSTANCE_AI_MODEL=anthropic/…`) | Direct provider key | Native pi provider; key injected per-exec like any credential. Hackathon path. |
| Self-hosted, custom endpoint (`N8N_INSTANCE_AI_MODEL_URL`) | OpenAI-compatible URL + key | Custom-provider TypeScript module baked into the image, reading URL/key/model from env. |
| Cloud / proxy-managed | n8n's managed proxy | Same custom-provider module pointed at the proxy. |

The caveat: the injected key or proxy token is n8n's billing identity inside
a sandbox running LLM-written code. For the hackathon, a separate
rate-limited key is the minimum. The real fix is proxy-minted short-lived
per-run tokens with a token budget — which also yields per-task cost
accounting. See Future Hardening.

### Production trio

- **Feature flag** (PostHog) gating the skill and tool.
- **Telemetry** through the `@n8n/telemetry` registry: task started,
  credentials requested/approved, task completed/failed/timed out, tokens
  spent.
- **Evals**: a LangTracer suite for one-off tasks — a new behavior class the
  workflow evals do not cover.

## Evals and Test Tasks

Testing is manual at first. The task list below doubles as the manual test
script now and the eval suite later.

### Task families

| # | Family | Examples | Notes |
| --- | --- | --- | --- |
| 1 | Resource creation | Google Sheet with columns; Notion database with properties; Slack channel with topic and members; GitHub repo with labels; Drive folder structure | Simple, satisfying, low-risk. The demo tasks. |
| 2 | One-time data transfer | Airtable → Google Sheets; Notion pages → CSV; CSV of leads → HubSpot; Trello board → board | Probably the highest real demand. Users currently build a throwaway workflow and delete it — exactly the waste this feature removes. |
| 3 | Backfills | "My workflow started in June — fetch the January–May Shopify orders into the same sheet" | Complements an existing workflow instead of replacing it. Strong pitch story. |
| 4 | Bulk cleanup and edits | Dedupe CRM contacts; normalize phone numbers in a sheet; archive inactive Slack channels; rename 300 Drive files | The destructive family — the write gate and partial-report-on-failure earn their keep here. |
| 5 | Reports and analysis | Summarize last month's Stripe payments by product; HubSpot deals per stage; stats over GitHub issues | Read-only, safest. The harness does real computation over data, which a workflow does awkwardly. |
| 6 | Audits and lookups | Drive files shared outside the org; Notion pages mentioning a customer; dead URLs in a sheet of 200 | Read-only, tedious by hand, no sane workflow shape. |
| 7 | External service configuration | Register a webhook; set up CRM pipeline stages; create a label taxonomy | Often a prerequisite for building a workflow — another complement. |
| 8 | One-time outbound sends | Personalized email to 40 people; digest to Slack; calendar invites | **Out of hackathon scope.** Outward-facing, unrecallable, retry-duplicates are visible to humans. Add later behind the confirmation gate. |

### Eval axes

The families are not the eval axes — the axes cut across them:

- **Read-only vs. write vs. destructive.**
- **Single service vs. cross-service.**
- **Single item vs. bulk** — pagination and rate limits are where LLM-written
  code typically fails.
- **Existing OAuth credential vs. new-key recipe path.**

A good early suite is a small grid over these axes rather than many tasks
from one family: a creation task, a transfer task, a bulk cleanup, and an
audit — each in a read-only and a write variant, at least one requiring the
recipe flow.

### Behavioral cases (no happy path)

- A task that should route to a **workflow** instead ("every Monday…") —
  asserts refusal to sandbox it.
- A task with a **wrong or missing credential** — asserts the request flow,
  not silent failure.
- An **ambiguous task** — asserts a clarifying question before execution.
- Data containing a **prompt injection** — asserts the token stays put
  (later, once guardrails mature).

The existing LangTracer suites already distinguish build cases from
behavior/process cases; these map onto that machinery.

### Manual testing this week

One task each from families 1, 2, 5, and 6 — creation, transfer, report,
audit. Together they cover both credential paths and stay non-destructive
while the guardrails are young.

## Decisions Made

| Decision | Choice |
| --- | --- |
| Convert one-off tasks to workflows | **No.** One-off tasks are one-off. No tokens wasted on workflow generation. The kept report covers the "again later" case. |
| Credential proxy at the sandbox boundary | **Not now.** Noted as future hardening. |
| Egress allowlist per credential type | **Not now.** Credentials from n8n do not carry host metadata today. Noted as future hardening. Human approval per credential per task is the consent gate instead. |
| Env vars vs proxy | Env vars, but per-exec — only the pi process sees them, never a file, never the sandbox image. |
| MCP for Context7 | **No.** Pi has no native MCP support; a direct HTTP `lookup_docs` extension tool is simpler. |
| LLM for the harness | **Same provider and model as Instance AI.** No new settings surface; per-run budget tokens are future hardening. |
| Follow-up turns | **New task, new sandbox.** Previous report passed as context; approvals inherited from the thread. No idle sandbox holding credentials. |

## Future Hardening

In rough priority order:

1. **Egress allowlist.** The sandbox has secrets, runs LLM-written code, and
   reads external data — which can carry a prompt injection instructing the
   harness to exfiltrate a token. An allowlist of domains derived from the
   credential types in use (Google Sheets task → Google API domains only) is
   the strongest single mitigation. Requires host metadata on credential
   types.
2. **Credential proxy.** A small proxy at the sandbox boundary adds auth
   headers outside the sandbox, so raw tokens never enter it at all.
   Supersedes env injection entirely.
3. **Runner image bake.** Move from bootstrap-at-creation to pi baked into
   the sandbox service runner image (the production provisioning path above).
4. **Short-lived, scoped tokens.** Inject access tokens only (never refresh
   tokens), scoped down where the provider supports it.
5. **Per-run LLM budget tokens.** Replace the injected provider key with
   proxy-minted, short-lived tokens carrying a per-task token budget. Caps
   the damage of a prompt-injected harness and yields per-task cost
   accounting.

## One-Sentence Version

An ephemeral, credential-scoped sandbox runs a pre-bundled pi coding agent
against a structured task contract from Instance AI, and returns a
structured, read-back-verified report before it is destroyed.
