# Built-in agent tools

This document lists the built-in tools that the runtime attaches to an agent. It explains what each tool does and when the runtime attaches it.

The runtime attaches these tools in [`agent-runtime-reconstruction.service.ts`](./agent-runtime-reconstruction.service.ts). The main entry points are `injectRuntimeDependencies` and `attachTopLevelTools`.

## Before you add a built-in tool

Keep the number of built-in tools low. A long tool list costs tokens and makes tool selection harder for the model. Native tool search can defer definitions. Unsupported routes load the full catalog into the model context.

- Check the list in this document first.
- Extend an existing tool when it covers the use case. Do not add a similar tool.
- Update this document when you add, remove, or change a built-in tool.

## Tool visibility

The runtime enables native tool deferral during agent reconstruction. Direct
OpenAI Responses routes use native tool search from GPT-5.4, except GPT-5.4 Nano.
Direct Anthropic Messages routes use it from Claude 4.5. Numeric version rules
include later versions and dated snapshots. See the
[native deferral policy](../../../../@n8n/agents/docs/prompt-caching.md#native-tool-deferral).
The runtime checks the selected model and effective endpoint before each run.
Other providers, older versions, unknown model ID formats, Chat Completions,
custom endpoints, and Gateway credits use the complete eager catalog.

These local tools stay eager when they are attached:

- `workspace_read_file`
- `workspace_read_files`
- `workspace_read_tool_result`
- `workspace_write_file`
- `workspace_str_replace_file`
- `workspace_edit_files`
- `workspace_execute_command`
- `load_skill`
- `mark_session_failed`
- `create_plan`
- `read_plan`
- `update_plan`
- `close_plan`
- `background_jobs`

Planning and Continue must not depend on tool discovery. Their schemas stay
in model context when the tools are attached. The existing feature flags and
runtime rules still control whether the tools are attached.

Other eligible local tools are deferred. This includes built-in, custom,
workflow, node, integration, knowledge, memory, and MCP tools. Provider-native
tools stay eager. A local tool also stays eager when it has an explicit cache
marker or `deferLoading: false`.

Deferral changes model visibility only. All authorized handlers stay in the
execution registry. Validation, approval, and cancellation use the same paths.
The catalog, tool order, and instructions stay stable during discovery. Search
results stay in conversation history through memory and approval resume.

The same policy applies to inline and delegated children. The runtime checks
each child's selected model. There is no feature flag or Agent Builder setting.

## Tools attached to every agent

### `get_environment`

- Purpose: Returns the current date and time in ISO format, the instance timezone (IANA), and the day of week. The model calls it when it reasons about "today", deadlines, or schedules.
- Attach condition: Always attached.
- Source: [`tools/environment-tool.ts`](./tools/environment-tool.ts).

### `read_binary_data`

- Purpose: Reads a file by its fileId. The tool checks that the thread can read the file and that its bytes are still in storage. Other types than images, PDFs and text return an error.
  - Images and PDFs go to the model as file parts. The model must support the type: PNG, JPEG, GIF and WebP for images. The limit is the chat attachment size (10 MB). The file stays attached in later model calls, under the same budget as user files. A file outside the budget shows the text `[File "<name>" (fileId: <id>) is not attached now.]`.
  - The tool description tells the model to read a file that is not attached now again, and not to read a file that is already attached.
  - Text files (up to 200 KB) go into the tool result as text, one time. The tool result size guard applies to them, and later model calls do not load them again.
- Attach condition: The agent is not an inline agent.
- Source: [`tools/read-binary-data.tool.ts`](./tools/read-binary-data.tool.ts).

## Workspace and knowledge tools

Attach condition: The sandbox is on and the agent is not an inline agent. The runtime attaches them through `agent.workspace(...)` in `attachWorkspaceAndKnowledge`. A delegated sub-agent gets the same tools scoped to its own folder in the parent workspace.

Source: [`packages/@n8n/agents/src/workspace/tools/`](../../../../@n8n/agents/src/workspace/tools/).

| Tool | Purpose |
| --- | --- |
| `workspace_read_file` | Reads a file from the workspace. |
| `workspace_read_files` | Reads several files, or line ranges of them, in one call. |
| `workspace_read_tool_result` | Reads the full result of an earlier tool call. |
| `workspace_write_file` | Writes a file to the workspace. |
| `workspace_str_replace_file` | Replaces a string in a workspace file. |
| `workspace_edit_files` | Applies several writes and replacements in one call, and reports each result. |
| `workspace_append_file` | Appends content to a workspace file. |
| `workspace_list_files` | Lists the files in the workspace. |
| `workspace_file_stat` | Returns metadata for a workspace file. |
| `workspace_mkdir` | Creates a directory in the workspace. |
| `workspace_delete_file` | Deletes a file from the workspace. |
| `workspace_copy_file` | Copies a file in the workspace. |
| `workspace_move_file` | Moves a file in the workspace. |
| `workspace_rmdir` | Removes a directory from the workspace. |
| `workspace_execute_command` | Runs a shell command in the sandbox. |
| `workspace_list_processes` | Lists the processes that run in the sandbox. |
| `workspace_kill_process` | Stops a process in the sandbox. |

### Knowledge retrieval tools

- Purpose: `find_file` finds uploaded knowledge files by filename pattern. `search_text` searches the file contents with a regex. `read_file` reads one file.
- Attach condition: The sandbox is on, the `knowledge` module is active (`KnowledgeAvailabilityService` in the knowledge module answers this), the agent is not an inline agent, and the agent has knowledge files.
- Source: [`tools/knowledge/search-knowledge.tool.ts`](./tools/knowledge/search-knowledge.tool.ts).

## Tools attached to top-level agents only

### Chat integration tools

- Purpose: For each configured chat integration, the runtime attaches a context tool and an action tool. The context tool reads message context from the platform. The action tool acts on the platform, for example to send a message. The tool names use the integration type: `<type>_context` and `<type>_action`, for example `slack_context` and `slack_action`. A second connection of the same type gets a numeric suffix. n8n Chat adds `chat_context` and `chat_action`.
- Attach condition: Top-level agent with at least one configured chat integration, or a run through n8n Chat.
- Read-only platform queries return `CONTEXT_QUERY_TIMEOUT` after 30 seconds. The agent can then explain the delay or use a more specific lookup. Cancellation stops the wait. A platform request can continue if its SDK does not support cancellation. This deadline does not apply to actions or normal replies. Slack keeps its default request timeout, retry, and rate-limit handling.
- Use `get_user` for a known platform user ID. Use `search_users` with `email` for an exact email address. Slack also recognizes an email or user ID in `query`. If Slack email lookup lacks `users:read.email`, the tool reports the missing permission. It does not scan the directory for an unavailable email field.
- Slack user and channel searches read up to five directory pages of 200 entries per call. They stop when a page has matches or the directory ends. If five pages have no matches and more remain, the tool returns `CONTEXT_SEARCH_INCOMPLETE` and `nextQuery` to continue. Only a completed search returns a successful empty list.
- Slack user and channel searches return `nextCursor` when more results remain. The cursor retains unused matches from the current page and binds the search criteria and filters. Keep the same search inputs when you continue. Use `get_channel_info` when the channel ID is known.
- Teams and Linear user searches use platform filters. They return a continuation cursor when the platform has another page.
- Source: [`integrations/integration-tool-factory.ts`](./integrations/integration-tool-factory.ts).

### `delegate_subagent`

- Purpose: Delegates a task to a configured sub-agent or to an inline copy of the agent. The input requires `subAgentId`, `taskName` and `goal`. Foreground is the default. It waits for the child result. When background tasks are on, `mode: "background"` starts a detached job and returns a receipt.
- Attach condition: Top-level agent.
- Background mode requires `AgentsConfig.backgroundTasksEnabled` and a caller that permits background tasks. The runtime omits the mode input when background tasks are off.
- Source: [`sub-agents/delegate-sub-agent-tool.ts`](./sub-agents/delegate-sub-agent-tool.ts).

### `write_todos`

- Purpose: Writes a task list for the run. The agent uses it to plan and to track progress.
- Attach condition: Top-level agent when plan tools are disabled or the caller passes `allowPlanTools: false`.
- Source: [`packages/@n8n/agents/src/runtime/tools/write-todos-tool.ts`](../../../../@n8n/agents/src/runtime/tools/write-todos-tool.ts).

### `mark_session_failed`

See the [dedicated section](#mark_session_failed-session-outcomes).

## Plan tools

Attach condition: Top-level agent with `AgentsConfig.planToolsEnabled` enabled, unless the caller passes `allowPlanTools: false`.
Other top-level agents receive `write_todos`. Sub-agents receive neither tool set.

Source: [`plans/agent-plan-tools.ts`](./plans/agent-plan-tools.ts).

`create_plan` takes a complete document. `read_plan` returns the saved document and revision.
`update_plan` takes a partial `document`, `planId`, and `expectedRevision`.
Send only fields that must change. Do not resend unchanged tasks, descriptions, or dependencies.
The tool merges `items` and group `tasks` by ID. Omitted fields and items stay unchanged.
Existing items keep their order. New items append and require all creation fields with a `new:` ID.
For a child task, send its group ID and put the child update in `tasks`.
For example, a parent-run task completion needs only:

```json
{
  "planId": "<saved plan UUID>",
  "expectedRevision": 4,
  "document": {
    "items": [{ "id": "<saved task UUID>", "status": "done", "resultSummary": "Reviewed the findings." }]
  }
}
```

Use `removeItemIds` to remove pending items. An empty `items` or `tasks` list removes nothing.
A supplied `dependsOn` list replaces that item's dependencies. Use `[]` to clear it.
Set `presentation`, `presentation.detail`, `resultSummary`, or `fallbackFor` to `null` to clear it.
The service validates the complete result and saves it with its history in one transaction.
Task prerequisites and service timestamps remain protected. Titles and result summaries can change after completion.
If an update fails, correct it and retry before reporting progress. Read the plan again after a revision conflict.
`close_plan` closes the active plan without changing its document or cancelling work.

Plan format 2 gives each task one source of status:

- Parent-run tasks store their status and timestamps in the plan. Use `update_plan` for these tasks.
- Delegated tasks store one owning job ID. Register the job and bind it to the task in one transaction.
- Groups store no status or timestamps. Calculate them from their children.

A running job or an approval wait means `in_progress`. A paused job means `paused`.
A completed job means `done`. Failed and cancelled jobs keep those statuses.
A Continue capacity reservation remains `paused` until the job resumes.
Nested jobs can inherit a task reference. They do not control the task status.

Group status uses this priority: `in_progress`, `paused`, `pending`, `failed`, `cancelled`, then `done`.
An empty group stays `pending`. Successful fallbacks replace their original tasks in this calculation.
The same calculation supplies plan reads, dependency checks, delegation checks, and Continue selection.
Job states load in one batch. Job transitions do not change the plan revision or history.
Keep linked job records while the plan exists.

The parent can edit titles and result summaries. It cannot override a delegated task status.
Create a new task for further delegated work. A manual task can move from `done` to `in_progress`
only if no task that depends on it has started.

Snapshots report `finishedAt` when all leaves have a final status.
The current-plan GET route is authoritative. Chat history cannot restore a deleted plan card.
Refresh the card on conversation load, job updates, plan-tool completion, and reconnection.
Job transitions can change a snapshot without changing its revision.

### Development data reset

`ResetAgentPlansForJobStatus1793353273511` is irreversible. It removes format 1 plans and their history.
It clears their job links and obsolete plan references in Stop records and checkpoint resume metadata.
It preserves chat messages, executions, background jobs, job outcomes, and unrelated checkpoint data.
It does not convert old plans. New plans use format 2, including plans in existing conversations.
Use a coordinated restart for this development upgrade. Restart completion remains best effort.

## `background_jobs`

Attach condition: Top-level agent and background tasks on. Background tasks are on when `AgentsConfig.backgroundTasksEnabled` is set and the caller does not pass `allowBackgroundTasks: false`. Scheduled and manually started task runs pass `false`. Human-in-the-loop resume support does not change this condition. It only controls whether workflow tools move waiting workflows to the background.

Source: [`background/background-job-tools.ts`](./background/background-job-tools.ts).

One tool covers all background job operations. The `action` input selects the operation:

| Action | Purpose |
| --- | --- |
| `check` | Lists the background jobs of the conversation with their status, results and output files. `jobIds` limits the list. |
| `cancel` | Cancels a running background job. `jobId` is required. |
| `resume` | Resumes selected stopped plan tasks, or the latest stop group outside a plan. |

Do not add a separate tool for a new background job operation. Add an action to this tool.

Use `delegate_subagent` with `mode: "background"` to start a background sub-agent.
Pass `planTask: { planId, planTaskId }` for work in an active plan. This applies to every run that has the plan tools.
The host checks the leaf task and its prerequisites before dispatch.
Children inherit this link from host metadata. They cannot change it through tool input.
Waiting workflow jobs retain the same link. Foreground workflows do not get background job rows.

To continue a plan, call `background_jobs` with `action: "resume"` and `planId`.
Pass `planTaskIds` to continue only those tasks. A group selects its unfinished children.
An empty `planTaskIds` list is invalid. Omit it to select the whole plan.
The tool does not resume prerequisites or approve pending tools.
It reports blocked tasks, failed resumes, and workflows that need a new execution.
Stop sets unfinished parent-run tasks to `paused`. Continue restores selected tasks to `pending`
or `in_progress`, based on whether they had started. Unstarted parent-run tasks can return to `pending`
while prerequisites remain unfinished. Continue does not dispatch them. Paused jobs with unfinished prerequisites stay paused.
Delegated tasks follow their jobs. A paused sub-agent resumes the same job.
A cancelled workflow needs a new task and job. Use `fallbackFor` when it replaces cancelled work.

A new user turn admits chat work. It does not resume stopped tasks.
New plan tasks can run while older tasks remain stopped.
A completed background job makes its task Done without a separate result approval.
The parent still needs explicit updates for work it performs itself, including comparisons and recommendations.

## `mark_session_failed`: session outcomes

- The agent calls this tool when it cannot complete the task. The agent passes a short reason.
- The runtime saves the reason as the execution error. The session list shows the session as an error.
- The trace does not change.
- Future session outcomes and metadata must extend this tool. In such case, renaming this tool would be okay. An example is partial success. Do not add a new tool for them.
- The tool can get a more generic name later to cover session metadata and results.
- Attach condition: Top-level agent.
- Source: [`tools/mark-session-failed.tool.ts`](./tools/mark-session-failed.tool.ts).
