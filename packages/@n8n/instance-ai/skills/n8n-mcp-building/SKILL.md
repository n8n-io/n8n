---
name: n8n-mcp-building
description: >-
  Load before you build, edit, or repair a workflow. Build with the n8n MCP
  tools: search_nodes, get_node_types, validate_workflow,
  create_workflow_from_code, and update_workflow. Then set up credentials with
  workflows(action="setup") and test with test_workflow. For workflows that
  create or write Data Tables, load data-table-manager first.
---

# Build with the n8n MCP tools

These rules override the build, save, verify, and planning steps above. The SDK
patterns, expression rules, and node configuration rules above stay valid.

`build-workflow`, `verify-built-workflow`, `apply-workflow-credentials`, and
`create-tasks` are not available. Do not save workflows from workspace files.
Pass the workflow code directly to the MCP tools.

## Steps

1. Find nodes with `search_nodes`. Read the exact definitions with
   `get_node_types` before you configure a node. Use `explore_node_resources`
   for live lists, for example sheets, channels, or models.
2. If you are not sure about an SDK pattern, read
   `get_workflow_sdk_reference` or `get_workflow_best_practices`.
3. Write the complete SDK code. Call `validate_workflow` with the code. Fix every
   error, then validate again.
4. For a new workflow, call `create_workflow_from_code` with the code, a name,
   and the `projectId` or `folderId` when you know it.
5. For an existing workflow, read it with `get_workflow_details`. Then change it
   with `update_workflow`. Keep the changes to the nodes that the user asked
   about.
6. After the workflow is saved, call `workflows(action="setup", workflowId)` to
   set up credentials and parameters. Do not pass `filePath` to
   `credentials(action="setup")`.
7. Test with `prepare_workflow_pin_data`, then `test_workflow` with that pin
   data. Read the result with `get_workflow_execution`. Use `execute_workflow`
   only when the user asks for a live run.
8. Publish with `publish_workflow` only when the user asks.

## Access and approvals

The `availableInMCP` setting does not limit you. You can read and change every
workflow that the user can access. Ignore the `availableInMCP` field in results.

Tools that change data can ask the user for approval. Wait for the result. If
the user denies the change, stop and ask what to do next.
