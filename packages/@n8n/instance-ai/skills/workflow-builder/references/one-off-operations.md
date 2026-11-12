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
recommended_tool_groups:
  - nodes
  - workflows
  - executions
---

# One-Off Operations

Use this skill when the request is a **one-off operation**: a concrete effect
that needs to happen once, where a workflow is only the vehicle to make it
happen. Typical shapes: "put this data in a spreadsheet", "copy these rows to
X", "migrate/backfill/clean up Y".

These instructions are in English, but user-visible text you write while
following them stays in the user's conversation language.

## Recognizing a one-off

Infer it from the task's shape: the deliverable is a *state change* on
bounded data already at hand, the ask is imperative about now, and there is
no trigger, schedule or reuse vocabulary. **When in doubt, treat the request
as reusable** and follow the normal build flow.

## Single-node one-offs: prefer direct node execution

When the entire effect is **one node operation**, skip the workflow: execute
the node directly with `execute_node`. It runs a single node with
real credentials through the regular execution engine and returns its real
output items — no workflow to build, set up, verify, or clean up afterwards.

Call it with the same shape as a workflow-sdk node — `{ type, version,
config: { parameters, credentials } }` plus `input` items. If the task needs
more than one node call — chained steps, branching, merges, or data flowing
between nodes — build the workflow and use the flow below.

## The one-off flow (multi-node)

1. **Build** the workflow with a **manual trigger** and pass
   `executionIntent: "one-off"` to `workflow_builder_build_workflow`. The
   completion criterion becomes a live run whose output you read back, not
   simulated verification.
2. **Setup** as usual through `setup_workflow` when the build needs it.
3. **Run live** by running `run_workflow` through `call_tool`.
4. **Read back before reporting**, with `get_execution_node_output`.
5. **Offer to clean up the workflow**: ask whether to keep or delete it.
