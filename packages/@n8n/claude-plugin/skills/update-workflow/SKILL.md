---
description: >
  Update an existing n8n workflow with new or modified logic. Use when
  the user wants to edit, tweak, or change a workflow — e.g. swap a
  Slack channel, add a step, or fix a condition. Reliable for
  AI-generated workflows; for UI-authored workflows, warn first.
argument-hint: "[workflow name or id] — [what to change]"
---

# Update Workflow

Update an n8n workflow: "$ARGUMENTS"

## Scope caveat

`update_workflow` takes **full SDK code** and replaces the workflow's
nodes and connections entirely. There is no MCP tool to convert an
existing UI-authored workflow JSON back into SDK code — for those
workflows, Claude has to reconstruct the entire definition from the
draft JSON. That's fragile for:

- Large workflows (easy to miss a node)
- Expression-heavy nodes (reconstruction can lose operators)
- Disabled branches (aren't always visible in `get_workflow_details`)
- Manually curated layout (always lost)

Extra sharp edges:
- **Credentials preserved only when node name AND type both match.**
  Renaming a node drops its credential attachment.
- **HTTP Request nodes are skipped by credential auto-assign** — they
  will need manual credential wiring in the n8n UI after update.

## Flow

1. **Resolve the workflow.** ID-shaped → `get_workflow_details`
   direct. Otherwise `search_workflows` first. Reject workflows with
   `availableInMCP: false`.

2. **Classify origin (heuristic).** Check `workflow.meta.aiBuilderAssisted`:
   - `true` → previously created or updated via the SDK flow. Lower
     risk.
   - missing / `false` → likely UI-authored. Surface:

     > This workflow was likely authored in the n8n UI. Updating via
     > SDK regenerates the entire definition, which can break
     > expressions, disabled branches, and manually curated layout.
     > Proceed, or hand off to the n8n UI?

   The flag is a heuristic, not proof of SDK round-trip safety.

3. **Plan the change.** Describe exactly what will be modified before
   writing code. If the change is structural (adding/removing nodes),
   warn about any running executions that might be affected.

4. **Prepare new code.** Follow the build flow:
   - `get_sdk_reference` (if not already in context)
   - `search_nodes` for any new services
   - `get_node_types` for ALL nodes in the final workflow (not just
     the changed ones — the full code needs exact parameter names)
   - Write the full updated code
   - `validate_workflow` until clean

   Preserve credential attachments by keeping node names and types
   stable. If a rename is unavoidable, call it out so the user knows
   the credential will need to be re-attached.

5. **Apply.** Call `update_workflow` with `workflowId` and the
   validated code. This replaces the workflow definition entirely.

6. **Report.** Summarize what changed, flag any dropped credentials
   or HTTP Request nodes that need manual rewiring, and offer to
   test via `/n8n:test-workflow` before the user publishes.
