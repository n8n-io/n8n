---
description: >
  Live-execute an n8n workflow and report the result. Use when the user
  wants to run, trigger, or kick off a workflow for real. For safer dry
  runs with pinned data, use /n8n:test-workflow.
argument-hint: "[workflow name or id]"
---

# Run Workflow

Run an n8n workflow: "$ARGUMENTS"

This skill performs **live execution** via `execute_workflow`
(`openWorldHint: true` — hits real external systems). For
side-effect-minimized runs, use `/n8n:test-workflow` instead.

## Flow

1. **Resolve the workflow.**
   - If `$ARGUMENTS` looks like an ID (no whitespace, ID-shaped), go
     straight to `get_workflow_details`. `search_workflows` cannot
     resolve raw IDs — it searches by name/description only.
   - Otherwise call `search_workflows` with the user's query and pick
     the unambiguous match.
   - Filter to `availableInMCP: true`. If the best match is `false`,
     stop with: "This workflow isn't exposed to MCP. Open n8n →
     Settings → MCP → Available Workflows, toggle it on, and retry."

2. **Get details.** Call `get_workflow_details`. Remember:
   - `workflow.nodes` is the DRAFT
   - `workflow.activeVersion.nodes` is what production runs
   - `triggerInfo` is computed from draft nodes only

   If they differ, warn the user before production-mode execution.

3. **Choose execution mode FIRST.** This is a VERSION choice:
   - `executionMode: 'manual'` → runs the DRAFT (all trigger types,
     including unpublished workflows, including Manual Trigger)
   - `executionMode: 'production'` → runs `activeVersion` (Manual
     Trigger excluded; workflow must be published)

   Defaults:
   - User says "test the draft" / workflow is unpublished / only
     Manual Trigger present → `manual`
   - User says "run it live" / workflow is published → `production`
   - Ambiguous → ask.

4. **Refuse multi-trigger workflows on the relevant node set.**
   Count supported triggers on the node set the chosen mode will
   actually execute (draft for `manual`, `activeVersion.nodes` for
   `production`). If more than one supported trigger is present on
   that set, stop: `execute_workflow` has no selector and the server
   silently fires the first. Ask the user to disable extras in the
   n8n UI or publish a single-trigger version. A workflow that is
   multi-trigger in draft but single-trigger in `activeVersion` is
   fine to run in `production`.

5. **Execute.** Call `execute_workflow` with `workflowId`,
   `executionMode`, and inputs matching the trigger:
   - Manual / Schedule → no `inputs` needed
   - Webhook → `inputs: { type: 'webhook', webhookData: {...} }`
   - Chat → `inputs: { type: 'chat', chatInput: '...' }`
   - Form → `inputs: { type: 'form', formData: {...} }`

6. **Poll briefly.** Call `get_execution` with the `executionId`. For
   fast workflows, a short poll (2–3 tries, a few seconds apart) is
   fine. For multi-minute workflows, return the execution ID to the
   user and let them check back with
   `/n8n:debug-execution {workflowId} {executionId}`.

7. **Report.** Use the `execution-result` output style for the
   summary. On failure, end with:

   > Debug with `/n8n:debug-execution {workflowId} {executionId}`

   Always include both IDs — `get_execution` needs both.
