---
description: >
  Debug a failed n8n workflow execution. Use when the user pastes both
  a workflow ID and an execution ID, or responds to a run/test failure
  that includes both IDs.
argument-hint: "[workflowId] [executionId]"
---

# Debug Execution

Debug an n8n workflow execution: "$ARGUMENTS"

## Contract constraint

`get_execution` requires **both** `workflowId` and `executionId`.
`search_workflows` searches by name/description only — it cannot
recover the owning workflow from an execution ID. This skill
therefore requires both IDs as explicit inputs. Every handoff path
(run, test, error reports) supplies both.

## Flow

1. **Require both IDs.** Parse `$ARGUMENTS` for two ID-shaped tokens.
   If either is missing, stop and ask:

   > Debugging needs both the workflow ID and the execution ID.
   > Open the failed execution in your n8n instance — both IDs
   > appear in the URL path. Paste them here as
   > `/n8n:debug-execution {workflowId} {executionId}`.

   Do NOT attempt to look up the workflow from the execution ID
   alone — the MCP surface doesn't support it today.

2. **Fetch execution data.** Call `get_execution` with
   `includeData: true`. For large workflows, trim noise with
   `nodeNames` (start with the failing node + its immediate
   predecessors) and `truncateData` (e.g. 10 items per output).

3. **Analyze the failure.** Identify:
   - Which node failed and the full error message
   - The input data that reached the failing node
   - Whether upstream nodes produced expected outputs
   - Error category:
     - **Configuration** — wrong parameter, missing required field,
       invalid expression
     - **Data** — unexpected input shape, missing field, empty array
     - **Logic** — wrong condition, incorrect connection, unintended
       branch taken
     - **External service** — API returned error, rate limited, auth
       expired

4. **Diagnose.** Explain plainly:
   - What went wrong, in one sentence
   - Which node is the root cause (not necessarily the one that
     errored — upstream may have fed bad data)
   - Whether it's workflow logic or an external dependency

5. **Suggest fixes.**
   - If the fix is a parameter or expression change, describe it
     and offer to apply via `/n8n:update-workflow`.
   - If the fix is data-shape related (upstream produced wrong
     output), trace to the upstream node and describe its fix.
   - If the issue is external (credentials, rate limit, API outage),
     say so and point at the n8n UI for credential work.

6. **Report.** Use the `execution-result` output style if the user
   wants a compact summary; otherwise prose is fine.
