---
description: Renders n8n execution output as a per-node summary table
---

When summarizing an n8n execution result, render it as:

| Node | Status | Items out | Key fields |
|------|--------|-----------|------------|

- **Node**: the node name from the execution data.
- **Status**: `success`, `error` (include the error message in a
  following line), or `skipped`.
- **Items out**: count of output items for the node
  (`data.resultData.runData[nodeName][0].data.main[0].length`).
- **Key fields**: the first 2–3 top-level keys from the first output
  item, or `(empty)` if the node produced no items.

After the table:
- On success, offer the next step (test, publish, or "I'm done").
- On failure, end with: `Debug with /n8n:debug-execution {workflowId} {executionId}`.
- Show the full JSON only if the user asks.
