# Instance AI: draft workflow preview

## Goal

Make workflow builds in the n8n Assistant feel faster. Show the workflow on the
canvas as soon as the builder agent writes its source file. Do not wait for the
sandbox compile and the save.

## Current behavior

1. The builder agent writes `src/workflows/<name>.workflow.ts` in the sandbox
   with `workspace_write_file` or `workspace_str_replace_file`. It can also
   send `sourceCode` inline to `workflow_builder_build_workflow`.
2. `workflow_builder_build_workflow` compiles the file in the sandbox
   (`sandbox-tsx` in `workflow-source-compiler.ts`), validates it, and saves
   it.
3. The preview pane renders `InstanceAiWorkflowPreview` only when a saved
   `workflowId` exists (`InstanceAiThreadView.vue`, the
   `preview.activeWorkflowId` slot). A new workflow shows no canvas until the
   first save. An edit shows the old saved canvas until the next save.

## Decisions

| Topic | Decision |
|---|---|
| Trigger | Parse after each successful write to a workflow source file. This includes `workspace_write_file`, `workspace_str_replace_file`, and inline `sourceCode`. Do not parse partial (streaming) tool arguments. |
| Parser location | Backend. `instance-ai` reads the full file and calls `parseWorkflowCode` from `@n8n/workflow-sdk`. It pushes the `WorkflowJSON` to the UI. |
| UI | A read-only draft canvas (no iframe) in the workflow artifact tab, with a draft badge. The saved workflow replaces the draft when its canvas has loaded. |
| Edits to saved workflows | The draft replaces the saved canvas. Node positions stay the same where node names match. No diff highlights. |
| Failures | If the parse fails, keep the last good draft and show nothing to the user. The sandbox build result always wins. If the build fails, keep the draft and use the current error flow. |
| Rollout | PostHog experiment flag. Telemetry for exposure, first canvas render, and abandon. |
| Abandon | (a) The user presses stop while the agent is responding. (b) The user leaves the thread while the agent is responding. |

The existing `111_instance_ai_progressive_building` flag is a prompt profile
(`progressive@1`). It changes how the agent builds. It does not change the UI.
This feature is independent of it, and the two can run at the same time.

## Architecture

```mermaid
sequenceDiagram
  participant LLM as Builder agent
  participant RB as Run event bus (cli)
  participant P as WorkflowDraftPreviewer
  participant BUS as Thread event bus
  participant UI as Thread runtime + preview pane
  LLM->>RB: tool-call / tool-result events
  RB->>P: observe(event)
  RB->>BUS: publish(event)
  P->>P: read source → parseWorkflowSource → align with saved workflow
  P->>BUS: workflow-draft { filePath, workflowId?, revision, workflow } (ephemeral)
  BUS->>UI: draft tab + read-only draft canvas
  LLM->>RB: workflow_builder_build_workflow result { filePath, workflowId }
  RB->>BUS: tool-result
  BUS->>UI: settle draft → saved tab mounts under the draft
  UI->>UI: saved canvas emits workflow-loaded → dismiss draft
```

### Backend

- **Parser** (`@n8n/workflow-sdk`): `parseWorkflowSource(source)` strips the SDK
  imports and light TypeScript syntax with `prepareSourceForLint`, runs the AST
  interpreter, and serializes with `toJSON({ tidyUp: true })`. This is the same
  layout as the sandbox build, so nodes do not jump when the saved workflow
  replaces the draft.
- **Event** (`@n8n/api-types`): `workflow-draft` with `filePath`, an optional
  `workflowId`, a monotonic `revision` and the workflow. The event type is in
  `INSTANCE_AI_EPHEMERAL_EVENT_TYPES`, so it is never persisted or replayed.
- **Flag**: `137_instance_ai_draft_workflow_preview`, resolved in
  `resolveExperimentGates` as `draftWorkflowPreviewEnabled`.
- **Previewer** (`workflow-draft-previewer.ts`): `observe(event)` watches
  `tool-call`, `tool-result` and `tool-error` events.
  - `workspace_write_file` to a workflow source: parses the content from the
    tool arguments after a successful result. No read is necessary.
  - `workspace_str_replace_file`: reads the file after a successful result.
  - `workflow_builder_build_workflow` with inline `sourceCode`: parses at the
    tool call, before the sandbox compile starts.
  - For a bound file, it runs the same ID and position passes as the save
    (`preserveExistingNodeIds`, `preserveExistingNodePositions`).
  - It drops a draft that a newer write of the same file overtook. Any error
    produces no draft and a debug log only.
- **Hook point**: `createRunEventBus` (cli, `event-bus/run-event-bus.ts`) gives
  every published event to its observers: the work summary, the skill
  telemetry and the previewer. An observer that throws never blocks the event.
  The previewer exists on `OrchestrationContext` only when the flag is on. It
  publishes on the raw thread bus, so it never observes its own events.

### Frontend

- **State** (`instanceAi.workflowDrafts.ts`, thread runtime): drafts by file
  path. A lower revision is dropped. A successful build result with the same
  `filePath` sets `savedWorkflowId`. `dismissWorkflowDrafts(workflowId)`
  removes saved drafts.
- **Tabs, with several workflows open** (`useCanvasPreview`):
  - Each new workflow gets its own `draft:<filePath>` tab, marked `building`.
  - A draft of a saved workflow shows on that workflow's tab. It does not
    open a second tab.
  - Each new draft revision shows its tab through `showAgentArtifact`, so a
    tab that the user picked during the run stays on screen.
  - When the build saves a draft, an active draft tab (and the user's pick)
    moves to the saved workflow ID. A saved draft that is not on screen is
    dismissed at once.
  - Draft tabs are never stored with the thread's tabs and never stored as
    the active tab.
- **Draft canvas** (`InstanceAiWorkflowDraftPreview.vue`): no iframe and no
  editor `NodeView`. Each revision hydrates a throwaway workflow document
  store in its own namespace (`instance-ai-draft:<filePath>@draft-<revision>`),
  maps it with `useCanvasMapping`, and renders the read-only `Canvas`. This is
  the same approach as the workflow diff view. It fits the view only when a
  revision adds nodes. The badge reads "Draft · building…" while the agent
  works, and "Draft · not saved" after the agent stops.
- **Swap**: the draft canvas covers the preview slot. On a saved tab, the
  saved canvas mounts under it. When the saved canvas emits `workflow-loaded`,
  the thread view dismisses the saved draft, so the user never sees a loading
  spinner between the draft and the saved workflow.

### Telemetry

Three events in `@n8n/telemetry` (`INSTANCE_AI` domain). Each carries
`thread_id`, `run_id`, `variant` and `$feature/137_…`. Both arms emit them, so
the arms share a denominator.

| Event | When |
|---|---|
| `AI Assistant draft workflow preview exposed` | The first workflow build step of a run: a workflow builder target, a build call, or a workflow source write. Has `is_new_workflow`. |
| `AI Assistant workflow canvas first rendered` | Once for each run and `canvas_kind` (`draft` or `saved`), with `ms_since_message`. |
| `AI Assistant run abandoned` | Once for each exposed run. `reason: stopped` when the run root ends `cancelled` (stop button or amend). `reason: left` when the thread view unmounts or the page hides while the run is active. Has `canvas_state` and `ms_since_message`. |

## Edge cases

- **Source that the interpreter cannot parse** (helper functions, loops,
  imports it does not support): no draft. The user sees the current loading
  behavior.
- **Many files in one run:** each `filePath` has its own draft and tab.
- **Parallel or out-of-order parses:** the revision check on both the backend
  and the frontend drops the stale result.
- **Reload during a build:** drafts are ephemeral, so none are replayed. The
  next write sends a new draft.
- **Large workflows:** a draft with all node parameters can be large. Log the
  payload size at debug level. If it is a problem, remove large parameters
  (for example, Code node source) from the draft payload. The canvas does not
  need them.
- **Agent artifacts and other builder types:** not in scope. Only workflow
  source files make drafts.

## Implementation status

All tasks are implemented with tests. Manual verification in a running instance
is still open: force the flag to `variant`, build a new workflow, then edit it,
and check the events with `pnpm telemetry:sink`.

## Out of scope

- Parsing streaming tool arguments as they arrive.
- Diff highlights between the draft and the saved workflow.
- Parse errors shown to the user.
- Drafts for agent, data table, or skill artifacts.

## Evals

This change does not touch prompts or tool descriptions. The tool results that
the LLM sees do not change. No eval is necessary. The PostHog experiment
measures the effect.
