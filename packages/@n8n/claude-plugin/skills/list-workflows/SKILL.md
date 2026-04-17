---
description: >
  List and search n8n workflows. Use when the user asks what workflows
  they have, wants to find a specific workflow, or needs an overview of
  their automations.
argument-hint: "[search query] (optional)"
---

# List Workflows

Search for workflows: "$ARGUMENTS"

## Flow

1. **Resolve project (optional).** If the user named a project, try
   `search_projects` first to get the `projectId`. If
   `search_projects` isn't available (builder tools disabled),
   either ask the user to paste the project ID or fall back to a
   global search.

2. **Search.** Call `search_workflows` with:
   - `query`: the user's term, if any (searches name/description)
   - `projectId`: from step 1, if any
   - `limit`: 50 by default, up to 200

3. **Present results as a table:**

   | Name | Active | MCP | Updated |
   |------|--------|-----|---------|
   | ...  | yes/no | yes/no | date |

   Call out any rows where `availableInMCP: false` — action skills
   (run, test, publish, update) will reject them, and the user will
   need to toggle them on in n8n → Settings → MCP before using them.

4. **Trigger type is not in search results.** `search_workflows`
   does NOT return trigger type. If the user asks for it, offer to
   fan out `get_workflow_details` for a small subset (≤5 workflows).
   Never do the fanout for the full list by default.

5. **Drill-down.** If the user picks one, call
   `get_workflow_details` and summarize:
   - Trigger (from `triggerInfo`, which reflects the draft)
   - Node count and key node names
   - Active version vs draft — flag if they differ
   - Tags, folder, project (if known)

   Offer next steps: `/n8n:run-workflow`, `/n8n:test-workflow`,
   `/n8n:publish-workflow`, or `/n8n:update-workflow`.
