---
description: >
  Activate an n8n workflow for production. Use when the user wants to
  publish, enable, activate, or go live with a workflow.
argument-hint: "[workflow name or id]"
---

# Publish Workflow

Publish an n8n workflow: "$ARGUMENTS"

## Scope — current draft only for v0.1

This skill publishes the **current draft**. Publishing a specific
historical `versionId` is possible server-side, but `get_workflow_details`
computes `triggerInfo` from the draft, which means pre-publish
summaries and post-publish webhook URLs can be wrong for older
versions. If the user asks to publish a historical version, hand off
to the n8n UI.

## Flow

1. **Resolve the workflow.** ID-shaped → `get_workflow_details`
   direct. Otherwise `search_workflows` first. Reject workflows with
   `availableInMCP: false` with the Settings → MCP remediation.

2. **Refuse historical versions.** If the user specified a
   `versionId` that is not the current draft, stop and point them at
   the n8n UI.

3. **Confirm intent.** Summarize the trigger type and what
   activating will do, e.g.:

   > Publishing "{name}" will begin polling Gmail every 15 minutes
   > and posting new messages to #alerts. Proceed?

   Never publish silently — always wait for confirmation.

4. **Publish the current draft.** Call `publish_workflow` with just
   `workflowId` (no `versionId`).

5. **Fetch webhook URL if applicable.** `publish_workflow` does NOT
   return webhook URLs. If the trigger is a Webhook, make a follow-up
   `get_workflow_details` call and surface the webhook endpoint so
   the user can wire it up externally.

6. **Report.** Confirm the `activeVersionId` and any webhook URLs.
   Remind the user they can deactivate with `/n8n:run-workflow` is
   for live runs, and they can revert via the n8n UI.
