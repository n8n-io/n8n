---
name: one-off-operations
description: >-
  Handles one-off operations: the request is a concrete effect that happens
  once — export or copy data somewhere, a migration, a backfill, a cleanup —
  with no trigger, schedule, or reuse intent. The workflow is the vehicle, not
  the deliverable. Users rarely say "one-off"; infer it from the task's shape.
  Load before building for such a request, or when a workflow_builder_build_workflow result
  contains postBuildFlow.reason "direct-one-off-build-succeeded". Do not load
  for automations the user will run again — that is the normal build +
  post-build-flow path.
recommended_tools:
  - execute_node
  - get_node_types
  - workflow_builder_build_workflow
  - workflow_builder_workflows
  - workflow_builder_executions
  - workflow_builder_ask_user
  - workflow_builder_verify_built_workflow
---
# One-Off Operations

Use skill when request is **one-off operation**: concrete effect needed once, workflow only vehicle. Typical shapes: "put this data in a spreadsheet", "copy these rows to X", "migrate/backfill/clean up Y".

Instructions in English, but user-visible text stays in user's conversation language.

## Recognizing a one-off

Users rarely label "one-off" — **infer from task shape**, not explicit phrasing. One-off when deliverable is *state change*, not automation:

- Effect on data that **already exists and is bounded** — pasted in chat, in named node, table, file, or sheet — not data that keeps arriving.
- Imperative about here-and-now ("add these rows", "export what's in X", "clean out the duplicates"), no trigger/schedule/event vocabulary — no "when", "every", "whenever", "daily", "each time".
- No hint user wants to keep/rerun workflow; only outcome mentioned, never workflow itself.

Explicit markers ("just this once", "I won't need this again") confirm but not required — most one-offs lack them. Signals against: trigger/schedule vocabulary, "from now on", named event source, any hint user wants automation itself. **When in doubt, treat as reusable**, follow normal build flow — reusable workflow run once harmless; one-off flow applied to automation skips verification user wanted.

## Single-node one-offs: prefer direct node execution

When whole effect is **one node operation**, skip workflow: run node directly with `execute_node`. Runs single node with real credentials through regular execution engine, returns real output items — nothing to build, set up, verify, or clean up.

Direct execution sufficient when ALL hold:

- Effect is one node call (one write, one API operation). Read-back of destination may be second `execute` call of read operation.
- Input items already at hand — pasted in chat or read earlier — so pass literally as `input` items. Parameters must not use expressions referencing other nodes; they can't resolve (node runs alone).
- Node runs standalone on `main` input alone — no required sub-node connections (e.g. AI Agent needs language model attached; such nodes need workflow).
- Usable credential exists (`list_credentials`); action takes resolved `{ id, name }` references. If credentials must be created first, route through credentials setup as usual.
- Run fits 60s cap, input volume modest.

Run executes in current conversation's project, so credentials shared with that project usable. If fails because credential not accessible there, fall back to one-off workflow flow below.

Call with same shape as workflow-sdk node — `{ type, version,
config: { parameters, credentials } }` plus `input` items. Read `get_node_types` first, as before configuring any node. Approval same as `workflow_builder_executions(action="run")` — same run-approval card, admin policy, session grants — for one-off, that prompt is consent gate. Returned output items real, so read-back rule below satisfied by reading what came back — report only from those items (binary content returned as metadata only).

If task needs more — several chained steps, branching, merges, non-trivial transformations, data flowing between nodes — build workflow, use flow below.

One-off touching external systems still anchored on n8n nodes (can't write to external services directly) — intent changes *post-build flow*, not anchor.

## The one-off flow (multi-node)

1. **Build** workflow with **manual trigger** — always. One-off never published, so event trigger (webhook, form, schedule) never fires, only misleads. If task genuinely needs event source or future run time, not one-off — reclassify as reusable automation or scheduled task, use normal flow. Pass `executionIntent: "one-off"` to `workflow_builder_build_workflow`. Marks verification optional in build outcome — no verification follow-up scheduled; completion criterion becomes live run whose output you read back.
2. **Setup** unchanged: if build outcome requires credential or value setup, route through `workflow_builder_workflows(action="setup")` as usual. One-off still needs real credentials before live run.
3. **Run live** with `workflow_builder_executions(action="run")`. Run-approval card is user's consent gate — for one-off, live run IS what user asked for, so usual "reserve live runs for explicit user requests" rule satisfied by request itself. Don't run before setup complete.
4. **Read back before reporting.** After run, inspect actual output of effect nodes with `workflow_builder_executions(action="get-node-output")` — run result data truncated, insufficient for quantitative claims. Check each write/effect node's input was intended data (rows you meant to write), not upstream node's API response. Report only numbers, columns, shapes actually read. If target system cheap to read (e.g. read operation of same node type), offer destination read-back as final confirmation.
5. **Offer to clean up workflow.** On success, ask whether to keep workflow for reuse or delete now job done. Never delete without asking. If kept, mention it stays unpublished unless user says otherwise. Step is about *workflow*: data one-off wrote is deliverable user asked for, so never offer to undo it. Test data left by *test* run is opposite case — see "Cleaning up after a live test" in `post-build-flow`.

## Optional pre-flight verification

`workflow_builder_verify_built_workflow` available but **not required, never completion criterion** for one-off. Offer before live run only when wiring complex (branching, merges, non-trivial transformations) or user cautious about touching real data.

When run, present results honestly:

- Say which nodes **simulated** — external writes didn't happen, data flowing into simulated write nodes NOT validated (output is fabricated success fixture).
- Never call workflow "verified", "tested", or "working" from simulated pass alone; never let it substitute for live run and read-back.

## Claiming success

No quantitative claims ("22 rows written", "columns matched") not read back from actual execution output or target system. Successful run status alone doesn't prove *right data* written — read effect node's real output first. If couldn't read back, say so plainly, name what's unconfirmed.