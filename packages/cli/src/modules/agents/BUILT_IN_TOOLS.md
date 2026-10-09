# Built-in agent tools

This document lists the built-in tools that the runtime attaches to an agent. It explains what each tool does and when the runtime attaches it.

The runtime attaches these tools in [`agent-runtime-reconstruction.service.ts`](./agent-runtime-reconstruction.service.ts). The main entry points are `injectRuntimeDependencies` and `attachTopLevelTools`.

## Before you add a built-in tool

Keep the number of built-in tools low. Each built-in tool goes into the context of every agent run. A long tool list costs tokens and makes tool selection harder for the model.

- Check the list in this document first.
- Extend an existing tool when it covers the use case. Do not add a similar tool.
- Update this document when you add, remove, or change a built-in tool.

## Tools attached to every agent

### `get_environment`

- Purpose: Returns the current date and time in ISO format, the instance timezone (IANA), and the day of week. The model calls it when it reasons about "today", deadlines, or schedules.
- Attach condition: Always attached.
- Source: [`tools/environment-tool.ts`](./tools/environment-tool.ts).

## Workspace and knowledge tools

Attach condition: The sandbox is on and the agent is not an inline agent. The runtime attaches them through `agent.workspace(...)` in `attachWorkspaceAndKnowledge`. A delegated sub-agent gets the same tools scoped to its own folder in the parent workspace.

Source: [`packages/@n8n/agents/src/workspace/tools/`](../../../../@n8n/agents/src/workspace/tools/).

| Tool | Purpose |
| --- | --- |
| `workspace_read_file` | Reads a file from the workspace. |
| `workspace_read_tool_result` | Reads the full result of an earlier tool call. |
| `workspace_write_file` | Writes a file to the workspace. |
| `workspace_str_replace_file` | Replaces a string in a workspace file. |
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
- Attach condition: The sandbox is on, the agent is not an inline agent, and the agent has knowledge files.
- Source: [`tools/knowledge/search-knowledge.tool.ts`](./tools/knowledge/search-knowledge.tool.ts).

## Tools attached to top-level agents only

### Chat integration tools

- Purpose: For each configured chat integration, the runtime attaches a context tool and an action tool. The context tool reads message context from the platform. The action tool acts on the platform, for example to send a message. The tool names use the integration type: `<type>_context` and `<type>_action`, for example `slack_context` and `slack_action`. A second connection of the same type gets a numeric suffix. n8n Chat adds `chat_context` and `chat_action`.
- Attach condition: Top-level agent with at least one configured chat integration, or a run through n8n Chat.
- Source: [`integrations/integration-tool-factory.ts`](./integrations/integration-tool-factory.ts).

### `delegate_subagent`

- Purpose: Delegates a task to a configured sub-agent or to an inline copy of the agent. The sub-agent runs in the foreground and returns a result.
- Attach condition: Top-level agent.
- Source: [`sub-agents/delegate-sub-agent-tool.ts`](./sub-agents/delegate-sub-agent-tool.ts).

### `write_todos`

- Purpose: Writes a task list for the run. The agent uses it to plan and to track progress.
- Attach condition: Top-level agent.
- Source: [`packages/@n8n/agents/src/runtime/tools/write-todos-tool.ts`](../../../../@n8n/agents/src/runtime/tools/write-todos-tool.ts).

### `mark_session_failed`

See the [dedicated section](#mark_session_failed-session-outcomes).

## Background job tools

Attach condition: Top-level agent and background tasks on. Background tasks are on when `AgentsConfig.backgroundTasksEnabled` is set and the caller does not pass `allowBackgroundTasks: false`. For example, scheduled task runs and published n8n Chat runs pass `false`. Human-in-the-loop resume support does not change this condition. It only controls whether workflow tools move waiting workflows to the background.

Source: [`background/background-job-tools.ts`](./background/background-job-tools.ts).

| Tool | Purpose |
| --- | --- |
| `spawn_background_subagent` | Starts a sub-agent as a detached background job. Returns a receipt immediately. |
| `check_background_jobs` | Lists the background jobs of the conversation with their status and results. |
| `cancel_background_job` | Cancels a running background job by its job id. |

## `mark_session_failed`: session outcomes

- The agent calls this tool when it cannot complete the task. The agent passes a short reason.
- The runtime saves the reason as the execution error. The session list shows the session as an error.
- The trace does not change.
- Future session outcomes and metadata must extend this tool. In such case, renaming this tool would be okay. An example is partial success. Do not add a new tool for them.
- The tool can get a more generic name later to cover session metadata and results.
- Attach condition: Top-level agent.
- Source: [`tools/mark-session-failed.tool.ts`](./tools/mark-session-failed.tool.ts).