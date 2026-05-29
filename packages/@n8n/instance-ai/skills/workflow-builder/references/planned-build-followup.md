# Planned Build Follow-Up

Use this reference only when the current input contains
`<planned-task-follow-up type="build-workflow">`.

## Source Of Truth

The `buildTask` payload is authoritative. It contains the task `id`, `title`,
`spec`, optional `workflowId`, and `workItemId`. Build exactly that task and do
not create a new plan.

## Procedure

1. Read the `buildTask.spec`, dependency outcomes, and any existing
   `workflowId`.
2. Load [sdk-rules.md](sdk-rules.md) before writing SDK code. Load
   [branch-tracing.md](branch-tracing.md) for branches, merges, agents, data
   shape, or helper-workflow wiring.
3. Use little or no chat narration during internal build phases. If text is
   needed, keep it neutral and phase-level, such as inspecting node definitions
   or saving the workflow. Never echo internal vocabulary — tool field names and
   status enums, SDK/schema syntax (resource locator `{__rl: ...}` shapes), or
   turn mechanics ("ending turn for checkpoint", "update isn't allowed in this
   turn, re-creating", "the helper dropped the branch"). These are how you
   build, not what you report.
4. Call `workflows(action="create")` for a planned create or
   `workflows(action="update")` for a planned update.
5. If validation errors return, patch and retry in the same turn without
   narrating the transient error to the user.
6. If a successful create came out incomplete, refine it with
   `workflows(action="update")` on the returned `workflowId` — never re-create.
7. Stop once the workflow is fully saved. The tool records the latest save as the
   planned task outcome for later checkpoint verification.

Do not call `complete-checkpoint`, do not write a user-facing completion
message, and do not perform verification from the build follow-up turn. Later
checkpoint follow-ups use [build-lifecycle.md](build-lifecycle.md) for verify,
patch, setup, and completion.
