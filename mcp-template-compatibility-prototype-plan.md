# MCP Template Compatibility — Demo POC Plan

**Status:** Demo POC — illustrates the concept, not production-ready
**Date:** 2026-08-12
**Scope:** Instance-level MCP workflow installation flow
**Goal:** A working end-to-end demo for colleagues, fast. Production concerns
are captured as `FUTURE:` notes, not built.

## Executive summary

Build a host-neutral MCP flow that checks a workflow template against the
user's n8n instance before installing it. The flow identifies incompatible
nodes and credentials, proposes a small set of high-confidence repairs, lets
the user approve or reject each repair, validates the revised workflow, and
creates it inactive in the chosen project.

The POC adds **one read-only instance MCP tool**,
`analyze_workflow_compatibility`, and **one optional boolean** on
`create_workflow_from_code`. Everything else reuses existing tools
(`search_projects`, `explore_node_resources`, `validate_node_config`,
`validate_workflow`, `create_workflow_from_code`). The external agent obtains
the workflow JSON, runs the conversation, applies approved edits, and calls
the existing validation/creation tools. n8n stays authoritative for installed
node metadata, project-scoped credential availability, repair eligibility, and
final validation.

## The demo scenario

One fixture template, one seeded instance, three compatibility states in a
single run.

**Template: "AI-powered RSS digest"** (fixture JSON, prepared once):

| Node | State on the demo instance | What the demo shows |
|---|---|---|
| RSS Feed Trigger → Basic LLM Chain | Installed, no credentials needed | ✅ Compatible — most of the workflow is just fine |
| OpenAI Chat Model (sub-node of the chain) | No OpenAI credential exists; an **Anthropic** credential does | 🔧 Repair proposal: swap to Anthropic Chat Model, user approves, picks a Claude model |
| Notion "Create Page" with a dangling credential ID (from the source instance) | Exactly **one** Notion credential usable in the project | 🔧 Repair proposal: assign that credential (deterministic, one click) |
| Slack "Send Message" | Slack node installed, but **no Slack credential** on the instance | ⛔ Blocked / needs setup — reported honestly, never guessed |

**Demo instance seed:** one Anthropic credential, one Notion credential,
nothing else. No Slack, no OpenAI. Optionally a "Demos" team project as the
target.

**Demo script (5 minutes):**

1. Paste the template JSON into an MCP-capable agent (Claude): *"Install this
   in my Demos project."*
2. Agent announces the read-only check, calls `search_projects`, then
   `analyze_workflow_compatibility`.
3. Agent summarizes: *"Three nodes are ready, two can be repaired, one needs
   setup."* Walks through each repair; user approves the Anthropic swap
   (agent optionally lists Claude models via `explore_node_resources`) and the
   Notion credential assignment; Slack stays unresolved.
4. Agent shows the final change summary, user confirms once.
5. Agent authors the revised Workflow SDK code, validates
   (`validate_node_config` + `validate_workflow`), creates with
   `disableCredentialAutoAssign: true`, and returns the workflow URL —
   **inactive**, with the Slack node flagged as remaining setup.
6. Open the workflow in the editor to show the result.

Demo environments: run once in Claude (rich client) and once in a plain
text-only MCP host to show host neutrality — same flow, no custom UI.

## Problem (unchanged)

Users can ask an MCP-capable agent to install a workflow template from pasted
JSON or a URL. A syntactically valid template may still be unusable on the
target instance: node types/versions may be missing, credentials may not exist
in the target project, references may dangle, and the agent has no
authoritative way to judge what is safe to change. The instance MCP already
exposes the primitives (node inspection, credential listing, validation,
creation) — what's missing is a preflight contract that turns those facts into
an explainable compatibility report and a consent-driven repair flow.

## POC scope

### In

1. `analyze_workflow_compatibility` read-only MCP tool.
2. Two repair rules: **exact credential assignment** and **chat-model provider
   substitution** (OpenAI → Anthropic / Gemini).
3. Blocked/needs-setup reporting for everything else.
4. `disableCredentialAutoAssign?: boolean` on `create_workflow_from_code` so
   approved choices and deliberately-unresolved slots survive creation.
5. Scope-map + instructions wiring so a capable host discovers the flow
   without prompt engineering.
6. Fixture-driven unit tests for the analyzer and repair rules; the manual
   demo script above as the end-to-end check.

### Out (FUTURE notes)

- **FUTURE: Slack → Microsoft Teams notification substitution** (was Repair 3).
  Cut from the POC: it needs a live Teams tenant and channel resource
  discovery on the critical path — pure demo-setup burden. The proposal shape
  (`replace_notification_node`, destination `requires`) is kept in the contract
  comments so it can be added without a contract change.
- **FUTURE: `setup_credential` proposal kind.** The natural fix for a missing
  credential is often *creating* one, ranked above provider substitution. For
  the POC, blocked issues carry an actionable `setupHint` string instead.
- **FUTURE: AI Gateway / n8n credits interaction.** On cloud, an empty
  chat-model slot may be servable via n8n credits with no repair at all. The
  POC assumes a self-hosted instance without AI Gateway; the analyzer ignores
  gateway eligibility. Must be resolved before production.
- **FUTURE: raw-JSON creation path.** The POC keeps the existing JSON →
  Workflow-SDK-code conversion done by the agent, accepting the representation
  drift risk for a controlled fixture (see "Known POC shortcuts"). If the
  concept lands, prioritize either a raw-JSON import tool or running the final
  compatibility check on the parsed SDK output inside `validate_workflow`.
- **FUTURE: server-enforced consent + telemetry attribution.** Add an optional
  `compatibilityReportHash` to creation; when present the server enforces
  disabled auto-assign itself and can emit an attributed
  "compatibility-assisted workflow created" event. In the POC, consent is
  agent-enforced via MCP instructions only.
- **FUTURE: telemetry.** No new events in the POC. When added, register
  through `@n8n/telemetry` (note: existing MCP events use the legacy
  `Telemetry` service — decide coexistence then).
- **FUTURE: version-downgrade repair.** "Template uses a newer typeVersion
  than the instance" is likely the most frequent real incompatibility; an
  explicit approve-a-downgrade proposal fits the model well. POC reports it as
  blocked.
- **FUTURE: deterministic IDs / sourceHash, agent evaluations, quantitative
  success metrics, MCP App UI, broader semantic catalog.**

## Product principles (unchanged, they're the point of the demo)

- **Analyze freely, mutate deliberately** — the check is read-only and runs by
  default; explicit approval is required before any write.
- **Preserve intent, not implementation** — proposals say what is preserved
  and what may change; never claim providers are identical.
- **Prefer blocked over speculative** — only curated repairs are proposed;
  everything else is surfaced as unresolved.
- **Project scope is authoritative** — a credential is compatible only if
  usable by a workflow in the target project.
- **No hidden credential choice** — multiple candidates means the user picks.
- **Portable MCP interaction** — structured content plus concise text; works
  in text-only hosts.

## Architecture and responsibilities

### External agent / harness

- Obtains workflow JSON (fetches URLs itself; the n8n MCP accepts JSON only —
  no SSRF surface added).
- Resolves a named project via `search_projects`.
- Calls `analyze_workflow_compatibility` before creation; explains findings;
  gathers per-repair approvals; applies only approved edits.
- Authors Workflow SDK code from the revised JSON, validates it
  (`validate_node_config`, `validate_workflow`), then calls
  `create_workflow_from_code` with `disableCredentialAutoAssign: true`.
- Reports the result, remaining setup, and that the workflow is inactive.

### Instance MCP analyzer (new)

- Parses and bounds-checks supplied workflow JSON.
- Resolves the target project and the caller's usable credentials there
  (reuses `getCredentialsAUserCanUseInAWorkflow` and the classifier helpers in
  `tools/workflow-builder/credential-validation.ts`).
- Resolves node types/versions via `NodeTypes`.
- Classifies each node: compatible, repairable, needs input, or blocked.
- Applies the two POC repair rules; returns a structured report without
  mutating anything.

### n8n persistence/runtime (unchanged)

- Permission checks, credential validation, inactive workflow creation —
  final authority even if the agent infers wrongly.

## New MCP tool: `analyze_workflow_compatibility`

Annotations: `readOnlyHint: true`, `destructiveHint: false`,
`idempotentHint: true`, `openWorldHint: false`.

**Scopes:** behind `credential:read` (it enumerates credential candidates by
name — same reasoning as `explore_node_resources`). Project resolution needs
`project:read` for `search_projects`. Note the degraded path: a grant with
`workflow:write` but no `credential:read` can create workflows but not run
preflight — acceptable for the POC, the instructions block is
scope-conditional (see below). Registered with the workflow-builder tools and
added to `TOOLS_BY_SCOPE` in `mcp-scopes.ts` (the existing drift-guard test
then covers it automatically).

### Input

```ts
type AnalyzeWorkflowCompatibilityInput = {
	workflow: {
		name?: string;
		nodes: unknown[];
		connections: Record<string, unknown>;
		settings?: Record<string, unknown>;
	};
	projectId?: string; // omitted → caller's personal project, matching creation
};
```

- Accepts a workflow object, not a URL or JSON string.
- Malformed structure → structured top-level error, no partial report.
- POC limits (defined here — existing tools have no content-size convention):
  max **100 nodes**, max **1 MB** serialized input, max **20 proposals** per
  report. Reject over-limit input with a structured error.
- Incoming credential-like data beyond `{id, name}` references is ignored and
  never echoed back.

### Output

```ts
type CompatibilityReport = {
	// All success fields optional + declared optional `error`, because the MCP
	// SDK publishes outputSchema with additionalProperties: false and validates
	// structuredContent on every response (see the comment in
	// create-workflow-from-code.tool.ts) — otherwise handler errors surface as
	// opaque -32602s.
	status?: 'compatible' | 'needs_input' | 'has_blockers';
	targetProject?: { id: string; name: string; type: 'personal' | 'team' };
	summary?: {
		compatible: number;
		repairable: number;
		blocked: number;
		warnings: number;
	};
	issues?: CompatibilityIssue[];
	warnings?: string[]; // e.g. disabled incompatible nodes, instance-specific settings
	error?: string;
};

type CompatibilityIssue = {
	id: string; // stable within a report: derived from node name + problem kind
	status: 'repairable' | 'blocked';
	node: { name: string; type: string; typeVersion: number };
	problem:
		| 'node_unavailable'
		| 'node_version_unavailable'
		| 'credential_missing'
		| 'credential_not_usable_in_project'
		| 'unsupported_configuration';
	message: string;
	setupHint?: string; // blocked issues: what the user must do (e.g. "connect a Slack credential")
	proposals: RepairProposal[]; // empty when blocked
};

type RepairProposal = {
	id: string;
	kind: 'assign_credential' | 'replace_chat_model';
	// FUTURE kinds: 'replace_notification_node', 'setup_credential',
	// 'downgrade_node_version'
	recommended: boolean;
	message: string;
	credential?: { id: string; name: string; type: string }; // names/ids only, never data
	replacement?: { type: string; typeVersion: number };
	preserves: string[];
	changes: string[];
	drops: string[];
	requires: Array<{
		key: string;
		label: string;
		kind: 'resource_choice' | 'parameter_value';
	}>; // e.g. target model for a chat-model swap
};
```

Contract notes:

- **One mechanism for "user must choose":** when several credentials or
  replacement targets qualify, the issue carries multiple proposals with
  `recommended: false` on all of them. Proposal-level `requires` is only for
  follow-up values *within* an accepted proposal (e.g. which Claude model).
- Multiple credential candidates are **never** ranked by DB order, recency, or
  name.
- Disabled incompatible nodes → warnings, not blockers (installation proceeds;
  enabling them later needs setup).
- `settings.errorWorkflow` or other instance-specific IDs in the template →
  warning.
- Human-readable text content summarizes the report; `structuredContent` is
  authoritative. (No `confidence` field — the POC only ever returns
  high-confidence proposals, so the field carried no information.)

### Analysis algorithm

1. Validate shape and limits.
2. Resolve and authorize the target project (explicit `projectId` that fails →
   actionable error, never silently fall back to personal).
3. For each node: resolve type + version via `NodeTypes`; unresolvable →
   blocked (`node_unavailable` / `node_version_unavailable`).
4. For resolved nodes, compute active credential slots using the same
   display-condition logic as `credential-validation.ts`
   (`computeActiveCredentialTypes`).
5. Classify explicit credential references with the existing classifier:
   usable / cross-project / not-found / wrong type.
6. For empty or broken active slots, list exact-type credentials usable in the
   target project → Repair 1.
7. If still incompatible and the node matches the chat-model rule → Repair 2.
8. Everything else → blocked with a `setupHint`.
9. Expressions are treated as data — never evaluated. No third-party calls
   during analysis (resource discovery happens later, after a credential is
   chosen).

## POC repair catalog (code-owned, two rules)

### Repair 1: Exact credential assignment

Deterministic repair that does not change the node.

Eligible when: node type/version installed; node enabled; an active credential
slot is empty or references an unusable credential; the slot is a declared
node credential (not `genericAuthType`/`nodeCredentialType` generic auth); the
node is not in `HTTP_NODE_TYPES` (same exclusion as the existing auto-assign
safety policy); ≥1 exact-type credential is usable in the target project.

Behavior: exactly one candidate → one `recommended` proposal; multiple →
one proposal per candidate, none recommended. Preserves everything about the
node. Final creation revalidates the credential is still usable
(`validateWorkflowCredentialReferences` already does this for explicit IDs).

### Repair 2: Chat-model provider substitution

Semantic replacement over the stable `ai_languageModel` connection.

POC mapping (hardcoded table): source `@n8n/n8n-nodes-langchain.lmChatOpenAi`
without a usable credential → targets `lmChatAnthropic` / `lmChatGoogleGemini`
where the target node is installed **and** a target-type credential is usable
in the project.

Eligible when: the source node is connected only via the standard
`ai_languageModel` connection to its parent; source parameters are limited to
model selection and empty/absent options. Any provider-specific configuration
present → **blocked**, not guessed (`unsupported_configuration`).
`// FUTURE: relax per-parameter — many options (temperature, maxTokens) have
// cross-provider equivalents.`

Behavior: preserve node name, position, and connection; never copy
provider-specific parameters; `requires` a target model
(`kind: 'resource_choice'` — the agent may use `explore_node_resources` with
the chosen credential, or confirm a model ID with the user). Multiple
qualifying providers → one proposal each, none recommended. The proposal's
`changes` states plainly that model outputs will differ.

## Creation change: `disableCredentialAutoAssign`

Current behavior: `create_workflow_from_code` auto-assigns the *first usable*
credential of a matching type to empty slots (`userCandidates[0]` in
`credentials-auto-assign.ts`). That silently violates both "no hidden
credential choice" and "the user left this node unresolved".

POC change — one optional boolean, default preserves existing behavior:

```ts
disableCredentialAutoAssign?: boolean; // default false
```

When `true`: skip user-credential auto-assignment entirely (explicit
credential references in the submitted code are still validated). The
compatibility flow always passes `true` after writing every approved
credential explicitly.

`// FUTURE: decide whether disabled also suppresses the AI Gateway / n8n
// credits sentinel assignment. POC targets a self-hosted demo instance
// without AI Gateway, so the question doesn't arise; it must be answered
// before cloud.`

The existing `autoAssignedCredentials` result field stays; in the
compatibility flow it should come back empty — an easy live assertion during
the demo.

(Dropped from the earlier draft: the `firstUsable | uniqueOnly | disabled`
enum. `uniqueOnly` was speculative; a boolean covers the POC.)

## MCP instructions update

Add a template-install block to `mcp-instructions.ts`, **conditional on the
analyzer being in the caller's grant** (same pattern as
`builderInstructionsEnabled` requiring `create_workflow_from_code`):

1. When the user provides workflow JSON or a template URL and asks to install
   it: obtain the JSON (fetch URLs yourself; ask the user to paste if you
   can't) and call `analyze_workflow_compatibility` before any creation.
2. Resolve a user-named project first via `search_projects`.
3. Analysis is read-only — don't ask permission to analyze.
4. Surface every issue; propose only what the analyzer returned — never invent
   replacements.
5. Get explicit approval per repair; one final confirmation covering repairs +
   creation before any write.
6. Apply approved repairs, author SDK code, run `validate_node_config` on
   replaced nodes and `validate_workflow` on the full code.
7. Create with `disableCredentialAutoAssign: true`; report the project, the
   workflow URL, remaining setup, and that the workflow is inactive.
8. Never request credential secrets in chat.

## Known POC shortcuts (accepted, on purpose)

These are the honest caveats to state in the demo, not hidden flaws:

1. **Consent is agent-enforced.** Nothing server-side stops a non-compliant
   agent from skipping the analyzer or auto-assigning. The demo shows the
   *contract*; enforcement (`compatibilityReportHash`) is a FUTURE item.
2. **Representation drift.** The analyzer checks the agent's JSON; creation
   parses agent-authored SDK code. With the controlled fixture this is a
   non-issue; for arbitrary templates it's the first thing to fix (raw-JSON
   path or compat-check on the parsed SDK output).
3. **No re-analysis loop.** The POC flow analyzes once; `validate_workflow` +
   explicit-credential validation at creation are the safety net. Re-running
   the analyzer on the revised JSON is optional, not required.
4. **Two repairs only, chosen as mechanism demos** — one deterministic
   (credential assignment), one semantic (provider swap). They demonstrate the
   proposal/consent machinery; they were not chosen by incident frequency.

## Implementation steps (fast path, in order)

1. **Fixture + seed script** (½ day): the RSS-digest template JSON; a seed
   note (or script) for the demo instance: Anthropic + Notion credentials,
   "Demos" project. This is also the analyzer's test fixture.
2. **Analyzer module** (1–2 days):
   `packages/cli/src/modules/mcp/tools/workflow-builder/analyze-workflow-compatibility.tool.ts`
   plus a small `compatibility/` folder for the two rules. Reuse
   `credential-validation.ts` helpers and `NodeTypes`; extract shared helpers
   rather than duplicating display-condition logic. Unit tests against the
   fixture (cases below).
3. **Wire-up** (½ day): register in `registerBuilderTools`
   (`mcp.service.ts`), add to `BUILDER_TOOLS` + `credential:read` in
   `mcp-scopes.ts` (drift-guard covers it), add the conditional instructions
   block.
4. **Creation flag** (½ day): `disableCredentialAutoAssign` in
   `create-workflow-from-code.tool.ts` → skip the user-credential branch in
   `autoPopulateNodeCredentials`. Two unit tests: default unchanged; `true`
   never fills an empty slot but still validates explicit references.
5. **Dry run + polish** (½–1 day): run the demo script end to end in Claude
   and one text-only host; tune tool descriptions/instructions from observed
   agent behavior.

Roughly 3–4 days to demo-ready.

## Testing (POC-sized)

Confirm the exact cases before writing them (repo guidance). Proposed set:

**Analyzer unit tests (fixture-driven):**
- Compatible workflow → no issues.
- Missing credential, one exact candidate → one recommended assignment.
- Multiple candidates → all returned, none recommended.
- Cross-project credential → `credential_not_usable_in_project`.
- Dangling credential ID → repairable with the project's candidate.
- HTTP Request node → never proposed for assignment.
- OpenAI chat model without credential, Anthropic credential present →
  `replace_chat_model` proposal with `requires: model`.
- OpenAI chat model with provider-specific params → blocked.
- Uninstalled node type → blocked with `setupHint`.
- Disabled incompatible node → warning, not issue.
- Over-limit input → structured error, no partial report.
- No credential data ever appears in output.

**Scope/contract:**
- Tool registered only with builder tools; gated by `credential:read`
  (drift-guard test updates automatically via `TOOLS_BY_SCOPE`).

**Creation flag:** the two tests in step 4 above.

**End-to-end:** the manual demo script, run in two hosts. No automated agent
evals in the POC (FUTURE).

## Demo success criteria

1. The agent recognizes the install request and runs preflight unprompted.
2. All four node states are reported accurately against the seeded instance.
3. The user approves/rejects each repair independently; the Slack node stays
   honestly unresolved.
4. No write happens before the final confirmation (observed, agent-enforced).
5. The created workflow is inactive, carries exactly the approved credentials
   (`autoAssignedCredentials` comes back empty), and opens correctly in the
   editor.
6. The same flow works in a text-only MCP host.

## Likely code areas

- `packages/cli/src/modules/mcp/tools/workflow-builder/analyze-workflow-compatibility.tool.ts` — new tool + rules.
- `packages/cli/src/modules/mcp/tools/workflow-builder/credential-validation.ts` — reuse/extract classifier helpers.
- `packages/cli/src/modules/mcp/tools/workflow-builder/credentials-auto-assign.ts` — honor the new flag.
- `packages/cli/src/modules/mcp/tools/workflow-builder/create-workflow-from-code.tool.ts` — new optional input.
- `packages/cli/src/modules/mcp/mcp.service.ts` — registration.
- `packages/cli/src/modules/mcp/mcp-scopes.ts` — scope mapping.
- `packages/cli/src/modules/mcp/tools/workflow-builder/mcp-instructions.ts` — conditional guidance block.
- Fixture JSON + seed notes alongside the analyzer tests.

No `@n8n/api-types` changes (the report stays MCP-internal for the POC), no
telemetry, no editor-ui coupling.

## After the demo: decision points (FUTURE backlog)

Carried over from the full prototype plan — revisit only if the concept lands:

1. Raw-JSON import tool **or** compatibility check on parsed SDK output
   (closes the representation gap — highest priority).
2. `compatibilityReportHash` on creation → server-enforced consent + telemetry
   attribution (`@n8n/telemetry` registry events).
3. `setup_credential` proposal kind ranked above replacements; AI Gateway /
   n8n credits position.
4. Version-downgrade repair (likely the most frequent real-world case).
5. Slack → Teams (and broader notification/email/storage) substitutions with
   resource-discovery `requires`.
6. Deterministic report IDs + agent evaluation suite; quantitative adoption
   metrics.
7. MCP App UI for side-by-side diffs and multi-select consent; editor
   setup-panel reuse of the analyzer.
