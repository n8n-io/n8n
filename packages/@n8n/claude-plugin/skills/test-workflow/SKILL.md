---
description: >
  Test an n8n workflow with pinned data — pins trigger, credential,
  and HTTP nodes so external calls are bypassed. Use when the user
  wants to dry-run, verify, preview, or sandbox a workflow without
  live side effects. For live runs, use /n8n:run-workflow.
argument-hint: "[workflow name or id]"
---

# Test Workflow

Test an n8n workflow: "$ARGUMENTS"

## Side-effect caveat

`test_workflow` pins trigger, credential, and HTTP Request nodes so
most external calls are bypassed — but credential-free I/O nodes
(Execute Command, file-write, Code) still execute for real even with
pin data. This is closer to a sandbox than a pure simulation.
Surface which specific nodes in the workflow fall into that category
before the first run.

## Flow

1. **Resolve the workflow.** ID-shaped → `get_workflow_details`
   direct. Otherwise `search_workflows` then `get_workflow_details`.
   Filter to `availableInMCP: true`; on `false`, show the
   Settings → MCP remediation.

2. **Prepare pin data.** Call `prepare_test_pin_data` with the
   `workflowId`. Review:
   - `nodeSchemasToGenerate` — nodes that need pins and have a
     schema available
   - `nodesWithoutSchema` — nodes that need pins but have no schema
     (walk the user through constructing minimal pin items)
   - `nodesSkipped` — nodes that don't need pinning
   - `coverage` — overall readiness

3. **Walk side-effect risk.** Scan the node list for Execute
   Command, file-write, and Code nodes. Surface each one with its
   node name. Ask for confirmation if any are present and would
   actually run.

4. **Resolve trigger (multi-trigger only).** If multiple supported
   triggers exist, ask the user which to fire and pass
   `triggerNodeName`.

5. **Execute.** Call `test_workflow` with `workflowId`, `pinData`,
   and `triggerNodeName` if provided.

6. **Report.** Use the `execution-result` output style. On failure:

   > Debug with `/n8n:debug-execution {workflowId} {executionId}`
