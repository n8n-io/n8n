---
name: workflow-builder
description: >-
  Builds and edits n8n workflows directly with the workflow SDK and the
  workflows tool. Use for existing-workflow edits, fixes, node rewiring,
  credential-preserving patches, verification, setup routing, and workflow
  creation only inside approved planned build follow-up turns. Do not load on a
  normal new-workflow request; call plan first, then load this skill from the
  approved build-workflow follow-up.
recommended_tools:
  - workflows
  - verify-built-workflow
  - executions
  - credentials
  - nodes
  - data-tables
  - parse-file
  - ask-user
platforms:
  - daytona
---

# Workflow Builder
## Stop First
If this is a normal user-facing request for a brand-new workflow and there is no
`<planned-task-follow-up type="build-workflow">`, stop using this skill and call
`plan`. Do not call `workflows(action="create")` from that turn.

Use this skill for existing-workflow edits, planned build follow-ups,
verification/checkpoint follow-ups, setup routing, and narrow patches after tool
or execution evidence.
## Default Procedure
1. Classify the request: planned build follow-up, existing-workflow edit, patch
   after an error, setup, or checkpoint verification.
2. Inspect current state. Use `workflows(action="get-as-code")` when a
   `workflowId` is available and patches need exact source strings.
3. Discover node definitions before configuring nodes. Treat `@builderHint`
   annotations and live tool results as current documentation.
4. Check credentials with `credentials(action="list")`. Preserve explicit
   user-selected credentials. If exactly one matching credential exists, wire it.
   If multiple matching credentials exist and the user did not name one, ask
   once with a single-select.
5. Generate complete TypeScript SDK code or targeted `patches`, then call
   `workflows(action="create")` only inside approved planned build follow-ups or
   `workflows(action="update", workflowId, ...)` for existing workflows.
6. Patch validation or verification failures from tool evidence. Stop only after
   a successful save, successful verification, completed setup handoff, or a
   concrete blocker.
7. If a mutating tool returns `denied: true`, stop immediately and tell the user
   no changes were made.
8. Do not narrate transient validation, build, or verification errors that you
   can repair. Keep working with tools; mention an error only when it becomes a
   concrete blocker or needs user input.
9. Never leak internal vocabulary into visible text: tool field names and status
   enums (`verificationReadiness`, `setupRequirement`, `not_verifiable`,
   `needs_setup`), SDK/schema syntax (resource locator `{__rl: ...}` shapes,
   placeholder mechanics), and turn mechanics ("ending turn for checkpoint",
   bare "workflow saved"). Translate any status into a plain sentence about the
   user's goal, or stay silent and let the status UI show progress.
## Load Detail When Needed
- Use [references/sdk-rules.md](references/sdk-rules.md) before writing or
  repairing workflow SDK code.
- Use [references/build-lifecycle.md](references/build-lifecycle.md) after a
  save, during checkpoint verification, or when setup/publish routing matters.
- Use [references/branch-tracing.md](references/branch-tracing.md) for IF,
  Switch, Merge, multi-item, AI-agent, and modular-workflow wiring.
- Use [references/planned-build-followup.md](references/planned-build-followup.md)
  when the input contains `<planned-task-follow-up type="build-workflow">`.
## Non-Negotiables
This skill replaces the old detached workflow-builder agent. Keep the same
builder discipline even though workflow tools are native.
- Never delegate workflow-building work.
- Never invent credential IDs, API tokens, resource IDs, Slack channels,
  Telegram chat IDs, email addresses, bearer tokens, or sample user data. Use
  `placeholder()` for user-provided values that setup must collect later.
- When configuring node credentials in SDK code, use the credential property
  names from the node definition, for example
  `credentials: { slackApi: newCredential('Slack') }`.
- Do not use web search to learn workflow SDK syntax or node type IDs; use the
  `nodes` tool for node search and type definitions.
- Do not use `workflows(action="update-json")`; it is reserved for internal eval
  setup flows that patch raw WorkflowJSON after separate approval.
- Publish only when the user explicitly asks.
## Completion
In planned build follow-up turns, do not write a user-facing completion message
after the successful workflow create/update call. On normal user-facing turns,
finish with one concise sentence naming the saved or verified workflow and any
setup status.
