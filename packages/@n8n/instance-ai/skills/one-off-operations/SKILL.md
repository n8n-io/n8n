---
name: one-off-operations
description: >-
  Handles one-off operations: the request is a concrete effect that happens
  once — export or copy data somewhere, a migration, a backfill, a cleanup —
  with no trigger, schedule, or reuse intent. The workflow is the vehicle, not
  the deliverable. Users rarely say "one-off"; infer it from the task's shape.
  Load before building for such a request, or when a build-workflow result
  contains postBuildFlow.reason "direct-one-off-build-succeeded". Do not load
  for automations the user will run again — that is the normal build +
  post-build-flow path.
recommended_tools:
  - nodes
  - build-workflow
  - workflows
  - executions
  - ask-user
  - verify-built-workflow
---

# One-Off Operations

Use this skill when the request is a **one-off operation**: a concrete effect
that needs to happen once, where a workflow is only the vehicle to make it
happen. Typical shapes: "put this data in a spreadsheet", "copy these rows to
X", "migrate/backfill/clean up Y".

These instructions are in English, but user-visible text you write while
following them stays in the user's conversation language.

## Recognizing a one-off

Users rarely label a task "one-off" — **infer it from the task's shape**, not
from explicit phrasing. It is a one-off when the deliverable is a *state
change*, not an automation:

- The user asks for an effect on data that **already exists and is bounded** —
  pasted into the chat, sitting in a named node, table, file, or sheet — rather
  than data that will keep arriving over time.
- The request is imperative about the here-and-now ("add these rows", "export
  what's in X", "clean out the duplicates"), with no trigger, schedule, or
  event vocabulary — no "when", "every", "whenever", "daily", "each time".
- Nothing suggests the user wants to keep and rerun the workflow; the workflow
  is never mentioned as the thing they want, only the outcome is.

Explicit markers ("just this once", "I won't need this again") confirm the
classification but are not required — most one-offs arrive without them.
Signals against: trigger/schedule vocabulary, "from now on", a named event
source, or any hint the user wants the automation itself. **When in doubt,
treat the request as reusable** and follow the normal build flow — a reusable
workflow that runs once is harmless; a one-off flow applied to an automation
skips verification the user would have wanted.

## Single-node one-offs: prefer direct node execution

When the entire effect is **one node operation**, skip the workflow: execute
the node directly with `nodes(action="execute")`. It runs a single node with
real credentials through the regular execution engine and returns its real
output items — no workflow to build, set up, verify, or clean up afterwards.

Direct execution is sufficient when ALL of these hold:

- The effect is one node call (one write, one API operation). A read-back of
  the destination may be a second `execute` call of a read operation.
- The input items are already at hand — pasted into the chat or read earlier
  in the conversation — so you can pass them literally as `input` items.
  Parameters must not use expressions referencing other nodes; they cannot
  resolve (the node runs alone).
- The node runs standalone on `main` input alone — no required sub-node
  connections (e.g. an AI Agent needs a language model attached; such nodes
  need a workflow).
- A usable credential already exists (`credentials(action="list")`); the
  action takes resolved `{ id, name }` references. If credentials must be
  created first, route that through the credentials setup as usual.
- The run fits the 60s cap and the input volume is modest.

The run executes in the current conversation's project, so credentials shared
with that project are usable. If it fails because a credential is not
accessible there, fall back to the one-off workflow flow below.

Call it with the same shape as a workflow-sdk node — `{ type, version,
config: { parameters, credentials } }` plus `input` items. Read
`nodes(action="type-definition")` first, as you would before configuring any
node. Approval works exactly like `executions(action="run")` — the same
run-approval card, admin policy, and session grants — and for a one-off that
prompt is the consent gate. The returned output items are
real, so the read-back rule below is satisfied by reading what came back —
report only from those items (binary content is returned as metadata only).

If the task needs more than that — several chained steps, branching, merges,
non-trivial transformations, or data that must flow between nodes — build the
workflow and use the flow below.

A one-off that touches external systems is still anchored on n8n nodes (you
cannot write to external services directly) — the intent changes the
*post-build flow*, not the anchor.

## The one-off flow (multi-node)

1. **Build** the workflow with a **manual trigger** — always. A one-off is
   never published, so an event trigger (webhook, form, schedule) would never
   fire and only misleads. If the task genuinely needs an event source or a
   future run time, it is not a one-off — reclassify it as a reusable
   automation or a scheduled task and use the normal flow. Pass
   `executionIntent: "one-off"` to `build-workflow`. This marks verification
   as optional in the build outcome — no verification follow-up is scheduled,
   and the completion criterion becomes a live run whose output you read back.
2. **Setup** is unchanged: if the build outcome requires credential or value
   setup, route it through `workflows(action="setup")` as usual. A one-off
   still needs real credentials before it can run live.
3. **Run live** with `executions(action="run")`. The run-approval card is the
   user's consent gate — for a one-off, the live run IS what the user asked
   for, so the usual "reserve live runs for explicit user requests" rule is
   satisfied by the request itself. Do not run before setup is complete.
4. **Read back before reporting.** After the run, inspect the actual output of
   the effect nodes with `executions(action="get-node-output")` — the run
   result data is truncated and not enough for quantitative claims. Check that
   each write/effect node's input was the intended data (the rows you meant to
   write), not an upstream node's API response. Report only numbers, columns,
   and shapes you actually read. If the target system is cheap to read (e.g. a
   read operation of the same node type), offer a read-back of the destination
   as final confirmation.
5. **Offer to clean up the workflow.** When the operation succeeded, ask whether
   to keep the workflow for future reuse or delete it now that the job is done.
   Never delete without asking. If the user keeps it, mention it stays
   unpublished unless they say otherwise. This step is about the *workflow*: the
   data a one-off wrote is the deliverable the user asked for, so never offer to
   undo that. Test data left behind by a *test* run is the opposite case — see
   "Cleaning up after a live test" in `post-build-flow`.

## Optional pre-flight verification

`verify-built-workflow` is available but **not required and never the
completion criterion** for a one-off. Offer it before the live run only when
the wiring is complex (branching, merges, non-trivial transformations) or the
user is cautious about touching real data.

When you do run it, present results honestly:

- Say which nodes were **simulated** — external writes did not happen, and the
  data flowing into simulated write nodes was NOT validated (their output is a
  fabricated success fixture).
- Never call the workflow "verified", "tested", or "working" from a simulated
  pass alone, and never let it substitute for the live run and read-back.

## Claiming success

Do not make quantitative claims ("22 rows written", "columns matched") that
you did not read back from actual execution output or the target system. A
successful run status alone does not prove the *right data* was written — read
the effect node's real output first. If you could not read it back, say so
plainly and name what is unconfirmed.
