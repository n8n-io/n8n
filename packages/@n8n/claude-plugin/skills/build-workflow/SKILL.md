---
description: >
  Build an n8n workflow automation from a natural-language brief. Use
  when the user wants to create a workflow, automate a process, connect
  services, or set up a scheduled job.
argument-hint: "[describe the workflow you want]"
---

# Build Workflow

Build an n8n workflow based on the user's description: "$ARGUMENTS"

## Preflight

Before the first tool call, verify the builder tools are available.
The n8n MCP server only registers `search_nodes`, `get_node_types`,
`get_suggested_nodes`, `validate_workflow`, `create_workflow_from_code`,
`update_workflow`, `search_projects`, `search_folders`,
`get_sdk_reference`, and `archive_workflow` when
`N8N_MCP_BUILDER_ENABLED=true` (the default). If any are missing from
the tool list, stop and tell the user:

> Workflow building is disabled on this n8n instance. Ask your n8n
> operator to set `N8N_MCP_BUILDER_ENABLED=true`, or build in the
> n8n UI.

## Flow

1. **Understand the requirement.** Clarify what the user wants
   automated, which services are involved, and what triggers the
   workflow. Ask one or two focused questions if the brief is vague
   — don't guess.

2. **Read the SDK reference.** Call `get_sdk_reference` (or read the
   `n8n://workflow-sdk/reference` resource if your client supports
   resources). This is not optional — the SDK has specific patterns
   for expressions, connections, and node configs that guessing will
   get wrong.

3. **Discover nodes.** Call `search_nodes` with one query per service
   plus any utility nodes:
   `["gmail", "slack", "schedule trigger", "set", "if"]`.
   Note each result's discriminators (`resource`, `operation`, `mode`)
   — you'll need them in step 4.

4. **Get type definitions — mandatory.** Call `get_node_types` with
   ALL node IDs you plan to use, including discriminators. Do NOT
   guess parameter names. The TypeScript types returned are the
   authoritative contract; anything else produces invalid workflows.

5. **(Optional) Category suggestions.** If the workflow fits a
   category like `chatbot`, `notification`, `scheduling`,
   `data_transformation`, `content_generation`, or `triage`, call
   `get_suggested_nodes` for curated recommendations before coding.

6. **Write the workflow code.** Use SDK patterns from step 2 and
   exact parameter names from step 4. Give each node a purpose-
   describing name. Include error-handling where appropriate.

7. **Validate.** Call `validate_workflow` with the full code. Fix
   every error and warning and re-validate until clean. Don't
   create from invalid code.

8. **Resolve project (optional).** If the user wants the workflow in
   a specific project, call `search_projects` to find the
   `projectId`; otherwise create in the user's personal project.

9. **Create.** Call `create_workflow_from_code` with the validated
   code, a clear 1–2 sentence `description`, and the `projectId` if
   resolved. The response includes the workflow URL.

10. **Report.** Share the URL. Summarize what was created: trigger
    type, key nodes, and any workflow credentials that were
    auto-assigned. Ask whether the user wants to test it with
    `/n8n:test-workflow`, run it live with `/n8n:run-workflow`, or
    publish it with `/n8n:publish-workflow`.

## Safety

- Never publish in this skill. Publishing is explicit and lives in
  `/n8n:publish-workflow`.
- Flag any nodes that will write to external systems (send emails,
  post messages, delete data) in the final summary so the user
  sees them before running or publishing.
